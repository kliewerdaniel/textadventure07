"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import StoryViewer from "../components/StoryViewer";
import Link from "next/link";

export default function ViewPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");
  
  const [storyData, setStoryData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStoryData = async () => {
      if (!sessionId) {
        setError("No session ID provided");
        return;
      }

      setLoading(true);
      try {
        // Fetch the story data from the server
        const response = await fetch(`/api/stories/${sessionId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch story data: ${response.status}`);
        }
        
        const data = await response.json();
        setStoryData(data);
      } catch (err) {
        console.error("Error fetching story data:", err);
        setError("Failed to load story data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchStoryData();
  }, [sessionId]);

  return (
    <div className="min-h-screen p-8">
      <header className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Text Adventure Viewer</h1>
          <Link 
            href="/"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md"
          >
            Back to Generator
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto">
        {loading ? (
          <div className="text-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4">Loading your adventure...</p>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
            <p className="mt-2">
              Please return to the generator and create a new adventure.
            </p>
          </div>
        ) : storyData ? (
          <StoryViewer storyData={storyData} />
        ) : (
          <div className="text-center p-12">
            <p>No story data available. Please generate a story first.</p>
            <Link 
              href="/"
              className="inline-block mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md"
            >
              Go to Generator
            </Link>
          </div>
        )}
      </main>

      <footer className="mt-16 text-center text-sm text-gray-500">
        <p>Text Adventure Generator &copy; 2025</p>
      </footer>
    </div>
  );
}
