"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import "@milkdown/theme-nord/style.css";
import { getIssue, updateIssue } from "@/services/copanyFuncs";
import MilkdownEditor from "@/components/commons/MilkdownEditor";

export default function CopanyIssueView({
  params,
}: {
  params: Promise<{ id: string; issueId: string }>;
}) {
  const [issue, setIssue] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
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
        const issueData = await getIssue(Number(resolvedParams.issueId));
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

  // 处理内容变化
  const handleContentChange = useCallback((content: string) => {
    console.log("content", content);
    setDescription(content);
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

  // 自动保存函数 - 移除对 title 和 description 的直接依赖
  const saveChanges = useCallback(async () => {
    console.log("saveChanges called", { isSaving, hasUnsavedChanges });
    if (isSaving || !hasUnsavedChanges) {
      console.log("Skipping save due to conditions");
      return;
    }

    setIsSaving(true);
    console.log("Starting auto-save...");
    try {
      // TODO: 添加更新issue的API调用
      console.log("Auto-saving issue:", {
        title: titleRef.current,
        description: descriptionRef.current,
      });
      await updateIssue({
        id: issue.id,
        title: titleRef.current,
        description: descriptionRef.current,
      });
      setHasUnsavedChanges(false);
      console.log("Auto-save completed successfully");
    } catch (error) {
      console.error("Error saving issue:", error);
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, hasUnsavedChanges]);

  // 防抖自动保存逻辑
  useEffect(() => {
    console.log("Auto-save effect triggered", {
      issue: !!issue,
      titleChanged: title !== issue?.title,
      descriptionChanged: description !== issue?.description,
      currentTitle: title,
      originalTitle: issue?.title,
      currentDescription: description?.substring(0, 50) + "...",
      originalDescription: issue?.description?.substring(0, 50) + "...",
    });

    // 如果没有原始数据或没有变化，不触发保存
    if (
      !issue ||
      (title === issue.title && description === issue.description)
    ) {
      console.log("No changes detected, skipping auto-save");
      return;
    }

    console.log("Changes detected, setting up auto-save timer");
    setHasUnsavedChanges(true);

    // 清除之前的定时器
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      console.log("Cleared previous save timer");
    }

    // 设置新的定时器，1秒后自动保存
    saveTimeoutRef.current = setTimeout(() => {
      console.log("Auto-save timer triggered");
      saveChanges();
    }, 1000);

    // 清理函数
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [title, description, issue]);

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
    <div className="max-w-screen-lg mx-auto p-6">
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
