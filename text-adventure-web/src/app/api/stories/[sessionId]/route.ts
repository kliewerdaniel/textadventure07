import { NextRequest, NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Temporary directory for uploaded images
const TEMP_DIR = join(process.cwd(), 'temp');

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    // Ensure params is properly awaited
    const { sessionId } = params;
    
    // Validate session ID format
    if (!sessionId || !/^[a-zA-Z0-9-]+$/.test(sessionId)) {
      return NextResponse.json(
        { error: 'Invalid session ID format' },
        { status: 400 }
      );
    }
    
    // Check if the session directory exists
    const sessionDir = join(TEMP_DIR, sessionId);
    const outputDir = join(sessionDir, '_stories');
    
    if (!existsSync(sessionDir) || !existsSync(outputDir)) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
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
    
    // Get the input images directory
    const inputDir = join(sessionDir, 'input_images');
    let imageFiles: string[] = [];
    
    if (existsSync(inputDir)) {
      const files = await readdir(inputDir);
      imageFiles = files.filter(file => 
        file.endsWith('.jpg') || 
        file.endsWith('.jpeg') || 
        file.endsWith('.png') || 
        file.endsWith('.webp')
      );
    }
    
    return NextResponse.json({
      sessionId,
      storyDir: outputDir,
      indexContent,
      storySegments: validStorySegments,
      imageFiles
    });
    
  } catch (error) {
    console.error('Error retrieving story data:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve story data' },
      { status: 500 }
    );
  }
}
