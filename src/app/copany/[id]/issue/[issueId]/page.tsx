"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import MilkdownEditor from "@/components/MilkdownEditor";
import { getIssueAction, updateIssueAction } from "@/actions/issue.actions";
import { Issue } from "@/app/database.types";

export default function CopanyIssueView({
  params,
}: {
  params: Promise<{ id: string; issueId: string }>;
}) {
  const [issue, setIssue] = useState<Issue | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const editorDivRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 获取参数
  const [resolvedParams, setResolvedParams] = useState<{
    id: string;
    issueId: string;
  } | null>(null);

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  // 加载issue数据
  useEffect(() => {
    const loadIssue = async () => {
      if (!resolvedParams) return;

      try {
        setIsLoading(true);
        const issueData = await getIssueAction(resolvedParams.issueId);
        setIssue(issueData);
        setTitle(issueData.title || "");
        setDescription(issueData.description || "");
        console.log("issue", issueData);
      } catch (error) {
        console.error("Error loading issue:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadIssue();
  }, [resolvedParams]);

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
      const currentIssue = issue;
      const currentTitle = titleRef.current;
      const currentDescription = descriptionRef.current;

      if (!currentIssue || isSaving) {
        console.log("Skipping save: no issue or already saving");
        return;
      }

      // 检查是否真的有变化
      if (
        currentTitle === currentIssue.title &&
        currentDescription === currentIssue.description
      ) {
        console.log("No changes to save");
        return;
      }

      setIsSaving(true);
      console.log("Starting auto-save...");
      try {
        await updateIssueAction({
          id: currentIssue.id,
          title: currentTitle,
          description: currentDescription,
          state: currentIssue.state ?? 0,
        });

        // 更新 issue 状态以反映已保存的内容
        setIssue((prev) =>
          prev
            ? {
                ...prev,
                title: currentTitle,
                description: currentDescription,
              }
            : null
        );

        console.log("Auto-save completed successfully");
      } catch (error) {
        console.error("Error saving issue:", error);
      } finally {
        setIsSaving(false);
      }
    };
  }, [issue, isSaving]);

  // 防抖自动保存逻辑
  useEffect(() => {
    // 如果没有原始数据，不触发保存
    if (!issue) {
      return;
    }

    // 检查是否有变化
    const hasChanges =
      title !== issue.title || description !== issue.description;

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
  }, [title, description, issue]); // 现在不需要 saveChanges 依赖了

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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-gray-500 dark:text-gray-400">Issue not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-screen-md mx-auto p-6">
      <div className="space-y-2">
        {/* 标题 */}
        <div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 focus:border-0 focus:outline-none focus:ring-0 text-2xl font-semibold"
            placeholder="Issue title"
            disabled={isSaving}
          />
        </div>

        {/* 描述 */}
        <div>
          <div ref={editorDivRef} className="">
            <MilkdownEditor
              onContentChange={handleContentChange}
              initialContent={issue?.description || ""}
              isFullScreen={true}
            />
          </div>
        </div>

        {/* 保存状态提示 */}
        <div className="flex justify-end">
          {isSaving && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              正在保存...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
