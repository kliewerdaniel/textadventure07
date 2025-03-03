/**
 * Utility functions for parsing and displaying story content
 */

export interface StorySegment {
  title: string;
  content: string;
  choices: { title: string; link: string }[];
  image?: string;
}

export interface StoryData {
  title: string;
  segments: StorySegment[];
  indexSegment: StorySegment;
}

/**
 * Parse the raw output from the Python script into a structured format
 */
export function parseStoryOutput(output: string): StorySegment | null {
  try {
    // For now, we're just returning the raw output
    // This will be replaced by the proper story viewer
    return {
      title: "Generated Adventure",
      content: output,
      choices: []
    };
  } catch (error) {
    console.error("Error parsing story output:", error);
    return null;
  }
}

/**
 * Parse a markdown file content into a StorySegment
 */
export function parseMarkdownContent(content: string): StorySegment {
  // Default values
  let title = "Untitled";
  let mainContent = "";
  let choices: { title: string; link: string }[] = [];
  let image = "";

  try {
    // Extract YAML front matter
    const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontMatterMatch) {
      const frontMatter = frontMatterMatch[1];
      const titleMatch = frontMatter.match(/title:\s*(.*)/);
      if (titleMatch) {
        title = titleMatch[1].trim();
      }
    }

    // Remove front matter from content
    let cleanContent = content.replace(/^---\n[\s\S]*?\n---\n/, '');

    // Extract image if present
    const imageMatch = cleanContent.match(/!\[(.*?)\]\((.*?)\)/);
    if (imageMatch) {
      image = imageMatch[2];
      // Remove the image from the content
      cleanContent = cleanContent.replace(/!\[(.*?)\]\((.*?)\)/, '');
    }

    // Extract choices section
    const choicesMatch = cleanContent.match(/## Choices\n\n([\s\S]*?)(\n\n---|\n*$)/);
    if (choicesMatch) {
      const choicesSection = choicesMatch[1];
      const choiceLinks = choicesSection.match(/\* \[(.*?)\]\((.*?)\)/g) || [];
      
      choices = choiceLinks.map(link => {
        const match = link.match(/\* \[(.*?)\]\((.*?)\)/);
        if (match) {
          return {
            title: match[1],
            link: match[2]
          };
        }
        return { title: "Unknown", link: "#" };
      });

      // Remove the choices section from the content
      cleanContent = cleanContent.replace(/## Choices\n\n[\s\S]*?(\n\n---|\n*$)/, '');
    }

    // Clean up the main content
    mainContent = cleanContent.trim();

    return {
      title,
      content: mainContent,
      choices,
      image
    };
  } catch (error) {
    console.error("Error parsing markdown content:", error);
    return {
      title,
      content: mainContent || content,
      choices
    };
  }
}

/**
 * Parse all story segments from the API response
 */
export function parseStorySegments(storySegments: any[]): StoryData {
  try {
    // Find the index segment
    const indexSegmentData = storySegments.find(segment => 
      segment.filename === 'index.md'
    );
    
    let indexSegment: StorySegment = {
      title: "Adventure Index",
      content: "",
      choices: []
    };
    
    if (indexSegmentData) {
      indexSegment = parseMarkdownContent(indexSegmentData.content);
    }
    
    // Parse all other segments
    const segments = storySegments
      .filter(segment => segment.filename !== 'index.md')
      .map(segment => parseMarkdownContent(segment.content));
    
    return {
      title: indexSegment.title,
      segments,
      indexSegment
    };
  } catch (error) {
    console.error("Error parsing story segments:", error);
    return {
      title: "Generated Adventure",
      segments: [],
      indexSegment: {
        title: "Adventure Index",
        content: "Error loading adventure.",
        choices: []
      }
    };
  }
}

/**
 * Format the story content for display
 */
export function formatStoryContent(content: string): string {
  // Convert Markdown to HTML
  return content
    .replace(/^#\s+(.*)$/gm, '<h1>$1</h1>') // Replace # headers
    .replace(/^##\s+(.*)$/gm, '<h2>$1</h2>') // Replace ## headers
    .replace(/^###\s+(.*)$/gm, '<h3>$1</h3>') // Replace ### headers
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Replace **bold**
    .replace(/\*(.*?)\*/g, '<em>$1</em>') // Replace *italic*
    .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="my-4 rounded-lg max-w-full h-auto" />') // Replace images
    .replace(/\[(.*?)\]\((\/stories\/.*?)\)/g, '<a href="$2" class="text-blue-600 hover:underline story-link">$1</a>') // Replace story links
    .replace(/\[(.*?)\]\(((?!\/stories\/).*?)\)/g, '<a href="$2" class="text-blue-600 hover:underline">$1</a>') // Replace other links
    .replace(/^- (.*?)$/gm, '<li>$1</li>') // Replace list items
    .replace(/<li>(.*?)<\/li>\n<li>/g, '<li>$1</li>\n<li>') // Group list items
    .replace(/(<li>.*?<\/li>\n)+/g, '<ul class="list-disc pl-5 my-3">$&</ul>') // Wrap lists
    .replace(/\n\n/g, '<br><br>'); // Replace double newlines with breaks
}
