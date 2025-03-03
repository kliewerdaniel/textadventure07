import os
import json
import random
import time
import logging
import argparse
import hashlib
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import ollama

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Default configuration
DEFAULT_CONFIG = {
    "input_dir": "input_images",
    "output_dir": "_stories",
    "cache_dir": ".cache",
    "vision_model": "gemma2:27b",
    "text_model": "llama3.3:latest",
    "story_length": 300,
    "image_extensions": [".jpg", ".jpeg", ".png", ".webp"],
    "temperature": 0.3,
    "narrative_style": "adventure",  # Options: adventure, mystery, fantasy, sci-fi
    "retry_attempts": 3,
    "retry_delay": 2,
    "batch_size": 10,  # Process images in smaller batches
    "inter_image_delay": 5,  # Delay between processing images (seconds)
}


def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="Generate a text adventure from images.")
    parser.add_argument("--input", help="Input directory containing images", default=DEFAULT_CONFIG["input_dir"])
    parser.add_argument("--output", help="Output directory for story files", default=DEFAULT_CONFIG["output_dir"])
    parser.add_argument("--style", help="Narrative style", choices=["adventure", "mystery", "fantasy", "sci-fi"], 
                        default=DEFAULT_CONFIG["narrative_style"])
    parser.add_argument("--length", help="Approximate word count per story segment", type=int, 
                        default=DEFAULT_CONFIG["story_length"])
    parser.add_argument("--temperature", help="Temperature for text generation", type=float,
                        default=DEFAULT_CONFIG["temperature"])
    parser.add_argument("--batch-size", help="Number of images to process before taking a longer break", type=int,
                        default=DEFAULT_CONFIG["batch_size"])
    parser.add_argument("--delay", help="Delay in seconds between processing images", type=int,
                        default=DEFAULT_CONFIG["inter_image_delay"])
    parser.add_argument("--start", help="Start processing from this image number", type=int, default=1)
    parser.add_argument("--end", help="End processing at this image number", type=int)
    parser.add_argument("--config", help="Path to JSON configuration file")
    parser.add_argument("--no-cache", help="Disable caching", action="store_true")
    return parser.parse_args()


def load_config(args) -> dict:
    """Load configuration from file if provided, otherwise use defaults with command line overrides."""
    config = DEFAULT_CONFIG.copy()
    
    # Override from config file if specified
    if args.config and os.path.exists(args.config):
        try:
            with open(args.config, 'r') as f:
                file_config = json.load(f)
                config.update(file_config)
                logger.info(f"Loaded configuration from {args.config}")
        except (json.JSONDecodeError, IOError) as e:
            logger.error(f"Error loading config file: {e}")
    
    # Override with command line arguments
    if args.input:
        config["input_dir"] = args.input
    if args.output:
        config["output_dir"] = args.output
    if args.style:
        config["narrative_style"] = args.style
    if args.length:
        config["story_length"] = args.length
    if args.temperature:
        config["temperature"] = args.temperature
    if args.batch_size:
        config["batch_size"] = args.batch_size
    if args.delay:
        config["inter_image_delay"] = args.delay
    if args.start:
        config["start_image"] = args.start
    if args.end:
        config["end_image"] = args.end
    if args.no_cache:
        config["use_cache"] = False
    else:
        config["use_cache"] = True
        
    # Create necessary directories
    os.makedirs(config["output_dir"], exist_ok=True)
    os.makedirs(config["cache_dir"], exist_ok=True)
    
    return config


def get_cache_key(model: str, prompt: str, files: Optional[List[str]] = None) -> str:
    """Generate a unique cache key based on the model, prompt, and files."""
    key_parts = [model, prompt]
    
    if files:
        for file_path in files:
            try:
                file_stat = os.stat(file_path)
                key_parts.append(f"{file_path}:{file_stat.st_size}:{file_stat.st_mtime}")
            except FileNotFoundError:
                key_parts.append(f"{file_path}:missing")
    
    key_string = json.dumps(key_parts, sort_keys=True)
    return hashlib.md5(key_string.encode()).hexdigest()


