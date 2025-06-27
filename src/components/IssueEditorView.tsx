"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import MilkdownEditor from "@/components/MilkdownEditor";
import { updateIssueAction } from "@/actions/issue.actions";
import { Issue } from "@/types/database.types";

interface IssueEditorViewProps {
  issueData: Issue;
}

export default function IssueEditorView({ issueData }: IssueEditorViewProps) {
  const [title, setTitle] = useState(issueData.title || "");
  const [description, setDescription] = useState(issueData.description || "");
  const [isSaving, setIsSaving] = useState(false);
  const editorDivRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 处理内容变化 - 添加防抖处理
  const contentChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleContentChange = useCallback((content: string) => {
    // 清除之前的定时器
    if (contentChangeTimeoutRef.current) {
      clearTimeout(contentChangeTimeoutRef.current);
    }

    // 防抖处理，避免频繁更新状态
    contentChangeTimeoutRef.current = setTimeout(() => {
      setDescription(content);
    }, 300); // 300ms 防抖
  }, []);

  // 处理标题变化
  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTitle(e.target.value);
    },
    []
  );

  // 使用 ref 来获取最新的 title 和 description 值
  const titleRef = useRef(title);
  const descriptionRef = useRef(description);

  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  useEffect(() => {
    descriptionRef.current = description;
  }, [description]);

  // 自动保存函数 - 使用 useRef 避免循环依赖
  const saveChangesRef = useRef<(() => Promise<void>) | null>(null);

  // 创建保存函数，使用 useEffect 而不是 useCallback 来避免依赖问题
  useEffect(() => {
    saveChangesRef.current = async () => {
      console.log("saveChanges called");

      // 使用 ref 获取最新值，避免闭包问题
      const currentTitle = titleRef.current;
      const currentDescription = descriptionRef.current;

      if (isSaving) {
        console.log("Skipping save: already saving");
        return;
      }

      // 检查是否真的有变化
      if (
        currentTitle === issueData.title &&
        currentDescription === issueData.description
      ) {
        console.log("No changes to save");
        return;
      }

      setIsSaving(true);
      console.log("Starting auto-save...");
      try {
        await updateIssueAction({
          id: issueData.id,
          title: currentTitle,
          description: currentDescription,
          state: issueData.state ?? 0,
        });

        console.log("Auto-save completed successfully");
      } catch (error) {
        console.error("Error saving issue:", error);
      } finally {
        setIsSaving(false);
      }
    };
  }, [issueData, isSaving]);

  // 防抖自动保存逻辑
  useEffect(() => {
    // 检查是否有变化
    const hasChanges =
      title !== issueData.title || description !== issueData.description;

    if (!hasChanges) {
      console.log("No changes detected, skipping auto-save setup");
      return;
    }

    console.log("Changes detected, setting up auto-save timer");

    // 清除之前的定时器
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // 设置新的定时器，2秒后自动保存（增加延迟减少频繁保存）
    saveTimeoutRef.current = setTimeout(() => {
      console.log("Auto-save timer triggered");
      if (saveChangesRef.current) {
        saveChangesRef.current();
      }
    }, 2000);

    // 清理函数
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [title, description, issueData]);

  // 组件卸载时的清理
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (contentChangeTimeoutRef.current) {
        clearTimeout(contentChangeTimeoutRef.current);
      }
    };
  }, []);

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
          <div ref={editorDivRef} className="">
            <MilkdownEditor
              onContentChange={handleContentChange}
              initialContent={issueData?.description || ""}
              isFullScreen={true}
              key={issueData?.id || "loading"}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
