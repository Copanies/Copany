"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypePrism from "rehype-prism-plus";
import { useEffect } from "react";
import "github-markdown-css/github-markdown.css";

export default function MarkdownView({ content }: { content: string }) {
  useEffect(() => {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      import("prism-themes/themes/prism-one-dark.css");
    } else {
      import("prism-themes/themes/prism-one-light.css");
    }
  }, []);

  return (
    <article className="markdown-body p-6">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypePrism]}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
