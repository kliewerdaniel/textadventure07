"use client";

import React from 'react';
import Image from 'next/image';
import { StorySegment, formatStoryContent } from '../utils/storyParser';

interface StoryDisplayProps {
  story: StorySegment | null;
  isLoading: boolean;
  onChoiceClick?: (choice: { title: string; link: string }) => void;
}

const StoryDisplay: React.FC<StoryDisplayProps> = ({ story, isLoading, onChoiceClick }) => {
  if (isLoading) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg text-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-5/6 mb-2"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-4/6 mb-2"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-5/6 mb-2"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
        </div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Generating your adventure...</p>
      </div>
    );
  }

  if (!story) {
    return null;
  }

  const handleChoiceClick = (choice: { title: string; link: string }) => {
    if (onChoiceClick) {
      onChoiceClick(choice);
    }
  };

  // Handle clicks on story links
  const handleStoryLinkClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onChoiceClick) return;
    
    // Check if the click was on a link
    const target = e.target as HTMLElement;
    console.log('Click target:', target.tagName, target);
    
    // Find the closest anchor element (in case the click was on a child element)
    const linkElement = target.closest('a');
    
    if (linkElement) {
      // Check if the link is a story link (starts with /stories/)
      const href = linkElement.getAttribute('href');
      console.log('Link href:', href);
      
      if (href && href.startsWith('/stories/')) {
        e.preventDefault();
        e.stopPropagation();
        
        const link = href;
        const title = linkElement.textContent || '';
        console.log(`Clicked on story link: ${link} with title: ${title}`);
        
        // Get the session ID from localStorage
        const sessionId = localStorage.getItem('currentSessionId');
        
        if (sessionId) {
          // Update the URL with the story path
          const storyPath = link.split('/').pop() || '';
          window.history.pushState({}, '', `/view?session=${sessionId}&story=${storyPath}`);
          
          // Call the onChoiceClick handler with the link and title
          onChoiceClick({ title, link });
        } else {
          // If no session ID is found, use the onChoiceClick handler
          onChoiceClick({ title, link });
        }
        
        return false;
      }
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
      <h2 className="text-2xl font-bold mb-4">{story.title}</h2>
      
      {story.image && (
        <div className="mb-6">
          <img 
            src={story.image} 
            alt={story.title}
            className="rounded-lg max-w-full h-auto mx-auto"
          />
        </div>
      )}
      
      <div 
        className="prose dark:prose-invert max-w-none mb-6"
        dangerouslySetInnerHTML={{ __html: formatStoryContent(story.content) }}
        onClick={handleStoryLinkClick}
      />
      
      {story.choices.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-3">Choices</h3>
          <ul className="space-y-2">
            {story.choices.map((choice, index) => (
              <li key={index}>
                <button 
                  onClick={() => handleChoiceClick(choice)}
                  className="text-blue-600 dark:text-blue-400 hover:underline text-left"
                >
                  {choice.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default StoryDisplay;