def get_cached_response(cache_dir: str, cache_key: str) -> Optional[str]:
    """Retrieve cached response if available."""
    cache_file = os.path.join(cache_dir, f"{cache_key}.json")
    if os.path.exists(cache_file):
        try:
            with open(cache_file, 'r', encoding='utf-8') as f:
                cached_data = json.load(f)
                logger.debug(f"Cache hit: {cache_key}")
                return cached_data.get('content')
        except (json.JSONDecodeError, IOError) as e:
            logger.warning(f"Error reading cache: {e}")
    return None


def save_to_cache(cache_dir: str, cache_key: str, content: str) -> None:
    """Save response to cache."""
    cache_file = os.path.join(cache_dir, f"{cache_key}.json")
    try:
        with open(cache_file, 'w', encoding='utf-8') as f:
            json.dump({'content': content, 'timestamp': time.time()}, f)
            logger.debug(f"Saved to cache: {cache_key}")
    except IOError as e:
        logger.warning(f"Error writing to cache: {e}")


def api_request_with_retry(model: str, messages: List[dict], files: Optional[List[str]] = None, 
                           config: dict = None) -> str:
    """Make an API request with retry logic."""
    retry_attempts = config.get("retry_attempts", 3)
    retry_delay = config.get("retry_delay", 2)
    temperature = config.get("temperature", 0.7)
    
    for attempt in range(retry_attempts):
        try:
            # For Ollama, we don't pass files directly to the chat method
            # Instead, we should include image data in the message content
            response = ollama.chat(
                model=model, 
                messages=messages,
                options={"temperature": temperature}
            )
            return response['message']['content']
        except Exception as e:
            logger.warning(f"Attempt {attempt+1}/{retry_attempts} failed: {e}")
            if attempt < retry_attempts - 1:
                time.sleep(retry_delay * (attempt + 1))  # Exponential backoff
            else:
                logger.error(f"All {retry_attempts} attempts failed.")
                raise


def analyze_image(image_path: str, config: dict) -> str:
    """Analyze the image using a vision model and return the description."""
    logger.info(f"Analyzing image: {image_path}")
    
    prompt = """
    Analyze this image in detail. Describe:
    1. The main objects, people, and setting
    2. The mood, atmosphere, and lighting
    3. Any actions or events that appear to be happening
    4. Potential narrative elements that could inspire a story
    5. Any interesting or unusual details
    
    Be thorough but concise.
    """
    
    # For Ollama vision models, we need to include the image data in the message
    # Read the image file as base64
    import base64
    try:
        with open(image_path, "rb") as img_file:
            image_data = base64.b64encode(img_file.read()).decode("utf-8")
            
        # Create a message with the image data - format depends on Ollama version
        # For older versions of Ollama, use a simple string prompt
        messages = [
            {
                "role": "user", 
                "content": f"{prompt}\n\n[Image: data:image/jpeg;base64,{image_data}]"
            }
        ]
        
        model = config["vision_model"]
        
        if config["use_cache"]:
            cache_key = get_cache_key(model, prompt, [image_path])
            cached = get_cached_response(config["cache_dir"], cache_key)
            if cached:
                return cached
        
        result = api_request_with_retry(model, messages, config=config)
        
        if config["use_cache"]:
            save_to_cache(config["cache_dir"], cache_key, result)
            
        return result
    except Exception as e:
        logger.error(f"Error analyzing image {image_path}: {e}")
        return f"ERROR: Failed to analyze image due to: {str(e)}"


def generate_story(image_analysis: str, config: dict) -> str:
    """Generate a story based on the image analysis."""
    style = config["narrative_style"]
    length = config["story_length"]
    
    style_prompts = {
        "adventure": "exciting adventure scene with action and danger",
        "mystery": "intriguing mystery scene with suspense and clues",
        "fantasy": "magical fantasy scene with wonder and imagination",
        "sci-fi": "futuristic sci-fi scene with technological elements"
    }
    
    style_description = style_prompts.get(style, style_prompts["adventure"])
    
    prompt = f"""
    Based on this image analysis, write an engaging {style_description}. 
    
    Image Analysis:
    {image_analysis}
    
    Guidelines:
    - Write approximately {length} words
    - Use vivid, sensory descriptions
    - Include dialogue if appropriate
    - Create a scene that feels like part of a larger story and do not resolve all conflicts
    - End in a way that suggests possible continuations and branching paths
    
    Your scene:
    """
    
    messages = [{"role": "user", "content": prompt}]
    model = config["text_model"]
    
    if config["use_cache"]:
        cache_key = get_cache_key(model, prompt)
        cached = get_cached_response(config["cache_dir"], cache_key)
        if cached:
            return cached
    
    try:
        result = api_request_with_retry(model, messages, config=config)
        
        if config["use_cache"]:
            save_to_cache(config["cache_dir"], cache_key, result)
            
        return result
    except Exception as e:
        logger.error(f"Error generating story: {e}")
        return f"ERROR: Failed to generate story due to: {str(e)}"


