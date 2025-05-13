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

  // 检查 marked 是否已加载
  useEffect(() => {
    const checkMarkedLoaded = () => {
      if (typeof window !== "undefined" && window.marked) {
        console.log("Marked detected as loaded");
        setIsMarkedLoaded(true);
        return true;
      }
      return false;
    };

    // 立即检查一次
    if (!checkMarkedLoaded()) {
      // 如果没有加载，设置一个轮询来检查
      const interval = setInterval(() => {
        if (checkMarkedLoaded()) {
          clearInterval(interval);
        }
      }, 100);

      // 最多轮询 3 秒
      setTimeout(() => clearInterval(interval), 3000);

      return () => clearInterval(interval);
    }
  }, []);

  // 当 marked 加载完成或内容变化时，重新渲染 Markdown
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
