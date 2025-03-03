import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const path = searchParams.get('path');
  const sessionId = searchParams.get('session');

  if (!path || !sessionId) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Extract the story path from the URL
  const storyPath = path.split('/').pop() || '';

  // Redirect to the view page with the session ID and story path
  return NextResponse.redirect(new URL(`/view?session=${sessionId}&story=${storyPath}`, request.url));
}
