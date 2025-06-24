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

      // 创建编辑器
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

      // 等待编辑器完全创建
      await crepe.create();

      // 验证编辑器是否成功创建
      if (!divRef.current) {
        await crepe.destroy();
        return;
      }

      // 设置编辑器引用
      crepeRef.current = crepe;

      // 延迟设置监听器，确保编辑器完全就绪
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
      }, 100); // 100ms 延迟确保编辑器完全就绪

      console.log("Crepe editor created successfully");
    } catch (error) {
      console.error("Failed to create Crepe editor:", error);
      if (divRef.current) {
        divRef.current.innerHTML = "";
      }
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

  // 只在挂载时创建编辑器
  useEffect(() => {
    if (divRef.current && !crepeRef.current && !isInitializingRef.current) {
      createEditor();
    }

    // 组件卸载时的清理
    return () => {
      if (crepeRef.current) {
        crepeRef.current.destroy().catch(console.error);
        crepeRef.current = null;
      }
    };
  }, []); // 空依赖数组，只在挂载时执行一次

  return (
    <>
      <style>{editorStyles}</style>
      <div ref={divRef} className="min-h-[200px] prose prose-sm max-w-none" />
    </>
  );
}
