"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypePrism from "rehype-prism-plus";
import rehypeRaw from "rehype-raw";
import "github-markdown-css/github-markdown.css";

export default function MarkdownView({ content }: { content: string }) {
  return (
    <div className="markdown-body p-6 rounded-md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypePrism]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
