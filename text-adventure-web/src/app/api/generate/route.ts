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
    await mkdir(inputDir, { recursive: true });
    await mkdir(outputDir, { recursive: true });

    // Parse the form data
    const formData = await request.formData();
    const prompt = formData.get('prompt') as string || '';
    const temperature = formData.get('temperature') as string || '0.3';
    const narrativeStyle = formData.get('narrativeStyle') as string || 'adventure';
    const storyLength = formData.get('storyLength') as string || '300';
    
    // Handle image uploads
    const imageFiles = formData.getAll('images') as File[];
    const imagePaths: string[] = [];
    
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const buffer = Buffer.from(await file.arrayBuffer());
      const filename = `image_${i + 1}${getExtension(file.name)}`;
      const filepath = join(inputDir, filename);
      
      await writeFile(filepath, buffer);
      imagePaths.push(filepath);
    }
    
    if (imagePaths.length === 0) {
      return NextResponse.json(
        { error: 'No images provided' },
        { status: 400 }
      );
    }

    // Construct the command to run the Python script
    const pythonScript = join(process.cwd(), '..', 'main.py');
    const command = `python3 "${pythonScript}" --input "${inputDir}" --output "${outputDir}" --style "${narrativeStyle}" --length ${storyLength} --temperature ${temperature}`;
    
    // Execute the Python script
    const { stdout, stderr } = await execPromise(command);
    
    if (stderr) {
      console.error('Python script error:', stderr);
    }
    
    // Read the generated story files from the output directory
    const storyFiles = await readdir(outputDir);
    
    // Find the index file
    const indexFile = storyFiles.find(file => file === 'index.md');
    let indexContent = '';
    
    if (indexFile) {
      indexContent = await readFile(join(outputDir, indexFile), 'utf-8');
    }
    
    // Get all story segments
    const storySegments = await Promise.all(
      storyFiles.map(async (file) => {
        if (file.endsWith('.md')) {
          const content = await readFile(join(outputDir, file), 'utf-8');
          return {
            filename: file,
            content: content
          };
        }
        return null;
      })
    );
    
    // Filter out null values
    const validStorySegments = storySegments.filter(segment => segment !== null);
    
    return NextResponse.json({ 
      output: stdout || 'Adventure generated successfully!',
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
