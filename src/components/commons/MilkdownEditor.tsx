import { useCallback, useEffect, useRef } from "react";
import {
  Editor,
  rootCtx,
  defaultValueCtx,
  editorViewCtx,
  serializerCtx,
} from "@milkdown/kit/core";
import { commonmark } from "@milkdown/kit/preset/commonmark";
import { history } from "@milkdown/kit/plugin/history";
import { listener, listenerCtx } from "@milkdown/kit/plugin/listener";
import { nord } from "@milkdown/theme-nord";
import "@milkdown/theme-nord/style.css";

// Milkdown 编辑器组件
export default function MilkdownEditor({
  onContentChange,
}: {
  onContentChange: (content: string) => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorInstanceRef = useRef<Editor | null>(null);
  const onContentChangeRef = useRef(onContentChange);
  const isCreatingRef = useRef(false); // 防止重复创建

  // 保持 onContentChange 的最新引用
  useEffect(() => {
    onContentChangeRef.current = onContentChange;
  }, [onContentChange]);

  useEffect(() => {
    if (
      editorRef.current &&
      !editorInstanceRef.current &&
      !isCreatingRef.current
    ) {
      isCreatingRef.current = true;

      const editor = Editor.make()
        .config(nord)
        .config((ctx) => {
          ctx.set(rootCtx, editorRef.current);

          // 添加监听器
          ctx
            .get(listenerCtx)
            .markdownUpdated((ctx, markdown, prevMarkdown) => {
              onContentChangeRef.current(markdown);
            });
        })
        .use(commonmark)
        .use(history)
        .use(listener);

      editor
        .create()
        .then(() => {
          console.log("Editor created successfully");
          editorInstanceRef.current = editor;
          isCreatingRef.current = false;
        })
        .catch((error) => {
          console.error("Failed to create editor:", error);
          isCreatingRef.current = false;
        });
    }

    return () => {
      // 清理函数 - 确保编辑器被正确销毁
      if (editorInstanceRef.current) {
        try {
          editorInstanceRef.current.destroy();
          console.log("Editor destroyed");
        } catch (error) {
          console.error("Error destroying editor:", error);
        } finally {
          editorInstanceRef.current = null;
          isCreatingRef.current = false;
        }
      }
    };
  }, []);

  // 获取编辑器内容的方法
  const getContent = useCallback(() => {
    if (editorInstanceRef.current) {
      try {
        // 使用 action 来获取内容
        const content = editorInstanceRef.current.action((ctx) => {
          const editorView = ctx.get(editorViewCtx);
          const serializer = ctx.get(serializerCtx);
          return serializer(editorView.state.doc);
        });
        return content;
      } catch (error) {
        console.error("Error getting content:", error);
        return "";
      }
    }
    return "";
  }, []);

  // 暴露 getContent 方法给父组件使用
  useEffect(() => {
    if (editorRef.current) {
      (editorRef.current as any).getContent = getContent;
    }
  }, [getContent]);

  return (
    <div
      ref={editorRef}
      className="min-h-[200px] prose prose-sm max-w-none p-3"
    />
  );
}
