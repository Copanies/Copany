import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypePrism from "rehype-prism-plus";
import rehypeRaw from "rehype-raw";
import { refractor } from "refractor";
import "github-markdown-css/github-markdown.css";

// Register env language as an alias for bash/shell
refractor.alias({ bash: ["env"] });

const markdownStyles = `
.markdown-body {
  background-color: transparent;
}
`;

export default function MarkdownView({ content }: { content: string }) {
  return (
    <div className="markdown-body">
      <style>{markdownStyles}</style>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypePrism]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