def extract_themes(stories: List[str], config: dict) -> str:
    """Extract common themes from all the stories."""
    logger.info("Extracting common themes across stories")
    
    segments_text = "\n\n--- SEGMENT ---\n\n".join(stories)
    prompt = f"""
    Analyze these {len(stories)} story segments to identify:
    
    1. Recurring themes, motifs, and symbols
    2. Common emotional tones or moods
    3. Character archetypes or roles that appear
    4. Setting elements or world-building aspects
    5. Potential plot connections or narrative threads
    
    Provide a concise analysis that could help connect these segments into a coherent overall narrative.
    
    Story segments:
    
    {segments_text}
    """
    
    messages = [{"role": "user", "content": prompt}]
    model = config["text_model"]
    
    if config["use_cache"]:
        cache_key = get_cache_key(model, prompt)
        cached = get_cached_response(config["cache_dir"], cache_key)
        if cached:
            return cached
    
    try:
        result = api_request_with_retry(model, messages, config=config)
        
        if config["use_cache"]:
            save_to_cache(config["cache_dir"], cache_key, result)
            
        return result
    except Exception as e:
        logger.error(f"Error extracting themes: {e}")
        return f"ERROR: Failed to extract themes due to: {str(e)}"


def build_story_connections(stories: Dict[str, str], theme_summary: str, config: dict) -> Dict[str, List[Tuple[str, str]]]:
    """Build connections between stories, with meaningful relationship descriptions."""
    logger.info("Building narrative connections between story segments")
    
    story_files = list(stories.keys())
    connections = {file: [] for file in story_files}
    
    # Build connection request for all stories at once
    prompt = f"""
    I have {len(story_files)} story segments that need to be connected into a cohesive narrative with branching paths.
    
    The overall themes and elements identified across all segments are:
    {theme_summary}
    
    For each story segment, suggest 2-3 logical connections to other segments, with a brief explanation of how they connect.
    Each connection should be a short phrase (5-7 words) describing the narrative transition.
    
    Format your response in JSON:
    {{
      "segment_1_filename": [["segment_X_filename", "connection phrase"], ["segment_Y_filename", "connection phrase"]],
      "segment_2_filename": [...]
    }}
    
    Story segments:
    """
    
    # Add each story with its filename
    for filename, story_text in stories.items():
        prompt += f"\n\n--- {filename} ---\n{story_text[:200]}...\n"
    
    messages = [{"role": "user", "content": prompt}]
    model = config["text_model"]
    
    if config["use_cache"]:
        cache_key = get_cache_key(model, prompt)
        cached = get_cached_response(config["cache_dir"], cache_key)
        if cached:
            try:
                # Try to parse JSON from cached response
                connection_data = json.loads(cached)
                # Convert to our connection format
                for source, targets in connection_data.items():
                    connections[source] = [(target[0], target[1]) for target in targets]
                return connections
            except (json.JSONDecodeError, KeyError, TypeError):
                logger.warning("Could not parse cached connections data, regenerating...")
    
    try:
        result = api_request_with_retry(model, messages, config=config)
        
        # Extract JSON from response
        try:
            # Find JSON content if embedded in other text
            json_start = result.find('{')
            json_end = result.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                json_str = result[json_start:json_end]
                connection_data = json.loads(json_str)
                
                # Convert to our connection format
                for source, targets in connection_data.items():
                    if source in connections:
                        connections[source] = [(target[0], target[1]) for target in targets]
                
                if config["use_cache"]:
                    save_to_cache(config["cache_dir"], cache_key, json_str)
                
                return connections
                
        except (json.JSONDecodeError, KeyError, TypeError) as e:
            logger.error(f"Error parsing connection data: {e}")
    
    except Exception as e:
        logger.error(f"Error building connections: {e}")
    
    # Fallback to random connections if the sophisticated approach fails
    logger.warning("Using fallback random connections")
    for source in story_files:
        # Choose 2-3 random targets
        num_targets = random.randint(2, 3)
        possible_targets = [t for t in story_files if t != source]
        if len(possible_targets) > num_targets:
            targets = random.sample(possible_targets, num_targets)
        else:
            targets = possible_targets
        
        connections[source] = [(target, "Continue the adventure") for target in targets]
    
    return connections


