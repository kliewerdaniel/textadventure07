"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import StoryContent from "../components/StoryContent";

export default function TestPage() {
  const [storyData, setStoryData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Create a simple test story
    const testStory = {
      sessionId: "test-session",
      storySegments: [
        {
          filename: "index.md",
          content: `---
layout: story
title: Test Adventure
---

# Test Adventure

This is a test adventure to verify that story links work correctly.

## Choices

* [Go to Forest](/stories/forest)
* [Go to Castle](/stories/castle)
* [Go to Cave](/stories/cave)
`
        },
        {
          filename: "forest.md",
          content: `---
layout: story
title: Forest Adventure
---

# Forest Adventure

You enter a dense forest with tall trees. The sunlight filters through the leaves, creating dappled patterns on the forest floor.

## Choices

* [Go to Castle](/stories/castle)
* [Go to Cave](/stories/cave)
* [Return to Start](/stories/index)
`
        },
        {
          filename: "castle.md",
          content: `---
layout: story
title: Castle Adventure
---

# Castle Adventure

You approach a magnificent castle with tall towers and a drawbridge. The castle is surrounded by a moat.

## Choices

* [Go to Forest](/stories/forest)
* [Go to Cave](/stories/cave)
* [Return to Start](/stories/index)
`
        },
        {
          filename: "cave.md",
          content: `---
layout: story
title: Cave Adventure
---

# Cave Adventure

You enter a dark cave. The air is cool and damp. You can hear water dripping somewhere in the distance.

## Choices

* [Go to Forest](/stories/forest)
* [Go to Castle](/stories/castle)
* [Return to Start](/stories/index)
`
        }
      ]
    };

    setStoryData(testStory);
  }, []);

  return (
    <div className="min-h-screen p-8">
      <header className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Test Story Links</h1>
          <Link 
            href="/"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md"
          >
            Back to Home
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto">
        {loading ? (
          <div className="text-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4">Loading test story...</p>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        ) : storyData ? (
          <StoryContent storyData={storyData} />
        ) : (
          <div className="text-center p-12">
            <p>No story data available.</p>
          </div>
        )}
      </main>

      <footer className="mt-16 text-center text-sm text-gray-500">
        <p>Text Adventure Generator &copy; 2025</p>
      </footer>
    </div>
  );
}
