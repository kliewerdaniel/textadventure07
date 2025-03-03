import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Temporary directory for uploaded images
const TEMP_DIR = join(process.cwd(), 'temp');

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string; filename: string } }
) {
  try {
    const sessionId = params.sessionId;
    const filename = params.filename;
    
    // Validate session ID format
    if (!sessionId || !/^[a-zA-Z0-9-]+$/.test(sessionId)) {
      return NextResponse.json(
        { error: 'Invalid session ID format' },
        { status: 400 }
      );
    }
    
    // Validate filename to prevent directory traversal
    if (!filename || /[\/\\]/.test(filename)) {
      return NextResponse.json(
        { error: 'Invalid filename' },
        { status: 400 }
      );
    }
    
    // Check if the session directory exists
    const sessionDir = join(TEMP_DIR, sessionId);
    const inputDir = join(sessionDir, 'input_images');
    const imagePath = join(inputDir, filename);
    
    if (!existsSync(imagePath)) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }
    
    // Read the image file
    const imageBuffer = await readFile(imagePath);
    
    // Determine content type based on file extension
    let contentType = 'image/jpeg';
    if (filename.endsWith('.png')) {
      contentType = 'image/png';
    } else if (filename.endsWith('.webp')) {
      contentType = 'image/webp';
    } else if (filename.endsWith('.gif')) {
      contentType = 'image/gif';
    }
    
    // Return the image with appropriate content type
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      },
    });
    
  } catch (error) {
    console.error('Error serving image:', error);
    return NextResponse.json(
      { error: 'Failed to serve image' },
      { status: 500 }
    );
  }
}