def rewrite_story(original_story: str, themes: str, config: dict) -> str:
    """Rewrite the story to better align with the overall themes."""
    logger.info("Rewriting story for thematic coherence")
    
    prompt = f"""
    Rewrite this story segment to better align with these overall narrative themes while preserving the core events.
    
    Themes and Elements:
    {themes}
    
    Original Story:
    {original_story}
    
    Guidelines:
    - Maintain approximately the same length ({config["story_length"]} words)
    - Preserve key plot points and characters
    - Add subtle references to the identified themes
    - Ensure that a universal theme is present in all segments
    - Adjust tone and style for consistency with the overall narrative
    - End in a way that suggests possible branching paths
    
    Rewritten Story:
    """
    
    messages = [{"role": "user", "content": prompt}]
    model = config["text_model"]
    
    if config["use_cache"]:
        cache_key = get_cache_key(model, prompt)
        cached = get_cached_response(config["cache_dir"], cache_key)
        if cached:
            return cached
    
    try:
        result = api_request_with_retry(model, messages, config=config)
        
        if config["use_cache"]:
            save_to_cache(config["cache_dir"], cache_key, result)
            
        return result
    except Exception as e:
        logger.error(f"Error rewriting story: {e}")
        return original_story  # Fallback to original if rewriting fails


def generate_title(story: str, config: dict) -> str:
    """Generate an engaging title for the story segment."""
    prompt = f"""
    Create a short, engaging title (4-6 words) for this story segment. The title should be intriguing 
    and reflect the key elements or mood of the scene without giving away too much.
    
    IMPORTANT: Do NOT format the title with asterisks or any other markdown formatting.
    Just provide the plain text title.
    
    Story:
    {story[:300]}...
    
    Title:
    """
    
    messages = [{"role": "user", "content": prompt}]
    model = config["text_model"]
    
    if config["use_cache"]:
        cache_key = get_cache_key(model, prompt)
        cached = get_cached_response(config["cache_dir"], cache_key)
        if cached:
            # Clean up potential quotes, asterisks, or extra spaces
            cleaned_title = cached.strip().strip('"\'')
            # Remove any ** formatting
            cleaned_title = cleaned_title.replace('**', '')
            return cleaned_title
    
    try:
        result = api_request_with_retry(model, messages, config=config)
        # Clean up potential quotes, asterisks, or extra spaces
        title = result.strip().strip('"\'')
        # Remove any ** formatting
        title = title.replace('**', '')
        
        if config["use_cache"]:
            save_to_cache(config["cache_dir"], cache_key, title)
            
        return title
    except Exception as e:
        logger.error(f"Error generating title: {e}")
        return "Untitled Adventure"  # Fallback title


