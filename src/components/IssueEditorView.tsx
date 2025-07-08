"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import MilkdownEditor from "@/components/MilkdownEditor";
import { updateIssueAction } from "@/actions/issue.actions";
import { IssueWithAssignee } from "@/types/database.types";
import { issuesManager } from "@/utils/cache";

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
  const editorDivRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const contentChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 处理内容变化 - 添加防抖处理
  const handleContentChange = useCallback(
    (content: string) => {
      // 立即更新编辑状态，保持编辑器响应
      setEditingContent(content);

      // 清除之前的定时器
      if (contentChangeTimeoutRef.current) {
        clearTimeout(contentChangeTimeoutRef.current);
      }

      // 防抖处理，避免频繁通知父组件
      contentChangeTimeoutRef.current = setTimeout(() => {
        if (onDescriptionChange) {
          onDescriptionChange(issueData.id, content);
        }
      }, 300);
    },
    [issueData.id, onDescriptionChange]
  );

  // 处理标题变化
  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTitle = e.target.value;
      setTitle(newTitle);
      if (onTitleChange) {
        onTitleChange(issueData.id, newTitle);
      }
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
      if (isSaving) return;

      const currentTitle = titleRef.current;
      const currentDescription = editingContentRef.current;

      if (
        currentTitle === issueData.title &&
        currentDescription === issueData.description
      ) {
        hasUnsavedChangesRef.current = false;
        return;
      }

      setIsSaving(true);
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
          issuesManager.setIssue(issueData.copany_id, updatedIssue);
        }

        hasUnsavedChangesRef.current = false;
        console.log("✅ Server save completed successfully");
      } catch (error) {
        console.error("❌ Error saving to server:", error);
        hasUnsavedChangesRef.current = true;
      } finally {
        setIsSaving(false);
      }
    };
  }, [issueData, isSaving]);

  // 防抖自动保存逻辑
  useEffect(() => {
    const hasChanges =
      title !== issueData.title || editingContent !== issueData.description;

    if (!hasChanges) {
      hasUnsavedChangesRef.current = false;
      return;
    }

    hasUnsavedChangesRef.current = true;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      if (saveToServerRef.current) {
        saveToServerRef.current();
      }
    }, 10000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [title, editingContent, issueData]);

  // 组件卸载时的清理
  useEffect(() => {
    return () => {
      if (hasUnsavedChangesRef.current && saveToServerRef.current) {
        saveToServerRef.current();
      }

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
        <div>
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            className="w-full bg-transparent px-3 py-2 text-gray-900 dark:text-gray-100 focus:border-0 focus:outline-none focus:ring-0 text-2xl font-semibold"
            placeholder="Issue title"
          />
        </div>

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
