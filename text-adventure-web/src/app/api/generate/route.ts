import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { writeFile, mkdir, readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

const execPromise = promisify(exec);

// Temporary directory for uploaded images
const TEMP_DIR = join(process.cwd(), 'temp');

export async function POST(request: NextRequest) {
  try {
    // Ensure temp directory exists
    if (!existsSync(TEMP_DIR)) {
      await mkdir(TEMP_DIR, { recursive: true });
    }

    // Create a unique session ID for this request
    const sessionId = uuidv4();
    const sessionDir = join(TEMP_DIR, sessionId);
    await mkdir(sessionDir, { recursive: true });
    
    // Create input and output directories for this session
    const inputDir = join(sessionDir, 'input_images');
    const outputDir = join(sessionDir, '_stories');
    
    try {
      await mkdir(inputDir, { recursive: true });
      console.log(`Successfully created input directory: ${inputDir}`);
    } catch (error) {
      console.error(`Error creating input directory: ${error}`);
      throw error;
    }
    
    try {
      await mkdir(outputDir, { recursive: true });
      console.log(`Successfully created output directory: ${outputDir}`);
      
      // Create a test file to make sure the output directory is writable
      const testFilePath = join(outputDir, 'test.txt');
      await writeFile(testFilePath, 'Test file to verify directory is writable');
      console.log(`Successfully wrote test file to ${testFilePath}`);
    } catch (error) {
      console.error(`Error creating or writing to output directory: ${error}`);
      throw error;
    }

    // Parse the form data
    const formData = await request.formData();
    const prompt = formData.get('prompt') as string || '';
    const temperature = formData.get('temperature') as string || '0.3';
    const narrativeStyle = formData.get('narrativeStyle') as string || 'adventure';
    const storyLength = formData.get('storyLength') as string || '300';
    
    // Handle image uploads
    const imageFiles = formData.getAll('images') as File[];
    const imagePaths: string[] = [];
    
    // Create a test file to make sure the directory is writable
    try {
      const testFilePath = join(inputDir, 'test.txt');
      await writeFile(testFilePath, 'Test file to verify directory is writable');
      console.log(`Successfully wrote test file to ${testFilePath}`);
    } catch (error) {
      console.error(`Error writing test file to input directory: ${error}`);
    }
    
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const buffer = Buffer.from(await file.arrayBuffer());
      const filename = `image_${i + 1}${getExtension(file.name)}`;
      const filepath = join(inputDir, filename);
      
      try {
        await writeFile(filepath, buffer);
        console.log(`Successfully wrote image file to ${filepath}`);
        imagePaths.push(filepath);
      } catch (error) {
        console.error(`Error writing image file ${filename}: ${error}`);
      }
    }
    
    if (imagePaths.length === 0) {
      return NextResponse.json(
        { error: 'No images provided' },
        { status: 400 }
      );
    }

    // Construct the command to run the Python script
    // Use absolute path to main.py in the root directory
    const rootDir = process.cwd().split('/text-adventure-web')[0];
    const pythonScript = join(rootDir, 'main.py');
    console.log('Root directory:', rootDir);
    console.log('Python script path:', pythonScript);
    console.log('Input directory:', inputDir);
    console.log('Output directory:', outputDir);
    
    // Check if the Python script exists
    if (!existsSync(pythonScript)) {
      console.error(`Python script not found at ${pythonScript}`);
      throw new Error(`Python script not found at ${pythonScript}`);
    }
    
    // Make sure the Python script is executable
    try {
      await execPromise(`chmod +x "${pythonScript}"`);
      console.log(`Successfully made Python script executable: ${pythonScript}`);
    } catch (error) {
      console.error(`Error making Python script executable: ${error}`);
      // Continue anyway, as this might not be necessary on all systems
    }
    
    // Check Python version
    try {
      const { stdout: pythonVersion } = await execPromise('python3 --version');
      console.log(`Python version: ${pythonVersion.trim()}`);
    } catch (error) {
      console.error(`Error checking Python version: ${error}`);
      // Continue anyway, as this is just informational
    }
    
    // Check if ollama package is installed
    try {
      const { stdout: pipList } = await execPromise('pip3 list | grep ollama');
      console.log(`Ollama package: ${pipList.trim()}`);
    } catch (error) {
      console.error(`Error checking ollama package: ${error}`);
      // Continue anyway, as this is just informational
    }
    
    // Check if ollama service is running
    try {
      const { stdout: ollamaProcess } = await execPromise('ps aux | grep ollama');
      console.log(`Ollama process: ${ollamaProcess.trim()}`);
    } catch (error) {
      console.error(`Error checking ollama process: ${error}`);
      // Continue anyway, as this is just informational
    }
    
    // Make sure to execute the command from the root directory
    // Use absolute paths for input and output directories
    const command = `cd "${rootDir}" && python3 "${pythonScript}" --input "${inputDir}" --output "${outputDir}" --style "${narrativeStyle}" --length ${storyLength} --temperature ${temperature} --no-cache`;
    console.log('Executing command:', command);
    
    // Execute the Python script
    let scriptOutput = '';
    try {
      console.log('Executing Python script...');
      const { stdout, stderr } = await execPromise(command);
      
      scriptOutput = stdout;
      console.log('Python script stdout:', stdout);
      
      if (stderr) {
        console.error('Python script stderr:', stderr);
      }
    } catch (error) {
      console.error('Error executing Python script:', error);
      throw error;
    }
    
    // Read the generated story files from the output directory
    let storyFiles: string[] = [];
    try {
      storyFiles = await readdir(outputDir);
      console.log('Story files in output directory:', storyFiles);
    } catch (error) {
      console.error(`Error reading output directory: ${error}`);
      storyFiles = [];
    }
    
    if (storyFiles.length === 0) {
      console.error('No story files were generated in the output directory');
      
      // Create a simple index file as a fallback
      const fallbackContent = `---
layout: story
title: Adventure
---

# Adventure

An error occurred while generating your adventure. Please try again.

`;
      try {
        await writeFile(join(outputDir, 'index.md'), fallbackContent);
        console.log('Successfully wrote fallback index.md file');
        
        // Add the fallback file to the list
        storyFiles.push('index.md');
      } catch (error) {
        console.error(`Error writing fallback index.md file: ${error}`);
      }
    }
    
    // Check if there are any markdown files in the output directory
    const markdownFiles = storyFiles.filter(file => file.endsWith('.md'));
    if (markdownFiles.length === 0) {
      console.error('No markdown files were found in the output directory');
    } else {
      console.log(`Found ${markdownFiles.length} markdown files in the output directory`);
    }
    
    // Find the index file
    const indexFile = storyFiles.find(file => file === 'index.md');
    let indexContent = '';
    
    if (indexFile) {
      indexContent = await readFile(join(outputDir, indexFile), 'utf-8');
    } else {
      console.error('No index.md file found in the output directory');
    }
    
    // Get all story segments
    const storySegments = await Promise.all(
      storyFiles.map(async (file) => {
        if (file.endsWith('.md')) {
          try {
            const content = await readFile(join(outputDir, file), 'utf-8');
            return {
              filename: file,
              content: content
            };
          } catch (error) {
            console.error(`Error reading file ${file}:`, error);
            return null;
          }
        }
        return null;
      })
    );
    
    // Filter out null values
    const validStorySegments = storySegments.filter(segment => segment !== null);
    console.log(`Found ${validStorySegments.length} valid story segments`);
    
    // Create a simple story segment if none were found
    if (validStorySegments.length === 0) {
      console.error('No valid story segments were found');
      
      // Create a simple story segment as a fallback
      const fallbackSegment = {
        filename: 'index.md',
        content: `---
layout: story
title: Adventure
---

# Adventure

An error occurred while generating your adventure. Please try again.

`
      };
      
      validStorySegments.push(fallbackSegment);
    }
    
    return NextResponse.json({ 
      output: scriptOutput || 'Adventure generated successfully!',
      sessionId: sessionId,
      storyDir: outputDir,
      indexContent: indexContent,
      storySegments: validStorySegments
    });
    
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: 'Failed to generate adventure' },
      { status: 500 }
    );
  }
}

// Helper function to get file extension
function getExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
}
