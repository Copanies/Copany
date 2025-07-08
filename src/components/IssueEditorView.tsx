"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import MilkdownEditor from "@/components/MilkdownEditor";
import { updateIssueAction } from "@/actions/issue.actions";
import { IssueWithAssignee } from "@/types/database.types";
import { issuesManager } from "@/utils/cache";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

interface IssueEditorViewProps {
  issueData: IssueWithAssignee;
  onTitleChange?: (issueId: string, newTitle: string) => void;
  onDescriptionChange?: (issueId: string, newDescription: string) => void;
}

export default function IssueEditorView({
  issueData,
  onTitleChange,
  onDescriptionChange,
}: IssueEditorViewProps) {
  const [title, setTitle] = useState(issueData.title || "");
  const [editingContent, setEditingContent] = useState(
    issueData.description || ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const editorDivRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const contentChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 处理内容变化 - 添加防抖处理
  const handleContentChange = useCallback(
    (content: string) => {
      console.log("📝 Content changed, length:", content.length);
      setEditingContent(content);
      setSaveError(null);

      // 清除之前的内容更新定时器
      if (contentChangeTimeoutRef.current) {
        clearTimeout(contentChangeTimeoutRef.current);
      }

      // 延迟通知父组件
      contentChangeTimeoutRef.current = setTimeout(() => {
        console.log("🔄 Notifying parent component of content change");
        if (onDescriptionChange) {
          onDescriptionChange(issueData.id, content);
        }
      }, 300);

      // 标记有未保存的更改，但不立即触发保存
      hasUnsavedChangesRef.current = true;
    },
    [issueData.id, onDescriptionChange]
  );

  // 处理标题变化
  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTitle = e.target.value;
      console.log("📝 Title changed:", newTitle);
      setTitle(newTitle);
      setSaveError(null);

      if (onTitleChange) {
        onTitleChange(issueData.id, newTitle);
      }

      // 标记有未保存的更改，但不立即触发保存
      hasUnsavedChangesRef.current = true;
    },
    [issueData.id, onTitleChange]
  );

  // 使用 ref 来获取最新的状态值
  const titleRef = useRef(title);
  const editingContentRef = useRef(editingContent);

  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  useEffect(() => {
    editingContentRef.current = editingContent;
  }, [editingContent]);

  // 标记是否有未保存的更改
  const hasUnsavedChangesRef = useRef(false);

  // 服务器保存函数
  const saveToServerRef = useRef<(() => Promise<void>) | null>(null);

  // 创建服务器保存函数
  useEffect(() => {
    saveToServerRef.current = async () => {
      if (isSaving) {
        console.log("⏳ Already saving, skipping...");
        return;
      }

      const currentTitle = titleRef.current;
      const currentDescription = editingContentRef.current;

      setIsSaving(true);
      setSaveError(null);

      console.log("🚀 Starting server save...");
      try {
        const updatedIssue = await updateIssueAction({
          id: issueData.id,
          title: currentTitle,
          description: currentDescription,
          state: issueData.state ?? 0,
          priority: issueData.priority ?? null,
          level: issueData.level ?? null,
          assignee: issueData.assignee ?? null,
        });

        if (issueData.copany_id) {
          console.log("💾 Updating cache with new data");
          issuesManager.setIssue(issueData.copany_id, updatedIssue);
        }

        hasUnsavedChangesRef.current = false;
        console.log("✅ Server save completed successfully");
      } catch (error) {
        console.error("❌ Error saving to server:", error);
        hasUnsavedChangesRef.current = true;
        setSaveError(
          error instanceof Error ? error.message : "保存失败，请稍后重试"
        );
      } finally {
        setIsSaving(false);
      }
    };
  }, [
    isSaving,
    issueData.id,
    issueData.title,
    issueData.description,
    issueData.state,
    issueData.priority,
    issueData.level,
    issueData.assignee,
    issueData.copany_id,
  ]);

  // 自动保存逻辑
  useEffect(() => {
    // 检查是否有变化需要保存
    if (!hasUnsavedChangesRef.current || isSaving) {
      return;
    }

    // 清除之前的保存定时器
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    console.log("📝 Changes detected, scheduling auto-save");

    // 设置新的保存定时器（3秒后执行）
    saveTimeoutRef.current = setTimeout(async () => {
      if (!hasUnsavedChangesRef.current || isSaving) {
        return;
      }

      console.log("⏰ Auto-save timer triggered");

      if (saveToServerRef.current) {
        try {
          await saveToServerRef.current();
          console.log("✅ Auto-save completed successfully");
        } catch (error) {
          console.error("❌ Auto-save failed:", error);
        }
      }
    }, 3000);

    return () => {
      if (saveTimeoutRef.current) {
        console.log("🔄 Clearing auto-save timer");
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [isSaving, title, editingContent]);

  // 组件卸载时的清理
  useEffect(() => {
    return () => {
      // 如果有未保存的更改，立即保存
      if (hasUnsavedChangesRef.current && saveToServerRef.current) {
        console.log("💾 Saving changes before unmount");
        saveToServerRef.current().catch((error) => {
          console.error("❌ Final save failed:", error);
        });
      }

      // 清理所有定时器
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (contentChangeTimeoutRef.current) {
        clearTimeout(contentChangeTimeoutRef.current);
      }
    };
  }, []);

  // 初始内容只在组件挂载时设置一次
  const [initialContent] = useState(issueData.description || "");

  return (
    <div className="w-full">
      <div className="space-y-2">
        {/* 标题 */}
        <div className="relative">
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            className="w-full bg-transparent px-3 py-2 text-gray-900 dark:text-gray-100 focus:border-0 focus:outline-none focus:ring-0 text-2xl font-semibold"
            placeholder="Issue title"
          />
          {/* 保存状态指示器 */}
          {isSaving && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center text-sm text-gray-500">
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
            </div>
          )}
        </div>

        {/* 错误提示 */}
        {saveError && (
          <div className="flex flex-row items-center px-3 py-2 mx-2 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded">
            <span>Error: {saveError}</span>
          </div>
        )}

        {/* 描述 */}
        <div>
          <div ref={editorDivRef}>
            <MilkdownEditor
              onContentChange={handleContentChange}
              initialContent={initialContent}
              isFullScreen={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
