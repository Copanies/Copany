import { useCallback, useEffect, useRef } from "react";
import { Crepe } from "@milkdown/crepe";
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/nord.css";

// 添加样式来设置 ProseMirror 编辑器的 padding
const editorStyles = `
  .ProseMirror {
    padding: 8px 12px !important;
    background-color: #FFFFFF !important;
  }
`;

// Crepe 编辑器组件
export default function MilkdownEditor({
  onContentChange,
  initialContent = "",
  isFullScreen = false,
}: {
  onContentChange: (content: string) => void;
  initialContent?: string;
  isFullScreen: boolean;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const crepeRef = useRef<Crepe | null>(null);
  const onContentChangeRef = useRef(onContentChange);
  const isInitializingRef = useRef(false);
  const lastInitialContentRef = useRef<string>("");

  // 保持 onContentChange 的最新引用
  useEffect(() => {
    onContentChangeRef.current = onContentChange;
  }, [onContentChange]);

  // 创建编辑器的函数
  const createEditor = useCallback(async () => {
    if (!divRef.current || isInitializingRef.current || crepeRef.current) {
      return;
    }

    isInitializingRef.current = true;

    try {
      // 完全清空容器
      divRef.current.innerHTML = "";

      console.log("Creating Crepe editor with content:", initialContent);

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
      });

      // 监听内容变化
      crepe.on((listener) => {
        listener.markdownUpdated((_, markdown: string) => {
          onContentChangeRef.current(markdown);
        });
      });

      await crepe.create();

      if (divRef.current) {
        crepeRef.current = crepe;
        lastInitialContentRef.current = initialContent;
        console.log("Crepe editor created successfully");
      } else {
        await crepe.destroy();
      }
    } catch (error) {
      console.error("Failed to create Crepe editor:", error);
    } finally {
      isInitializingRef.current = false;
    }
  }, [initialContent, isFullScreen]);

  // 销毁编辑器的函数
  const destroyEditor = useCallback(async () => {
    if (crepeRef.current) {
      try {
        await crepeRef.current.destroy();
        console.log("Crepe editor destroyed");
      } catch (error) {
        console.error("Error destroying Crepe editor:", error);
      } finally {
        crepeRef.current = null;
        if (divRef.current) {
          divRef.current.innerHTML = "";
        }
      }
    }
  }, []);

  // 只在首次挂载或内容真正变化时创建编辑器
  useEffect(() => {
    if (!divRef.current) return;

    // 如果编辑器不存在，创建它
    if (!crepeRef.current && !isInitializingRef.current) {
      createEditor();
    }
    // 只有在初始内容真的不同时才重新创建编辑器
    // 避免因为自动保存导致的微小差异而重新创建
    else if (
      crepeRef.current &&
      initialContent !== lastInitialContentRef.current &&
      Math.abs(initialContent.length - lastInitialContentRef.current.length) >
        10 // 内容长度差异显著时才重新创建
    ) {
      console.log("Significant content change detected, recreating editor");
      destroyEditor().then(() => {
        if (divRef.current) {
          createEditor();
        }
      });
    }
  }, [initialContent, createEditor, destroyEditor]);

  // 组件卸载时的清理
  useEffect(() => {
    return () => {
      if (crepeRef.current) {
        crepeRef.current.destroy().catch(console.error);
        crepeRef.current = null;
      }
    };
  }, []);

  // 获取编辑器内容的方法
  const getContent = useCallback(() => {
    if (crepeRef.current) {
      try {
        return crepeRef.current.getMarkdown();
      } catch (error) {
        console.error("Error getting content:", error);
        return "";
      }
    }
    return "";
  }, []);

  // 暴露 getContent 方法给父组件使用
  useEffect(() => {
    if (divRef.current) {
      (
        divRef.current as HTMLDivElement & { getContent?: () => string }
      ).getContent = getContent;
    }
  }, [getContent]);

  return (
    <>
      <style>{editorStyles}</style>
      <div ref={divRef} className="min-h-[200px] prose prose-sm max-w-none" />
    </>
  );
}
