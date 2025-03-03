"use client";

import { useState, useRef, FormEvent, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { parseStoryOutput, StorySegment } from "./utils/storyParser";
import StoryDisplay from "./components/StoryDisplay";
import StoryViewer from "./components/StoryViewer";

export default function HomePage() {
  const [images, setImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("");
  const [temperature, setTemperature] = useState(0.3);
  const [narrativeStyle, setNarrativeStyle] = useState("adventure");
  const [storyLength, setStoryLength] = useState(300);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState("");
  const [storyData, setStoryData] = useState<StorySegment | null>(null);
  const [generatedStoryData, setGeneratedStoryData] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"raw" | "interactive">("raw");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newImages = Array.from(e.target.files);
      setImages((prevImages) => [...prevImages, ...newImages]);
      
      // Create URLs for preview
      const newImageUrls = newImages.map(file => URL.createObjectURL(file));
      setImageUrls((prevUrls) => [...prevUrls, ...newImageUrls]);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
    
    // Revoke the URL to avoid memory leaks
    URL.revokeObjectURL(imageUrls[index]);
    setImageUrls(imageUrls.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (images.length === 0) {
      alert("Please upload at least one image");
      return;
    }
    
    setIsLoading(true);
    setResult("");
    
    try {
      const formData = new FormData();
      images.forEach((image) => {
        formData.append("images", image);
      });
      
      formData.append("prompt", prompt);
      formData.append("temperature", temperature.toString());
      formData.append("narrativeStyle", narrativeStyle);
      formData.append("storyLength", storyLength.toString());
      
      const response = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      setResult(data.output);
      setStoryData(parseStoryOutput(data.output));
      setGeneratedStoryData(data);
      setViewMode("interactive");
    } catch (error) {
      console.error("Error generating adventure:", error);
      setResult("An error occurred while generating your adventure. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Text Adventure Generator</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Upload images and customize your adventure
        </p>
      </header>

      <main className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Image Upload Section */}
          <section className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Upload Images</h2>
            
            <div className="flex flex-wrap gap-4 mb-4">
              {imageUrls.map((url, index) => (
                <div key={index} className="relative">
                  <Image 
                    src={url} 
                    alt={`Uploaded image ${index + 1}`} 
                    width={100} 
                    height={100} 
                    className="object-cover rounded-md"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
              ))}
              
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md p-4 w-[100px] h-[100px] flex items-center justify-center text-gray-500 hover:border-gray-400 dark:hover:border-gray-500"
              >
                +
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/*"
                multiple
                className="hidden"
              />
            </div>
            
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Upload images to generate your adventure. The more images you upload, the more detailed your adventure will be.
            </p>
          </section>

          {/* Customization Section */}
          <section className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Customize Your Adventure</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="prompt" className="block text-sm font-medium mb-1">
                  Custom Prompt (Optional)
                </label>
                <textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter a custom prompt to guide your adventure..."
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                  rows={3}
                />
              </div>
              
              <div>
                <label htmlFor="style" className="block text-sm font-medium mb-1">
                  Narrative Style
                </label>
                <select
                  id="style"
                  value={narrativeStyle}
                  onChange={(e) => setNarrativeStyle(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                >
                  <option value="adventure">Adventure</option>
                  <option value="mystery">Mystery</option>
                  <option value="fantasy">Fantasy</option>
                  <option value="sci-fi">Science Fiction</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="temperature" className="block text-sm font-medium mb-1">
                  Temperature: {temperature}
                </label>
                <input
                  id="temperature"
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>More Predictable</span>
                  <span>More Creative</span>
                </div>
              </div>
              
              <div>
                <label htmlFor="length" className="block text-sm font-medium mb-1">
                  Story Length: {storyLength} words
                </label>
                <input
                  id="length"
                  type="range"
                  min="100"
                  max="500"
                  step="50"
                  value={storyLength}
                  onChange={(e) => setStoryLength(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </section>

          {/* Submit Button */}
          <div className="text-center">
            <button
              type="submit"
              disabled={isLoading || images.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Generating..." : "Generate Adventure"}
            </button>
          </div>
        </form>

        {/* Results Section */}
        {(isLoading || storyData) && (
          <section className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Your Adventure</h2>
              
              {!isLoading && storyData && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => setViewMode("raw")}
                    className={`px-3 py-1 rounded-md ${
                      viewMode === "raw" 
                        ? "bg-blue-600 text-white" 
                        : "bg-gray-200 dark:bg-gray-700"
                    }`}
                  >
                    Raw Output
                  </button>
                  <button
                    onClick={() => setViewMode("interactive")}
                    className={`px-3 py-1 rounded-md ${
                      viewMode === "interactive" 
                        ? "bg-blue-600 text-white" 
                        : "bg-gray-200 dark:bg-gray-700"
                    }`}
                  >
                    Interactive View
                  </button>
                  
                  {generatedStoryData && generatedStoryData.sessionId && (
                    <Link
                      href={`/view?session=${generatedStoryData.sessionId}`}
                      target="_blank"
                      className="px-3 py-1 bg-green-600 text-white rounded-md flex items-center"
                    >
                      <span>Open in New Tab</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </Link>
                  )}
                </div>
              )}
            </div>
            
            {viewMode === "raw" ? (
              <StoryDisplay story={storyData} isLoading={isLoading} />
            ) : (
              <StoryViewer storyData={generatedStoryData} />
            )}
          </section>
        )}
      </main>

      <footer className="mt-16 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>Text Adventure Generator &copy; 2025</p>
      </footer>
    </div>
  );
}
