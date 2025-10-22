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

/* Restore Markdown list styles because Tailwind CSS resets list-style */
.markdown-body ul {
  list-style-type: disc;
  margin-left: 1.5rem;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}

.markdown-body ol {
  list-style-type: decimal;
  margin-left: 1.5rem;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}

.markdown-body li {
  margin-top: 0.25rem;
  margin-bottom: 0.25rem;
}

.markdown-body ul ul {
  list-style-type: circle;
}

.markdown-body ul ul ul {
  list-style-type: square;
}

.markdown-body ol ol {
  list-style-type: lower-alpha;
}

.markdown-body ol ol ol {
  list-style-type: lower-roman;
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
