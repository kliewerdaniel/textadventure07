"use client";

import React, { useState, useEffect } from 'react';
import { StorySegment, StoryData, parseStorySegments } from '../utils/storyParser';
import StoryDisplay from './StoryDisplay';

interface StoryViewerProps {
  storyData: {
    sessionId: string;
    storySegments: any[];
  } | null;
}

const StoryViewer: React.FC<StoryViewerProps> = ({ storyData }) => {
  const [parsedStoryData, setParsedStoryData] = useState<StoryData | null>(null);
  const [currentSegment, setCurrentSegment] = useState<StorySegment | null>(null);
  const [segmentHistory, setSegmentHistory] = useState<StorySegment[]>([]);
  const [imageBaseUrl, setImageBaseUrl] = useState<string>('');

  useEffect(() => {
    if (storyData && storyData.storySegments) {
      // Create image base URL for this session
      if (storyData.sessionId) {
        setImageBaseUrl(`/api/images/${storyData.sessionId}`);
      }
      
      // Process story segments
      const parsed = parseStorySegments(storyData.storySegments);
      
      // Fix image paths in all segments
      if (imageBaseUrl) {
        // Update index segment image path if it exists
        if (parsed.indexSegment.image && parsed.indexSegment.image.startsWith('/')) {
          const imageName = parsed.indexSegment.image.split('/').pop();
          if (imageName) {
            parsed.indexSegment.image = `${imageBaseUrl}/${imageName}`;
          }
        }
        
        // Update all other segment image paths
        parsed.segments = parsed.segments.map(segment => {
          if (segment.image && segment.image.startsWith('/')) {
            const imageName = segment.image.split('/').pop();
            if (imageName) {
              return {
                ...segment,
                image: `${imageBaseUrl}/${imageName}`
              };
            }
          }
          return segment;
        });
      }
      
      setParsedStoryData(parsed);
      setCurrentSegment(parsed.indexSegment);
      setSegmentHistory([parsed.indexSegment]);
    }
  }, [storyData, imageBaseUrl]);

  const handleChoiceClick = (choice: { title: string; link: string }) => {
    if (!parsedStoryData) return;

    // Extract the segment name from the link
    // Links are in the format /stories/segment-name
    const segmentPath = choice.link.split('/').pop() || '';
    
    // Find the segment with the matching filename
    // We need to add .md extension back since we removed it in the link
    const targetSegment = parsedStoryData.segments.find(segment => 
      segment.title.toLowerCase() === choice.title.toLowerCase()
    );

    if (targetSegment) {
      setCurrentSegment(targetSegment);
      setSegmentHistory(prev => [...prev, targetSegment]);
    } else {
      // If we can't find the segment, go back to the index
      setCurrentSegment(parsedStoryData.indexSegment);
      setSegmentHistory(prev => [...prev, parsedStoryData.indexSegment]);
    }
  };

  const handleBackClick = () => {
    if (segmentHistory.length > 1) {
      // Remove the current segment and go back to the previous one
      const newHistory = [...segmentHistory];
      newHistory.pop();
      setSegmentHistory(newHistory);
      setCurrentSegment(newHistory[newHistory.length - 1]);
    }
  };

  const handleRestartClick = () => {
    if (parsedStoryData) {
      setCurrentSegment(parsedStoryData.indexSegment);
      setSegmentHistory([parsedStoryData.indexSegment]);
    }
  };

  if (!storyData || !parsedStoryData) {
    return (
      <div className="text-center p-8">
        <p>No story data available. Generate a story first.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden">
      <div className="p-4 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h2 className="text-xl font-bold">{parsedStoryData.title}</h2>
        <div className="space-x-2">
          <button
            onClick={handleBackClick}
            disabled={segmentHistory.length <= 1}
            className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-md disabled:opacity-50"
          >
            Back
          </button>
          <button
            onClick={handleRestartClick}
            className="px-3 py-1 bg-blue-600 text-white rounded-md"
          >
            Restart
          </button>
        </div>
      </div>
      
      <div className="p-6">
        <StoryDisplay 
          story={currentSegment} 
          isLoading={false} 
          onChoiceClick={handleChoiceClick}
        />
      </div>
    </div>
  );
};

export default StoryViewer;
