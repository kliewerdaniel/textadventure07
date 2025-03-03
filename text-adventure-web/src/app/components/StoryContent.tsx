"use client";

import React, { useState, useEffect } from 'react';
import { StorySegment, StoryData, parseStorySegments, parseMarkdownContent } from '../utils/storyParser';
import StoryDisplay from './StoryDisplay';

interface StoryContentProps {
  storyData: {
    sessionId: string;
    storySegments: any[];
  } | null;
  initialStoryPath?: string;
}

const StoryContent: React.FC<StoryContentProps> = ({ storyData, initialStoryPath }) => {
  const [parsedStoryData, setParsedStoryData] = useState<StoryData | null>(null);
  const [currentSegment, setCurrentSegment] = useState<StorySegment | null>(null);
  const [segmentHistory, setSegmentHistory] = useState<StorySegment[]>([]);
  const [imageBaseUrl, setImageBaseUrl] = useState<string>('');
  const [storyPath, setStoryPath] = useState<string | null>(initialStoryPath || null);

  console.log('StoryContent: initialStoryPath =', initialStoryPath);
  console.log('StoryContent: storyPath =', storyPath);

  useEffect(() => {
    console.log('StoryContent useEffect: storyData =', storyData);
    console.log('StoryContent useEffect: storyPath =', storyPath);
    
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
      
      // If a story path is provided, try to find the corresponding segment
      if (storyPath && storyPath !== 'index') {
        console.log(`Looking for segment with path: ${storyPath}`);
        
        // First, try to find an exact match by filename in the storySegments array
        const exactFilenameMatch = storyData.storySegments.find(
          segment => segment.filename === `${storyPath}.md` || segment.filename === storyPath
        );
        
        if (exactFilenameMatch) {
          console.log(`Found exact filename match: ${exactFilenameMatch.filename}`);
          // Find the corresponding parsed segment
          const matchedSegment = parsed.segments.find(
            segment => segment.title === parseMarkdownContent(exactFilenameMatch.content).title
          );
          
          if (matchedSegment) {
            setCurrentSegment(matchedSegment);
            setSegmentHistory([parsed.indexSegment, matchedSegment]);
            return;
          }
        }
        
        // If no exact match is found, use the index segment
        setCurrentSegment(parsed.indexSegment);
        setSegmentHistory([parsed.indexSegment]);
      } else {
        // Use the index segment by default
        setCurrentSegment(parsed.indexSegment);
        setSegmentHistory([parsed.indexSegment]);
      }
    }
  }, [storyData, imageBaseUrl, storyPath]);

  const handleChoiceClick = (choice: { title: string; link: string }) => {
    if (!parsedStoryData) return;

    // Extract the segment name from the link
    // Links could be in various formats like /stories/segment-name or just segment-name
    const segmentPath = choice.link.split('/').pop() || '';
    
    console.log(`Looking for segment with link: ${choice.link}, path: ${segmentPath}, title: ${choice.title}`);
    console.log(`Available segments:`, parsedStoryData.segments.map(s => s.title));
    console.log(`Current segment:`, currentSegment?.title);
    
    // Update the URL with the story path
    const sessionId = storyData?.sessionId;
    if (sessionId) {
      window.history.pushState({}, '', `/view?session=${sessionId}&story=${segmentPath}`);
    }
    
    // Update the story path
    setStoryPath(segmentPath);
    
    // Special case for "index" or "start" links - return to the index page
    if (segmentPath === 'index' || segmentPath === 'start') {
      console.log(`Returning to index page`);
      setCurrentSegment(parsedStoryData.indexSegment);
      setSegmentHistory(prev => [...prev, parsedStoryData.indexSegment]);
      return;
    }
    
    // First, try to find an exact match by filename in the storySegments array
    const exactFilenameMatch = storyData?.storySegments.find(
      segment => segment.filename === `${segmentPath}.md` || segment.filename === segmentPath
    );
    
    if (exactFilenameMatch) {
      console.log(`Found exact filename match: ${exactFilenameMatch.filename}`);
      // Find the corresponding parsed segment
      const matchedSegment = parsedStoryData.segments.find(
        segment => segment.title === parseMarkdownContent(exactFilenameMatch.content).title
      );
      
      if (matchedSegment) {
        setCurrentSegment(matchedSegment);
        setSegmentHistory(prev => [...prev, matchedSegment]);
        return;
      }
    }
    
    // Calculate match scores for each segment to find the best match
    const segmentScores = parsedStoryData.segments.map(segment => {
      let score = 0;
      
      // Strategy 1: Match by exact filename (without extension)
      const segmentFilename = segment.title.toLowerCase().replace(/\s+/g, '-');
      if (segmentFilename === segmentPath.toLowerCase()) {
        score += 100; // Highest priority
      }
      
      // Strategy 2: Match by title (case insensitive)
      if (segment.title.toLowerCase() === choice.title.toLowerCase()) {
        score += 90;
      }
      
      // Strategy 3: Check if the segment title contains all words from the path
      const pathWords = segmentPath.toLowerCase().split('-');
      const segmentWords = segment.title.toLowerCase().split(/\s+/);
      const allPathWordsInTitle = pathWords.every(word => 
        segmentWords.some(segWord => segWord.includes(word) || word.includes(segWord))
      );
      if (allPathWordsInTitle) {
        score += 80;
      }
      
      // Strategy 4: Count matching words between path and title
      const matchingWordCount = pathWords.filter(word => 
        segmentWords.some(segWord => segWord.includes(word) || word.includes(segWord))
      ).length;
      score += matchingWordCount * 10;
      
      // Strategy 5: Check if the path contains the key words from the title
      // For "Deep in the Forest" and "deep-forest", the key words are "deep" and "forest"
      const keyWordsInPath = segmentWords
        .filter(word => word.length > 2) // Only consider significant words
        .filter(word => pathWords.some(pathWord => pathWord.includes(word) || word.includes(pathWord)))
        .length;
      score += keyWordsInPath * 15;
      
      // Strategy 6: Check if the segment filename contains the path or vice versa
      if (segmentFilename.includes(segmentPath.toLowerCase()) || 
          segmentPath.toLowerCase().includes(segmentFilename)) {
        score += 60;
      }
      
      console.log(`Segment: ${segment.title}, Score: ${score}`);
      
      return { segment, score };
    });
    
    // Sort segments by score (highest first) and get the best match
    segmentScores.sort((a, b) => b.score - a.score);
    const bestMatch = segmentScores[0];
    
    if (bestMatch && bestMatch.score > 0) {
      console.log(`Best match: ${bestMatch.segment.title} with score ${bestMatch.score}`);
      setCurrentSegment(bestMatch.segment);
      setSegmentHistory(prev => [...prev, bestMatch.segment]);
    } else {
      console.warn(`Could not find segment for link: ${choice.link} with title: ${choice.title}`);
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
      
      // Update the URL with the story path
      const sessionId = storyData?.sessionId;
      const segmentPath = newHistory[newHistory.length - 1].title.toLowerCase().replace(/\s+/g, '-');
      if (sessionId) {
        window.history.pushState({}, '', `/view?session=${sessionId}&story=${segmentPath}`);
      }
      
      // Update the story path
      setStoryPath(segmentPath);
    }
  };

  const handleRestartClick = () => {
    if (parsedStoryData) {
      setCurrentSegment(parsedStoryData.indexSegment);
      setSegmentHistory([parsedStoryData.indexSegment]);
      
      // Update the URL with the story path
      const sessionId = storyData?.sessionId;
      if (sessionId) {
        window.history.pushState({}, '', `/view?session=${sessionId}`);
      }
      
      // Update the story path
      setStoryPath(null);
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

export default StoryContent;