def save_markdown(story: str, image_filename: str, filename: str, 
                  connections: List[Tuple[str, str]], config: dict, title: str, titles: Dict[str, str]) -> None:
    """Save the story as a Markdown file with proper formatting and links."""
    input_dir = config["input_dir"]
    output_dir = config["output_dir"]
    
    # Format connections as Markdown links
    choices_md = "\n## Choices\n\n"
    if connections:
        for target, description in connections:
            # First convert image extension to .md
            target_file = target.replace(".jpg", ".md").replace(".jpeg", ".md").replace(".png", ".md").replace(".webp", ".md")
            # Then remove the .md extension for Jekyll compatibility
            jekyll_link = target_file.replace(".md", "")
            # Use the title of the target page as the link text
            target_title = titles.get(target, description)  # Fallback to description if title not found
            choices_md += f"* [{target_title}](/stories/{jekyll_link})\n"
    else:
        choices_md += "* [The End](/stories/index)\n"
    
    # Create the Markdown content with YAML front matter
    # Use forward slashes for URLs in Markdown
    image_path = f"{input_dir}/{image_filename}".replace("\\", "/")
    md_content = f"""---
layout: story
title: {title}
---

# {title}

![{title}](/{image_path})

{story}

{choices_md}

---
*Generated with AI assistance*
"""
    
    # Save the file
    file_path = os.path.join(output_dir, filename)
    try:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(md_content)
            logger.debug(f"Saved story to {file_path}")
    except IOError as e:
        logger.error(f"Error writing file {file_path}: {e}")


def create_index_page(stories: Dict[str, str], titles: Dict[str, str], 
                      theme_summary: str, config: dict) -> None:
    """Create an index page for the adventure."""
    output_dir = config["output_dir"]
    
    # Generate a title for the overall adventure
    adventure_title_prompt = f"""
    Create an engaging, memorable title (4-7 words) for an interactive adventure story with these themes:
    
    IMPORTANT: Do NOT format the title with asterisks or any other markdown formatting.
    Just provide the plain text title.
    
    {theme_summary}
    
    The title should be evocative and hint at the narrative without being too specific.
    Title:
    """
    
    messages = [{"role": "user", "content": adventure_title_prompt}]
    adventure_title = api_request_with_retry(config["text_model"], messages, config=config)
    # Clean up potential quotes, asterisks, or extra spaces
    adventure_title = adventure_title.strip().strip('"\'')
    # Remove any ** formatting
    adventure_title = adventure_title.replace('**', '')
    
    # Create the index content with YAML front matter
    index_content = f"""---
layout: story
title: {adventure_title}
---

# {adventure_title}

## An Interactive Adventure

{theme_summary}

## Begin Your Journey

Choose your starting point:

"""
    
    # Add starting points
    for image_file, title in titles.items():
        # First convert image extension to .md
        story_file = image_file.replace(".jpg", ".md").replace(".jpeg", ".md").replace(".png", ".md").replace(".webp", ".md")
        # Then remove the .md extension for Jekyll compatibility
        jekyll_link = story_file.replace(".md", "")
        index_content += f"* [{title}](/stories/{jekyll_link})\n"
    
    index_content += """
---
*Generated with AI assistance*
"""
    
    # Save the index file
    index_path = os.path.join(output_dir, "index.md")
    try:
        with open(index_path, "w", encoding="utf-8") as f:
            f.write(index_content)
            logger.info(f"Created index page at {index_path}")
    except IOError as e:
        logger.error(f"Error writing index file: {e}")


def find_image_files(input_dir: str, extensions: List[str]) -> List[Path]:
    """Find all image files with the specified extensions in the input directory."""
    image_files = []
    input_path = Path(input_dir)
    
    if not input_path.exists():
        logger.error(f"Input directory '{input_dir}' does not exist.")
        return []
    
    for ext in extensions:
        image_files.extend(input_path.glob(f"*{ext}"))
        image_files.extend(input_path.glob(f"*{ext.upper()}"))
    
    if not image_files:
        logger.warning(f"No images found in {input_dir} with extensions {', '.join(extensions)}")
    
    return image_files


