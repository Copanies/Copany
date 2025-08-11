import { useCallback, useEffect, useRef } from "react";
import { Crepe } from "@milkdown/crepe";
// Only import common styles, don't use preset themes
import "@milkdown/crepe/theme/common/style.css";

// Custom style implementation based entirely on original Nord theme
const nordThemeStyles = `
  /* ===== Light mode Nord theme variables ===== */
  .milkdown-editor.nord-light {
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
  .milkdown-editor.nord-dark {
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
    .milkdown-editor:not(.force-dark) {
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
    .milkdown-editor:not(.force-light) {
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
  }

  /* ===== Base style overrides ===== */
  .milkdown-editor.milkdown {
    position: relative;
    font-family: var(--crepe-font-default);
    color: var(--crepe-color-on-background);
    background: var(--crepe-color-background);
    transition: all 0.2s ease-in-out;
  }

  .milkdown-editor.milkdown * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  .milkdown-editor.milkdown button,
  .milkdown-editor.milkdown input {
    border: none;
    background: none;
    box-shadow: none;
  }

  .milkdown-editor.milkdown button:focus,
  .milkdown-editor.milkdown input:focus {
    outline: none;
  }

  .milkdown-editor.milkdown :focus-visible {
    outline: none;
  }

  /* ===== ProseMirror editor styles ===== */
  .milkdown-editor.milkdown .ProseMirror {
    padding: 8px 12px;
    outline: none;
  }

  .milkdown-editor.milkdown .ProseMirror *::-moz-selection {
    background: var(--crepe-color-selected);
  }

  .milkdown-editor.milkdown .ProseMirror *::selection {
    background: var(--crepe-color-selected);
  }

  .milkdown-editor.milkdown .ProseMirror .ProseMirror-selectednode {
    background: color-mix(in srgb, var(--crepe-color-selected), transparent 60%);
    outline: none;
  }

  .milkdown-editor.milkdown .ProseMirror img {
    vertical-align: bottom;
    max-width: 100%;
  }

  .milkdown-editor.milkdown .ProseMirror img.ProseMirror-selectednode {
    background: none;
    outline: 2px solid var(--crepe-color-primary);
  }

  /* ===== Heading styles ===== */
  .milkdown-editor.milkdown .ProseMirror h1,
  .milkdown-editor.milkdown .ProseMirror h2,
  .milkdown-editor.milkdown .ProseMirror h3,
  .milkdown-editor.milkdown .ProseMirror h4,
  .milkdown-editor.milkdown .ProseMirror h5,
  .milkdown-editor.milkdown .ProseMirror h6 {
    font-family: var(--crepe-font-title);
    font-weight: 400;
    padding: 2px 0;
  }

  .milkdown-editor.milkdown .ProseMirror h1 {
    font-size: 42px;
    line-height: 50px;
    margin-top: 32px;
  }

  .milkdown-editor.milkdown .ProseMirror h2 {
    font-size: 36px;
    line-height: 44px;
    margin-top: 28px;
  }

  .milkdown-editor.milkdown .ProseMirror h3 {
    font-size: 32px;
    line-height: 40px;
    margin-top: 24px;
  }

  .milkdown-editor.milkdown .ProseMirror h4 {
    font-size: 28px;
    line-height: 36px;
    margin-top: 20px;
  }

  .milkdown-editor.milkdown .ProseMirror h5 {
    font-size: 24px;
    line-height: 32px;
    margin-top: 16px;
  }

  .milkdown-editor.milkdown .ProseMirror h6 {
    font-size: 18px;
    font-weight: 700;
    line-height: 28px;
    margin-top: 16px;
  }

  /* ===== Paragraph and text styles ===== */
  .milkdown-editor.milkdown .ProseMirror p {
    font-size: 16px;
    line-height: 24px;
    padding: 4px 0;
  }

  /* ===== Code styles ===== */
  .milkdown-editor.milkdown .ProseMirror code {
    color: var(--crepe-color-inline-code);
    background: color-mix(in srgb, var(--crepe-color-inline-area), transparent 40%);
    font-family: var(--crepe-font-code);
    padding: 0 2px;
    border-radius: 4px;
    font-size: 87.5%;
    display: inline-block;
    line-height: 1.4286;
  }

  .milkdown-editor.milkdown .ProseMirror pre {
    background: var(--crepe-color-surface);
    border-radius: 8px;
    padding: 16px;
    margin: 16px 0;
    overflow-x: auto;
  }

  .milkdown-editor.milkdown .ProseMirror pre code {
    background: none;
    color: var(--crepe-color-on-surface);
    padding: 0;
  }

  /* ===== Link styles ===== */
  .milkdown-editor.milkdown .ProseMirror a {
    color: var(--crepe-color-primary);
    text-decoration: underline;
  }

  /* ===== Quote block styles ===== */
  .milkdown-editor.milkdown .ProseMirror blockquote {
    border-left: 4px solid var(--crepe-color-primary);
    padding: 8px 16px;
    margin: 16px 0;
    background: color-mix(in srgb, var(--crepe-color-surface), transparent 50%);
    font-style: italic;
  }

  /* ===== Divider styles ===== */
  .milkdown-editor.milkdown .ProseMirror hr {
    border: none;
    height: 2px;
    background: var(--crepe-color-outline);
    margin: 24px 0;
    border-radius: 1px;
  }

  .milkdown-editor.milkdown .ProseMirror hr.ProseMirror-selectednode {
    background: var(--crepe-color-primary);
  }

  /* ===== List styles ===== */
  .milkdown-editor.milkdown .ProseMirror ul,
  .milkdown-editor.milkdown .ProseMirror ol {
    padding-left: 0px;
    margin: 0px 0;
  }

  .milkdown-editor.milkdown .ProseMirror li {
    margin: 0px 0;
  }

  /* ===== Placeholder styles ===== */
  .milkdown-editor.milkdown .crepe-placeholder::before {
    position: absolute;
    color: color-mix(in srgb, var(--crepe-color-on-background), transparent 60%);
    pointer-events: none;
    height: 0;
    content: attr(data-placeholder);
  }

  /* ===== Toolbar styles ===== */
  .milkdown-editor.milkdown .milkdown-toolbar {
    z-index: 10;
    position: absolute;
    display: flex;
    background: var(--crepe-color-surface);
    box-shadow: var(--crepe-shadow-1);
    border-radius: 8px;
    overflow: hidden;
  }

  .milkdown-editor.milkdown .milkdown-toolbar[data-show='false'] {
    display: none;
  }

  .milkdown-editor.milkdown .milkdown-toolbar .divider {
    width: 1px;
    background: color-mix(in srgb, var(--crepe-color-outline), transparent 80%);
    height: 24px;
    margin: 10px;
  }

  .milkdown-editor.milkdown .milkdown-toolbar .toolbar-item {
    width: 32px;
    height: 32px;
    margin: 6px;
    padding: 4px;
    cursor: pointer;
    border-radius: 4px;
  }

  .milkdown-editor.milkdown .milkdown-toolbar .toolbar-item:hover {
    background: var(--crepe-color-hover);
  }

  .milkdown-editor.milkdown .milkdown-toolbar .toolbar-item:active {
    background: var(--crepe-color-selected);
  }

  .milkdown-editor.milkdown .milkdown-toolbar .toolbar-item svg {
    height: 24px;
    width: 24px;
    color: var(--crepe-color-outline);
    fill: var(--crepe-color-outline);
  }

  .milkdown-editor.milkdown .milkdown-toolbar .toolbar-item.active svg {
    color: var(--crepe-color-primary);
    fill: var(--crepe-color-primary);
  }

  /* ===== Code block styles ===== */
  .milkdown-editor.milkdown .milkdown-code-block {
    display: block;
    position: relative;
    padding: 8px 20px 20px;
    background: var(--crepe-color-surface);
    margin: 4px 0;
    border-radius: 8px;
  }

  .milkdown-editor.milkdown .milkdown-code-block.selected {
    outline: 1px solid var(--crepe-color-primary);
  }

  .milkdown-editor.milkdown .milkdown-code-block .cm-editor {
    outline: none !important;
    background: var(--crepe-color-surface);
  }

  .milkdown-editor.milkdown .milkdown-code-block .cm-gutters {
    border-right: none;
    background: var(--crepe-color-surface);
  }

  /* ===== CodeMirror active line number styles ===== */
  .milkdown-editor.milkdown .milkdown-code-block .ͼo .cm-activeLineGutter {
    background-color: color-mix(in srgb, var(--crepe-color-outline), transparent 85%) !important;
    color: color-mix(in srgb, var(--crepe-color-on-surface), transparent 30%) !important;
  }

  /* Active line number in light mode */
  @media (prefers-color-scheme: light) {
    .milkdown-editor.milkdown:not(.force-dark) .milkdown-code-block .ͼo .cm-activeLineGutter {
      background-color: color-mix(in srgb, var(--crepe-color-outline), transparent 90%) !important;
      color: color-mix(in srgb, var(--crepe-color-on-surface), transparent 40%) !important;
    }
  }

  /* Active line number in dark mode */
  @media (prefers-color-scheme: dark) {
    .milkdown-editor.milkdown:not(.force-light) .milkdown-code-block .ͼo .cm-activeLineGutter {
      background-color: color-mix(in srgb, var(--crepe-color-outline), transparent 80%) !important;
      color: color-mix(in srgb, var(--crepe-color-on-surface), transparent 25%) !important;
    }
  }

  /* ===== Ensure smooth transition ===== */
  .milkdown-editor,
  .milkdown-editor *,
  .milkdown-editor .milkdown,
  .milkdown-editor .milkdown * {
    transition: background-color 0.2s ease-in-out, color 0.2s ease-in-out, border-color 0.2s ease-in-out;
  }
`;

