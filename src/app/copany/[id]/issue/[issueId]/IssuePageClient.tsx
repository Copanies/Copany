"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getIssueAction } from "@/actions/issue.actions";
import {
  IssueWithAssignee,
  IssueState,
  IssuePriority,
  CopanyContributor,
  AssigneeUser,
} from "@/types/database.types";
import IssueStateSelector from "@/components/IssueStateSelector";
import IssuePrioritySelector from "@/components/IssuePrioritySelector";
import IssueAssigneeSelector from "@/components/IssueAssigneeSelector";
import IssueEditorView from "@/components/IssueEditorView";
import { issuesManager } from "@/utils/cache";
import { currentUserManager, contributorsManager } from "@/utils/cache";
import LoadingView from "@/components/commons/LoadingView";
import { User } from "@supabase/supabase-js";
import IssueLevelSelector from "@/components/IssueLevelSelector";

interface IssuePageClientProps {
  copanyId: string;
  issueId: string;
}

export default function IssuePageClient({
  copanyId,
  issueId,
}: IssuePageClientProps) {
  const [issueData, setIssueData] = useState<IssueWithAssignee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [contributors, setContributors] = useState<CopanyContributor[]>([]);

  // 用于跟踪未保存的更改
  const hasUnsavedChangesRef = useRef(false);

  // 页面离开时的保存处理
  useEffect(() => {
    const handleBeforeUnload = () => {
      // 如果有未保存的更改，静默保存
      if (hasUnsavedChangesRef.current && issueData) {
        // 使用 sendBeacon 进行可靠的后台保存
        const payload = JSON.stringify({
          id: issueData.id,
          title: issueData.title,
          description: issueData.description,
          state: issueData.state ?? 0,
          priority: issueData.priority ?? null,
          level: issueData.level ?? null,
          assignee: issueData.assignee ?? null,
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
      if (document.hidden && hasUnsavedChangesRef.current && issueData) {
        // 这里可以触发保存逻辑
        console.log("🚀 Background save initiated on visibility change");
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
      // 组件卸载时，如果有未保存的更改，立即缓存
      if (hasUnsavedChangesRef.current && issueData) {
        issuesManager.updateIssue(copanyId, issueData);
        console.log("📦 Cached unsaved changes on component unmount");
      }
    };
  }, [issueData, copanyId]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        // 加载用户和贡献者数据
        const [user, contributorList] = await Promise.all([
          currentUserManager.getCurrentUser(),
          contributorsManager.getContributors(copanyId),
        ]);

        setCurrentUser(user);
        setContributors(contributorList);

        console.log(`[IssuePageClient] 📱 Client mounted, checking cache...`);

        // 首先尝试从缓存获取
        const cachedData = issuesManager.getIssue(copanyId, issueId);
        if (cachedData) {
          console.log(
            `[IssuePageClient] 💾 Using cached data: ${cachedData.title}`
          );
          setIssueData(cachedData);
          setIsLoading(false);
        } else {
          console.log(
            `[IssuePageClient] 🚫 No cache available, loading from server...`
          );
        }

        // 然后从服务器获取最新数据
        const freshIssueData = await getIssueAction(issueId);
        console.log(
          `[IssuePageClient] ✅ Loaded from server:`,
          freshIssueData?.title
        );
        setIssueData(freshIssueData);

        // 更新缓存
        if (freshIssueData) {
          issuesManager.updateIssue(copanyId, freshIssueData);
        }
      } catch (error) {
        console.error("Error loading issue data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [copanyId, issueId]);

  const handleStateChange = useCallback(
    async (newState: IssueState) => {
      if (!issueData) return;

      try {
        const updated = {
          ...issueData,
          state: newState,
        };
        setIssueData(updated);
        issuesManager.updateIssue(copanyId, updated);
        hasUnsavedChangesRef.current = true;
        console.log(`[IssuePageClient] 📝 State updated: ${newState}`);
      } catch (error) {
        console.error("Error updating issue state:", error);
      }
    },
    [issueData, copanyId]
  );

  const handlePriorityChange = useCallback(
    async (newPriority: IssuePriority) => {
      if (!issueData) return;

      try {
        const updated = {
          ...issueData,
          priority: newPriority,
        };
        setIssueData(updated);
        issuesManager.updateIssue(copanyId, updated);
        hasUnsavedChangesRef.current = true;
        console.log(`[IssuePageClient] 📝 Priority updated: ${newPriority}`);
      } catch (error) {
        console.error("Error updating issue priority:", error);
      }
    },
    [issueData, copanyId]
  );

  const handleLevelChange = useCallback(
    async (newLevel: number) => {
      if (!issueData) return;

      try {
        const updated = {
          ...issueData,
          level: newLevel,
        };
        setIssueData(updated);
        issuesManager.updateIssue(copanyId, updated);
        hasUnsavedChangesRef.current = true;
        console.log(`[IssuePageClient] 📝 Level updated: ${newLevel}`);
      } catch (error) {
        console.error("Error updating issue level:", error);
      }
    },
    [issueData, copanyId]
  );

  const handleAssigneeChange = useCallback(
    async (
      issueId: string,
      newAssignee: string | null,
      assigneeUser: AssigneeUser | null
    ) => {
      if (!issueData) return;

      try {
        const updated = {
          ...issueData,
          assignee: newAssignee,
          assignee_user: assigneeUser,
        };
        setIssueData(updated);
        issuesManager.updateIssue(copanyId, updated);
        hasUnsavedChangesRef.current = true;
        console.log(`[IssuePageClient] 📝 Assignee updated: ${newAssignee}`);
      } catch (error) {
        console.error("Error updating issue assignee:", error);
      }
    },
    [issueData, copanyId]
  );

  // 处理标题变化
  const handleTitleChange = useCallback(
    (issueId: string, newTitle: string) => {
      if (!issueData) return;

      try {
        const updated = {
          ...issueData,
          title: newTitle,
        };
        setIssueData(updated);
        issuesManager.updateIssue(copanyId, updated);
        hasUnsavedChangesRef.current = true;
        console.log(`[IssuePageClient] 📝 Title updated: ${newTitle}`);
      } catch (error) {
        console.error("Error updating issue title:", error);
      }
    },
    [issueData, copanyId]
  );

  // 处理描述变化
  const handleDescriptionChange = useCallback(
    (issueId: string, newDescription: string) => {
      if (!issueData) return;

      try {
        const updated = {
          ...issueData,
          description: newDescription,
        };
        setIssueData(updated);
        issuesManager.updateIssue(copanyId, updated);
        hasUnsavedChangesRef.current = true;
        console.log(`[IssuePageClient] 📝 Description updated`);
      } catch (error) {
        console.error("Error updating issue description:", error);
      }
    },
    [issueData, copanyId]
  );

  if (isLoading) {
    return <LoadingView type="page" />;
  }

  if (!issueData) {
    return <div>Issue not found</div>;
  }

  return (
    <div className="flex flex-col md:flex-row max-w-screen-lg mx-auto gap-2">
      <div className="md:hidden px-3 flex flex-row flex-wrap gap-x-2 gap-y-2 pb-3 border-b border-gray-200 dark:border-gray-800">
        <IssueStateSelector
          issueId={issueData.id}
          initialState={issueData.state}
          showText={true}
          onStateChange={(_, newState) => handleStateChange(newState)}
        />
        <IssuePrioritySelector
          issueId={issueData.id}
          initialPriority={issueData.priority}
          showText={true}
          onPriorityChange={(_, newPriority) =>
            handlePriorityChange(newPriority)
          }
        />
        <IssueLevelSelector
          issueId={issueData.id}
          initialLevel={issueData.level}
          showText={true}
          onLevelChange={(_, newLevel) => handleLevelChange(newLevel)}
        />
        <IssueAssigneeSelector
          issueId={issueData.id}
          initialAssignee={issueData.assignee}
          assigneeUser={issueData.assignee_user}
          currentUser={currentUser}
          contributors={contributors}
          onAssigneeChange={handleAssigneeChange}
        />
      </div>

      <div className="flex-1">
        <IssueEditorView
          issueData={issueData}
          onTitleChange={handleTitleChange}
          onDescriptionChange={handleDescriptionChange}
        />
      </div>

      {/* 中等屏幕及以上在右侧显示状态和优先级选择器 */}
      <div className="hidden md:block md:w-1/3">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
              State
            </div>
            <IssueStateSelector
              issueId={issueData.id}
              initialState={issueData.state}
              showText={true}
              onStateChange={(_, newState) => handleStateChange(newState)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Priority
            </div>
            <IssuePrioritySelector
              issueId={issueData.id}
              initialPriority={issueData.priority}
              showText={true}
              onPriorityChange={(_, newPriority) =>
                handlePriorityChange(newPriority)
              }
            />
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Level
            </div>
            <IssueLevelSelector
              issueId={issueData.id}
              initialLevel={issueData.level}
              showText={true}
              onLevelChange={(_, newLevel) => handleLevelChange(newLevel)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Assignee
            </div>
            <IssueAssigneeSelector
              issueId={issueData.id}
              initialAssignee={issueData.assignee}
              assigneeUser={issueData.assignee_user}
              currentUser={currentUser}
              contributors={contributors}
              onAssigneeChange={handleAssigneeChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
