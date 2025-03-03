"use client";

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function StoryRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const storyPath = params.storyPath as string;

  useEffect(() => {
    // Get the session ID from localStorage
    const sessionId = localStorage.getItem('currentSessionId');
    
    if (sessionId) {
      // Redirect to the view page with the session ID and story path
      router.replace(`/view?session=${sessionId}&story=${storyPath}`);
    } else {
      // If no session ID is found, redirect to the home page
      router.replace('/');
    }
  }, [storyPath, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4">Redirecting to your adventure...</p>
      </div>
    </div>
  );
}
