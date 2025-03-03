"use client";

import { useEffect } from 'react';
import StoryViewer from './components/StoryViewer';

// Mock story data for testing links
const mockStoryData = {
  sessionId: 'test-session',
  storySegments: [
    {
      filename: 'index.md',
      content: `---
title: Test Adventure
---

# Welcome to the Test Adventure

This is a test adventure to verify that story links work correctly.

## Choices

* [Go to the forest](/stories/forest)
* [Visit the castle](/stories/castle)
* [Explore the cave](/stories/cave)`
    },
    {
      filename: 'forest.md',
      content: `---
title: The Forest
---

# The Forest

You enter a dense forest with tall trees.

## Choices

* [Go deeper](/stories/deep-forest)
* [Return to start](/stories/index)`
    },
    {
      filename: 'castle.md',
      content: `---
title: The Castle
---

# The Castle

You arrive at a magnificent castle with high towers.

## Choices

* [Enter the castle](/stories/castle-interior)
* [Return to start](/stories/index)`
    },
    {
      filename: 'cave.md',
      content: `---
title: The Cave
---

# The Cave

You find a dark cave entrance.

## Choices

* [Enter the cave](/stories/cave-interior)
* [Return to start](/stories/index)`
    },
    {
      filename: 'deep-forest.md',
      content: `---
title: Deep in the Forest
---

# Deep in the Forest

You venture deeper into the forest.

## Choices

* [Return to the forest edge](/stories/forest)
* [Return to start](/stories/index)`
    },
    {
      filename: 'castle-interior.md',
      content: `---
title: Inside the Castle
---

# Inside the Castle

You explore the grand halls of the castle.

## Choices

* [Return to castle entrance](/stories/castle)
* [Return to start](/stories/index)`
    },
    {
      filename: 'cave-interior.md',
      content: `---
title: Inside the Cave
---

# Inside the Cave

You explore the dark cave with your torch.

## Choices

* [Return to cave entrance](/stories/cave)
* [Return to start](/stories/index)`
    }
  ]
};

export default function TestStoryLinks() {
  useEffect(() => {
    console.log('Test Story Links component mounted');
  }, []);

  return (
    <div className="min-h-screen p-8">
      <header className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Story Links Test</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto">
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-6">
          <p className="text-yellow-700">
            This is a test page to verify that story links work correctly. 
            Click on the links below to navigate between story segments.
          </p>
        </div>
        
        <StoryViewer storyData={mockStoryData} />
      </main>

      <footer className="mt-16 text-center text-sm text-gray-500">
        <p>Text Adventure Generator &copy; 2025</p>
      </footer>
    </div>
  );
}
