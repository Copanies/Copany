"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    marked: {
      parse: (input: string) => string;
      setOptions?: (options: { headerIds: boolean; gfm: boolean }) => void;
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
        // Configure marked options
        if (window.marked.setOptions) {
          window.marked.setOptions({
            headerIds: true,
            gfm: true,
          });
        }
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
        <div
          className="markdown-content"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <div>Loading markdown...</div>
      )}
      <style jsx global>{`
        .markdown-content h1,
        .markdown-content h2,
        .markdown-content h3,
        .markdown-content h4,
        .markdown-content h5,
        .markdown-content h6 {
          margin-top: 24px;
          margin-bottom: 16px;
          font-weight: 600;
          line-height: 1.25;
        }

        .markdown-content h1 {
          font-size: 2em;
          border-bottom: 1px solid #eaecef;
          padding-bottom: 0.3em;
        }

        .markdown-content h2 {
          font-size: 1.5em;
          border-bottom: 1px solid #eaecef;
          padding-bottom: 0.3em;
        }

        .markdown-content h3 {
          font-size: 1.25em;
        }

        .markdown-content h4 {
          font-size: 1em;
        }

        .markdown-content p {
          margin-top: 0;
          margin-bottom: 16px;
          line-height: 1.6;
        }

        .markdown-content a {
          color: #0366d6;
          text-decoration: none;
        }

        .markdown-content a:hover {
          text-decoration: underline;
        }

        .markdown-content img {
          max-width: 100%;
          box-sizing: border-box;
        }

        .markdown-content ul,
        .markdown-content ol {
          padding-left: 2em;
          margin-top: 0;
          margin-bottom: 16px;
        }

        .markdown-content ul li,
        .markdown-content ol li {
          margin-bottom: 0.25em;
        }

        .markdown-content blockquote {
          padding: 0 1em;
          color: #6a737d;
          border-left: 0.25em solid #dfe2e5;
          margin: 0 0 16px 0;
        }

        .markdown-content blockquote > :first-child {
          margin-top: 0;
        }

        .markdown-content blockquote > :last-child {
          margin-bottom: 0;
        }

        .markdown-content table {
          display: block;
          width: 100%;
          overflow: auto;
          margin-top: 0;
          margin-bottom: 16px;
          border-spacing: 0;
          border-collapse: collapse;
        }

        .markdown-content table th {
          font-weight: 600;
          padding: 6px 13px;
          border: 1px solid #dfe2e5;
        }

        .markdown-content table td {
          padding: 6px 13px;
          border: 1px solid #dfe2e5;
        }

        .markdown-content table tr {
          background-color: #fff;
          border-top: 1px solid #c6cbd1;
        }

        .markdown-content table tr:nth-child(2n) {
          background-color: #f6f8fa;
        }

        .markdown-content hr {
          height: 0.25em;
          padding: 0;
          margin: 24px 0;
          background-color: #e1e4e8;
          border: 0;
        }

        .markdown-content pre {
          border-radius: 6px;
          padding: 16px;
          margin-top: 8px;
          margin-bottom: 8px;
          overflow: auto;
          background-color: #f6f8fa;
        }

        .markdown-content code {
          font-family: SFMono-Regular, Consolas, Liberation Mono, Menlo,
            monospace;
          font-size: 85%;
          padding: 0.2em 0.4em;
          margin: 0;
          background-color: rgba(27, 31, 35, 0.05);
          border-radius: 3px;
        }

        .markdown-content pre code {
          padding: 0;
          margin: 0;
          overflow-x: auto;
          white-space: pre;
          word-break: normal;
          word-wrap: normal;
          background-color: transparent;
          border-radius: 0;
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .markdown-content pre {
            background-color: #0d1117;
          }

          .markdown-content code {
            background-color: rgba(240, 246, 252, 0.15);
          }

          .markdown-content a {
            color: #58a6ff;
          }

          .markdown-content blockquote {
            color: #8b949e;
            border-left-color: #30363d;
          }

          .markdown-content table th,
          .markdown-content table td {
            border: 1px solid #30363d;
          }

          .markdown-content table tr {
            background-color: #0d1117;
            border-top: 1px solid #30363d;
          }

          .markdown-content table tr:nth-child(2n) {
            background-color: #161b22;
          }

          .markdown-content hr {
            background-color: #30363d;
          }

          .markdown-content h1,
          .markdown-content h2 {
            border-bottom-color: #30363d;
          }
        }
      `}</style>
    </div>
  );
}