def main():
    """Main function to run the story generation process."""
    args = parse_arguments()
    config = load_config(args)
    
    logger.info(f"Starting adventure generation with style: {config['narrative_style']}")
    logger.info(f"Looking for images in: {config['input_dir']}")
    
    # Find image files
    image_files = find_image_files(config["input_dir"], config["image_extensions"])
    if not image_files:
        logger.error("No images found. Exiting.")
        return
    
    logger.info(f"Found {len(image_files)} images to process")
    
    # Process images in batches to avoid memory issues
    batch_size = config.get("batch_size", 10)
    inter_image_delay = config.get("inter_image_delay", 5)
    
    # Process images and generate initial stories
    stories = {}
    
    # Sort image files to ensure consistent ordering
    image_files = sorted(image_files, key=lambda x: x.name)
    
    # Filter images based on start and end parameters
    start_image = config.get("start_image", 1)
    end_image = config.get("end_image", None)
    
    filtered_image_files = []
    for image_file in image_files:
        try:
            # Extract the numeric part of the filename
            filename = image_file.name
            # Remove extension
            filename_without_ext = os.path.splitext(filename)[0]
            # Try to convert to integer
            image_num = int(filename_without_ext)
            
            # Check if the image number is within the specified range
            if image_num >= start_image and (end_image is None or image_num <= end_image):
                filtered_image_files.append(image_file)
        except ValueError:
            # If the filename is not a number, include it by default
            filtered_image_files.append(image_file)
    
    if not filtered_image_files:
        logger.error(f"No images found in the specified range (start={start_image}, end={end_image}). Exiting.")
        return
        
    logger.info(f"Processing {len(filtered_image_files)} images in the specified range")
    
    for i, image_file in enumerate(filtered_image_files):
        logger.info(f"Processing image {i+1}/{len(filtered_image_files)}: {image_file.name}")
        
        try:
            # Add a delay between processing images to allow memory to be freed
            if i > 0 and inter_image_delay > 0:
                logger.info(f"Waiting {inter_image_delay} seconds before processing next image...")
                time.sleep(inter_image_delay)
            
            # Try to analyze the image and generate a story
            analysis = analyze_image(str(image_file), config)
            
            # Check if analysis failed
            if analysis.startswith("ERROR:"):
                logger.warning(f"Skipping story generation for {image_file.name} due to analysis failure")
                continue
                
            story = generate_story(analysis, config)
            
            # Check if story generation failed
            if story.startswith("ERROR:"):
                logger.warning(f"Skipping {image_file.name} due to story generation failure")
                continue
                
            stories[image_file.name] = story
            
            # If we've processed a batch, take a longer break to allow memory cleanup
            if (i + 1) % batch_size == 0 and i < len(filtered_image_files) - 1:
                logger.info(f"Completed batch of {batch_size} images. Taking a break...")
                time.sleep(inter_image_delay * 3)  # Longer break between batches
                
        except Exception as e:
            logger.error(f"Error processing image {image_file.name}: {e}")
            logger.info(f"Continuing with next image...")
            continue
    
    # Check if we have any successful stories
    if not stories:
        logger.error("No stories were successfully generated. Exiting.")
        return
        
    # Extract overall themes from the stories we have
    logger.info(f"Extracting themes across {len(stories)} successfully processed stories")
    theme_summary = extract_themes(list(stories.values()), config)
    
    # Rewrite stories for coherence
    logger.info("Rewriting stories for thematic coherence")
    rewritten_stories = {}
    for img, story in stories.items():
        logger.info(f"Rewriting story for {img}")
        rewritten_stories[img] = rewrite_story(story, theme_summary, config)
    
    # Generate titles for each segment
    logger.info("Generating titles for each story segment")
    titles = {}
    for img, story in rewritten_stories.items():
        titles[img] = generate_title(story, config)
    
    # Build connections between stories
    logger.info("Building narrative connections between story segments")
    connections = build_story_connections(rewritten_stories, theme_summary, config)
    
    # Generate Markdown files with links
    logger.info("Generating final Markdown files")
    for img, story in rewritten_stories.items():
        # Get story connections
        story_connections = connections.get(img, [])
        
        # Save as Markdown with proper extension
        markdown_filename = img
        for ext in config["image_extensions"]:
            markdown_filename = markdown_filename.replace(ext, ".md")
            markdown_filename = markdown_filename.replace(ext.upper(), ".md")
        
        save_markdown(
            story=story, 
            image_filename=img, 
            filename=markdown_filename, 
            connections=story_connections, 
            config=config,
            title=titles[img],
            titles=titles
        )
    
    # Create index page
    logger.info("Creating index page")
    create_index_page(rewritten_stories, titles, theme_summary, config)
    
    logger.info(f"Adventure generation complete! Start from {config['output_dir']}/index.md")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        logger.info("Process interrupted by user")
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
