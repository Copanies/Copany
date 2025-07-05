"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import MilkdownEditor from "@/components/MilkdownEditor";
import { updateIssueAction } from "@/actions/issue.actions";
import { Issue } from "@/types/database.types";
import { unifiedIssueCache } from "@/utils/cache";

interface IssueEditorViewProps {
  issueData: Issue;
}

export default function IssueEditorView({ issueData }: IssueEditorViewProps) {
  const [title, setTitle] = useState(issueData.title || "");
  const [description, setDescription] = useState(issueData.description || "");
  const [isSaving, setIsSaving] = useState(false);
  const editorDivRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 立即更新缓存的函数
  const immediateUpdateCache = useCallback(
    (newTitle: string, newDescription: string) => {
      if (issueData.copany_id) {
        const updatedIssue: Issue = {
          ...issueData,
          title: newTitle,
          description: newDescription,
          updated_at: new Date().toISOString(),
        };
        unifiedIssueCache.setIssue(issueData.copany_id, updatedIssue);
        console.log("📦 Immediately cached issue changes");
      }
    },
    [issueData]
  );

  // 处理内容变化 - 添加防抖处理
  const contentChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleContentChange = useCallback(
    (content: string) => {
      // 清除之前的定时器
      if (contentChangeTimeoutRef.current) {
        clearTimeout(contentChangeTimeoutRef.current);
      }

      // 防抖处理，避免频繁更新状态
      contentChangeTimeoutRef.current = setTimeout(() => {
        setDescription(content);
        // 立即更新缓存
        immediateUpdateCache(titleRef.current, content);
      }, 300); // 300ms 防抖
    },
    [immediateUpdateCache]
  );

  // 处理标题变化
  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTitle = e.target.value;
      setTitle(newTitle);
      // 立即更新缓存
      immediateUpdateCache(newTitle, descriptionRef.current);
    },
    [immediateUpdateCache]
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

  // 标记是否有未保存的更改
  const hasUnsavedChangesRef = useRef(false);

  // 服务器保存函数
  const saveToServerRef = useRef<(() => Promise<void>) | null>(null);

  // 创建服务器保存函数
  useEffect(() => {
    saveToServerRef.current = async () => {
      if (isSaving) {
        return;
      }

      // 获取最新的数据
      const currentTitle = titleRef.current;
      const currentDescription = descriptionRef.current;

      // 检查是否有变化
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
        });

        // 用服务器返回的数据更新缓存（确保数据一致性）
        if (issueData.copany_id) {
          unifiedIssueCache.setIssue(issueData.copany_id, updatedIssue);
        }
        hasUnsavedChangesRef.current = false;
        console.log("✅ Server save completed successfully");
      } catch (error) {
        console.error("❌ Error saving to server:", error);
        // 保存失败时保持未保存状态
        hasUnsavedChangesRef.current = true;
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
      hasUnsavedChangesRef.current = false;
      return;
    }

    console.log("Changes detected, setting up auto-save timer");
    hasUnsavedChangesRef.current = true;

    // 清除之前的定时器
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // 设置新的定时器，10秒后执行服务器保存
    saveTimeoutRef.current = setTimeout(() => {
      console.log("Auto-save timer triggered");
      if (saveToServerRef.current) {
        saveToServerRef.current();
      }
    }, 10000);

    // 清理函数
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [title, description, issueData]);

  // 页面离开时的保存处理
  useEffect(() => {
    const handleBeforeUnload = () => {
      // 如果有未保存的更改，静默保存
      if (hasUnsavedChangesRef.current && saveToServerRef.current) {
        // 使用 sendBeacon 进行可靠的后台保存
        const currentTitle = titleRef.current;
        const currentDescription = descriptionRef.current;

        const payload = JSON.stringify({
          id: issueData.id,
          title: currentTitle,
          description: currentDescription,
          state: issueData.state ?? 0,
          priority: issueData.priority ?? null,
          level: issueData.level ?? null,
        });

        // 尝试使用 sendBeacon 进行后台保存
        if (navigator.sendBeacon) {
          navigator.sendBeacon("/api/issue/update", payload);
        }

        console.log("🚀 Background save initiated on page unload");
      }
    };

    const handleVisibilityChange = () => {
      // 页面变为隐藏时，立即保存
      if (
        document.hidden &&
        hasUnsavedChangesRef.current &&
        saveToServerRef.current
      ) {
        saveToServerRef.current();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [issueData]);

  // 组件卸载时的清理
  useEffect(() => {
    return () => {
      // 组件卸载时，立即保存未保存的数据
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
