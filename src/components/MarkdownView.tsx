"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    marked: {
      parse: (input: string) => string;
    };
  }
}

export default function MarkdownView({ content }: { content: string }) {
  const [html, setHtml] = useState("");
  const [isMarkedLoaded, setIsMarkedLoaded] = useState(false);

  // Check if marked is loaded
  useEffect(() => {
    const checkMarkedLoaded = () => {
      if (typeof window !== "undefined" && window.marked) {
        console.log("Marked detected as loaded");
        setIsMarkedLoaded(true);
        return true;
      }
      return false;
    };

    // Check immediately
    if (!checkMarkedLoaded()) {
      // If not loaded, set up polling
      const interval = setInterval(() => {
        if (checkMarkedLoaded()) {
          clearInterval(interval);
        }
      }, 100);

      // Poll for max 3 seconds
      setTimeout(() => clearInterval(interval), 3000);

      return () => clearInterval(interval);
    }
  }, []);

  // Re-render Markdown when marked is loaded or content changes
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.marked &&
      content &&
      isMarkedLoaded
    ) {
      console.log("Rendering markdown, marked available:", !!window.marked);
      try {
        const parsed = window.marked.parse(content);
        setHtml(parsed);
      } catch (error) {
        console.error("Error parsing markdown:", error);
      }
    }
  }, [content, isMarkedLoaded]);

  return (
    <div>
      {html ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <div>Loading markdown...</div>
      )}
    </div>
  );
}