// Crepe editor component
export default function MilkdownEditor({
  onContentChange,
  initialContent = "",
  isFullScreen = false,
  placeholder = "Add description...",
  className = "",
}: {
  onContentChange: (content: string) => void;
  initialContent?: string;
  isFullScreen: boolean;
  placeholder?: string;
  className?: string;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const crepeRef = useRef<Crepe | null>(null);
  const onContentChangeRef = useRef(onContentChange);
  const isInitializingRef = useRef(false);

  // Keep the latest reference to onContentChange
  useEffect(() => {
    onContentChangeRef.current = onContentChange;
  }, [onContentChange]);

  // Function to create the editor
  const createEditor = useCallback(async () => {
    if (!divRef.current || isInitializingRef.current || crepeRef.current) {
      return;
    }

    isInitializingRef.current = true;

    try {
      // Completely clear the container
      divRef.current.innerHTML = "";

      console.log("Creating Crepe editor with content:", initialContent);

      // Create the editor
      const crepe = new Crepe({
        root: divRef.current,
        defaultValue: initialContent,
        features: {
          [Crepe.Feature.CodeMirror]: true,
          [Crepe.Feature.BlockEdit]: isFullScreen,
          [Crepe.Feature.Cursor]: isFullScreen,
          [Crepe.Feature.Toolbar]: isFullScreen,
          [Crepe.Feature.LinkTooltip]: true,
          [Crepe.Feature.Placeholder]: true,
          [Crepe.Feature.ImageBlock]: false,
        },
        featureConfigs: {
          [Crepe.Feature.Placeholder]: {
            text: placeholder,
          },
        },
      });

      // Wait for the editor to be fully created
      await crepe.create();

      // Validate if the editor was successfully created
      if (!divRef.current) {
        await crepe.destroy();
        return;
      }

      // Set the editor reference
      crepeRef.current = crepe;

      // Delay setting listeners to ensure the editor is fully ready
      setTimeout(() => {
        if (crepeRef.current && divRef.current) {
          try {
            crepeRef.current.on((listener) => {
              listener.markdownUpdated((_, markdown: string) => {
                if (onContentChangeRef.current) {
                  onContentChangeRef.current(markdown);
                }
              });
            });
            console.log("Crepe editor listener set up successfully");
          } catch (error) {
            console.error("Error setting up listener:", error);
          }
        }
      }, 100);

      console.log("Crepe editor created successfully");
    } catch (error) {
      console.error("Failed to create Crepe editor:", error);
      if (divRef.current) {
        divRef.current.innerHTML = "";
      }
    } finally {
      isInitializingRef.current = false;
    }
  }, [initialContent, isFullScreen, placeholder]);

  useEffect(() => {
    // Create the editor
    if (divRef.current && !crepeRef.current && !isInitializingRef.current) {
      createEditor();
    }

    return () => {
      if (crepeRef.current) {
        crepeRef.current.destroy().catch(console.error);
        crepeRef.current = null;
      }
    };
  }, [createEditor]);

  return (
    <>
      <style>{nordThemeStyles}</style>
      <div
        ref={divRef}
        className={`milkdown-editor milkdown prose prose-sm max-w-none ${className}`}
      />
    </>
  );
}
