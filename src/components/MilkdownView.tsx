import ReactMarkdown from "react-markdown";

// Custom style implementation based entirely on original Nord theme
const nordThemeStyles = `
  /* ===== Light mode Nord theme variables ===== */
  .milkdown-viewer.nord-light {
    --crepe-color-background: transparent;
    --crepe-color-on-background: #1b1c1d;
    --crepe-color-surface: #f8f9ff;
    --crepe-color-surface-low: #f2f3fa;
    --crepe-color-on-surface: #191c20;
    --crepe-color-on-surface-variant: #43474e;
    --crepe-color-outline: #73777f;
    --crepe-color-primary: #37618e;
    --crepe-color-secondary: #d7e3f8;
    --crepe-color-on-secondary: #101c2b;
    --crepe-color-inverse: #2e3135;
    --crepe-color-on-inverse: #eff0f7;
    --crepe-color-inline-code: #ba1a1a;
    --crepe-color-error: #ba1a1a;
    --crepe-color-hover: #eceef4;
    --crepe-color-selected: #e1e2e8;
    --crepe-color-inline-area: #d8dae0;

    --crepe-font-title: Helvetica, Rubik, Cambria, 'Times New Roman', Times, serif;
    --crepe-font-default: sans-serif, Inter, Arial, Helvetica;
    --crepe-font-code: 'JetBrains Mono', Menlo, Monaco, 'Courier New', Courier, monospace;

    --crepe-shadow-1: 0px 1px 3px 1px rgba(0, 0, 0, 0.15), 0px 1px 2px 0px rgba(0, 0, 0, 0.3);
    --crepe-shadow-2: 0px 2px 6px 2px rgba(0, 0, 0, 0.15), 0px 1px 2px 0px rgba(0, 0, 0, 0.3);
  }

  /* ===== Dark mode Nord theme variables ===== */
  .milkdown-viewer.nord-dark {
    --crepe-color-background: transparent;
    --crepe-color-on-background: #f8f9ff;
    --crepe-color-surface: #111418;
    --crepe-color-surface-low: #191c20;
    --crepe-color-on-surface: #e1e2e8;
    --crepe-color-on-surface-variant: #c3c6cf;
    --crepe-color-outline: #8d9199;
    --crepe-color-primary: #a1c9fd;
    --crepe-color-secondary: #3c4858;
    --crepe-color-on-secondary: #d7e3f8;
    --crepe-color-inverse: #e1e2e8;
    --crepe-color-on-inverse: #2e3135;
    --crepe-color-inline-code: #ffb4ab;
    --crepe-color-error: #ffb4ab;
    --crepe-color-hover: #1d2024;
    --crepe-color-selected: #32353a;
    --crepe-color-inline-area: #111418;

    --crepe-font-title: Helvetica, Rubik, Cambria, 'Times New Roman', Times, serif;
    --crepe-font-default: sans-serif, Inter, Arial, Helvetica;
    --crepe-font-code: 'JetBrains Mono', Menlo, Monaco, 'Courier New', Courier, monospace;

    --crepe-shadow-1: 0px 1px 2px 0px rgba(255, 255, 255, 0.3), 0px 1px 3px 1px rgba(255, 255, 255, 0.15);
    --crepe-shadow-2: 0px 1px 2px 0px rgba(255, 255, 255, 0.3), 0px 2px 6px 2px rgba(255, 255, 255, 0.15);
  }

  /* ===== Media query automatic theme switching ===== */
  @media (prefers-color-scheme: light) {
    .milkdown-viewer:not(.force-dark) {
      --crepe-color-background: transparent;
      --crepe-color-on-background: #1b1c1d;
      --crepe-color-surface: #f8f9ff;
      --crepe-color-surface-low: #f2f3fa;
      --crepe-color-on-surface: #191c20;
      --crepe-color-on-surface-variant: #43474e;
      --crepe-color-outline: #73777f;
      --crepe-color-primary: #37618e;
      --crepe-color-secondary: #d7e3f8;
      --crepe-color-on-secondary: #101c2b;
      --crepe-color-inverse: #2e3135;
      --crepe-color-on-inverse: #eff0f7;
      --crepe-color-inline-code: #ba1a1a;
      --crepe-color-error: #ba1a1a;
      --crepe-color-hover: #eceef4;
      --crepe-color-selected: #e1e2e8;
      --crepe-color-inline-area: #d8dae0;

      --crepe-font-title: Helvetica, Rubik, Cambria, 'Times New Roman', Times, serif;
      --crepe-font-default: sans-serif, Inter, Arial, Helvetica;
      --crepe-font-code: 'JetBrains Mono', Menlo, Monaco, 'Courier New', Courier, monospace;

      --crepe-shadow-1: 0px 1px 3px 1px rgba(0, 0, 0, 0.15), 0px 1px 2px 0px rgba(0, 0, 0, 0.3);
      --crepe-shadow-2: 0px 2px 6px 2px rgba(0, 0, 0, 0.15), 0px 1px 2px 0px rgba(0, 0, 0, 0.3);
    }
  }

  @media (prefers-color-scheme: dark) {
    .milkdown-viewer:not(.force-light) {
      --crepe-color-background: transparent;
      --crepe-color-on-background: #f8f9ff;
      --crepe-color-surface: #111418;
      --crepe-color-surface-low: #191c20;
      --crepe-color-on-surface: #e1e2e8;
      --crepe-color-on-surface-variant: #c3c6cf;
      --crepe-color-outline: #8d9199;
      --crepe-color-primary: #a1c9fd;
      --crepe-color-secondary: #3c4858;
      --crepe-color-on-secondary: #d7e3f8;
      --crepe-color-inverse: #e1e2e8;
      --crepe-color-on-inverse: #2e3135;
      --crepe-color-inline-code: #ffb4ab;
      --crepe-color-error: #ffb4ab;
      --crepe-color-hover: #1d2024;
      --crepe-color-selected: #32353a;
      --crepe-color-inline-area: #111418;

      --crepe-font-title: Helvetica, Rubik, Cambria, 'Times New Roman', Times, serif;
      --crepe-font-default: sans-serif, Inter, Arial, Helvetica;
      --crepe-font-code: 'JetBrains Mono', Menlo, Monaco, 'Courier New', Courier, monospace;

      --crepe-shadow-1: 0px 1px 2px 0px rgba(255, 255, 255, 0.3), 0px 1px 3px 1px rgba(255, 255, 255, 0.15);
      --crepe-shadow-2: 0px 2px 6px 2px rgba(255, 255, 255, 0.3), 0px 2px 6px 2px rgba(255, 255, 255, 0.15);
    }
  }

  /* ===== Base style overrides ===== */
  .milkdown-viewer.milkdown {
    position: relative;
    font-family: var(--crepe-font-default);
    color: var(--crepe-color-on-background);
    background: var(--crepe-color-background);
    transition: all 0.2s ease-in-out;
  }

  .milkdown-viewer.milkdown * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  /* ===== ProseMirror editor styles ===== */
  .milkdown-viewer.milkdown .ProseMirror {
    padding: 8px 12px;
    outline: none;
    user-select: text;
    -webkit-user-select: text;
    -moz-user-select: text;
    -ms-user-select: text;
  }

  .milkdown-viewer.milkdown .ProseMirror *::-moz-selection {
    background: var(--crepe-color-selected);
  }

  .milkdown-viewer.milkdown .ProseMirror *::selection {
    background: var(--crepe-color-selected);
  }

  .milkdown-viewer.milkdown .ProseMirror img {
    vertical-align: bottom;
    max-width: 100%;
  }

  /* ===== Heading styles ===== */
  .milkdown-viewer.milkdown .ProseMirror h1,
  .milkdown-viewer.milkdown .ProseMirror h2,
  .milkdown-viewer.milkdown .ProseMirror h3,
  .milkdown-viewer.milkdown .ProseMirror h4,
  .milkdown-viewer.milkdown .ProseMirror h5,
  .milkdown-viewer.milkdown .ProseMirror h6 {
    font-family: var(--crepe-font-title);
    font-weight: 400;
    padding: 2px 0;
  }

  .milkdown-viewer.milkdown .ProseMirror h1 {
    font-size: 42px;
    line-height: 50px;
    margin-top: 32px;
  }

  .milkdown-viewer.milkdown .ProseMirror h2 {
    font-size: 36px;
    line-height: 44px;
    margin-top: 28px;
  }

  .milkdown-viewer.milkdown .ProseMirror h3 {
    font-size: 32px;
    line-height: 40px;
    margin-top: 24px;
  }

  .milkdown-viewer.milkdown .ProseMirror h4 {
    font-size: 28px;
    line-height: 36px;
    margin-top: 20px;
  }

  .milkdown-viewer.milkdown .ProseMirror h5 {
    font-size: 24px;
    line-height: 32px;
    margin-top: 16px;
  }

  .milkdown-viewer.milkdown .ProseMirror h6 {
    font-size: 18px;
    font-weight: 700;
    line-height: 28px;
    margin-top: 16px;
  }

  /* ===== Paragraph and text styles ===== */
  .milkdown-viewer.milkdown .ProseMirror p {
    font-size: 16px;
    line-height: 24px;
    padding: 4px 0;
  }

  /* ===== Code styles ===== */
  .milkdown-viewer.milkdown .ProseMirror code {
    color: var(--crepe-color-inline-code);
    background: color-mix(in srgb, var(--crepe-color-inline-area), transparent 40%);
    font-family: var(--crepe-font-code);
    padding: 0 2px;
    border-radius: 4px;
    font-size: 87.5%;
    display: inline-block;
    line-height: 1.4286;
  }

  .milkdown-viewer.milkdown .ProseMirror pre {
    background: var(--crepe-color-surface);
    border-radius: 8px;
    padding: 16px;
    margin: 16px 0;
    overflow-x: auto;
  }

  .milkdown-viewer.milkdown .ProseMirror pre code {
    background: none;
    color: var(--crepe-color-on-surface);
    padding: 0;
  }

  /* ===== Link styles ===== */
  .milkdown-viewer.milkdown .ProseMirror a {
    color: var(--crepe-color-primary);
    text-decoration: underline;
  }

  /* ===== Quote block styles ===== */
  .milkdown-viewer.milkdown .ProseMirror blockquote {
    border-left: 4px solid var(--crepe-color-primary);
    padding: 8px 16px;
    margin: 16px 0;
    background: color-mix(in srgb, var(--crepe-color-surface), transparent 50%);
    font-style: italic;
  }

  /* ===== Divider styles ===== */
  .milkdown-viewer.milkdown .ProseMirror hr {
    border: none;
    height: 2px;
    background: var(--crepe-color-outline);
    margin: 24px 0;
    border-radius: 1px;
  }

  /* ===== List styles ===== */
  .milkdown-viewer.milkdown .ProseMirror ul,
  .milkdown-viewer.milkdown .ProseMirror ol {
    padding-left: 24px;
    margin: 8px 0;
    list-style-position: outside;
  }

  .milkdown-viewer.milkdown .ProseMirror ul {
    list-style-type: disc;
  }

  .milkdown-viewer.milkdown .ProseMirror ol {
    list-style-type: decimal;
  }

  .milkdown-viewer.milkdown .ProseMirror li {
    margin: 4px 0;
    display: list-item;
  }

  /* Nested list styles */
  .milkdown-viewer.milkdown .ProseMirror ul ul {
    list-style-type: circle;
  }

  .milkdown-viewer.milkdown .ProseMirror ul ul ul {
    list-style-type: square;
  }

  .milkdown-viewer.milkdown .ProseMirror ol ol {
    list-style-type: lower-alpha;
  }

  .milkdown-viewer.milkdown .ProseMirror ol ol ol {
    list-style-type: lower-roman;
  }

  /* ===== Ensure smooth transition ===== */
  .milkdown-viewer,
  .milkdown-viewer *,
  .milkdown-viewer .milkdown,
  .milkdown-viewer .milkdown * {
    transition: background-color 0.2s ease-in-out, color 0.2s ease-in-out, border-color 0.2s ease-in-out;
  }

  .milkdown-viewer.milkdown * {
    white-space: normal;
  }
`;

// Milkdown viewer component for read-only display
export default function MilkdownView({ content }: { content: string }) {
  console.log("content", JSON.stringify(content));
  const cleanedText = content
    // 将 \n\n 替换为 \n
    .replace(/\n\n/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n");
  console.log("cleanedText", JSON.stringify(cleanedText));
  return (
    <>
      <style>{nordThemeStyles}</style>
      <div
        className="milkdown-viewer milkdown prose prose-sm max-w-none"
        style={{
          userSelect: "text",
          WebkitUserSelect: "text",
          MozUserSelect: "text",
          msUserSelect: "text",
        }}
      >
        <div
          className="ProseMirror"
          style={{
            padding: "8px 12px",
            outline: "none",
            pointerEvents: "auto",
          }}
        >
          <ReactMarkdown
            components={{
              ul: ({ children, ...props }) => (
                <ul {...props} style={{ listStyleType: "disc" }}>
                  {children}
                </ul>
              ),
              ol: ({ children, ...props }) => (
                <ol {...props} style={{ listStyleType: "decimal" }}>
                  {children}
                </ol>
              ),
              li: ({ children, ...props }) => (
                <li {...props} style={{ display: "list-item" }}>
                  {children}
                </li>
              ),
            }}
          >
            {cleanedText}
          </ReactMarkdown>
        </div>
      </div>
    </>
  );
}
