"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import IssueEditorView from "@/components/IssueEditorView";
import IssueStateSelector from "@/components/IssueStateSelector";
import IssuePrioritySelector from "@/components/IssuePrioritySelector";
import { getIssueAction } from "@/actions/issue.actions";
import { Issue } from "@/types/database.types";
import { unifiedIssueCache } from "@/utils/cache";
import IssueLevelSelector from "@/components/IssueLevelSelector";
import LoadingView from "@/components/commons/LoadingView";

interface IssuePageClientProps {
  copanyId: string;
  issueId: string;
}

export default function IssuePageClient({
  copanyId,
  issueId,
}: IssuePageClientProps) {
  const [issueData, setIssueData] = useState<Issue | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasMountedRef = useRef(false);

  // 客户端挂载后检查缓存，无缓存时请求服务器
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      console.log(`[IssuePageClient] 📱 Client mounted, checking cache...`);

      // 尝试从缓存读取
      const cachedData = unifiedIssueCache.getIssue(copanyId, issueId);
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
        // 无缓存时从服务器加载
        const loadFromServer = async () => {
          try {
            const freshIssueData = await getIssueAction(issueId);
            setIssueData(freshIssueData);
            // 更新缓存
            unifiedIssueCache.setIssue(copanyId, freshIssueData);
          } catch (error) {
            console.error("Error loading issue:", error);
          } finally {
            setIsLoading(false);
          }
        };
        loadFromServer();
      }
    }
  }, [issueId, copanyId]);

  // 处理状态更新
  const handleStateChange = useCallback(
    (issueId: string, newState: number) => {
      setIssueData((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, state: newState };
        // 更新缓存
        unifiedIssueCache.setIssue(copanyId, updated);
        return updated;
      });
    },
    [copanyId]
  );

  // 处理优先级更新
  const handlePriorityChange = useCallback(
    (issueId: string, newPriority: number) => {
      setIssueData((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, priority: newPriority };
        // 更新缓存
        unifiedIssueCache.setIssue(copanyId, updated);
        return updated;
      });
    },
    [copanyId]
  );

  // 处理等级更新
  const handleLevelChange = useCallback(
    (issueId: string, newLevel: number) => {
      setIssueData((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, level: newLevel };
        // 更新缓存
        unifiedIssueCache.setIssue(copanyId, updated);
        return updated;
      });
    },
    [copanyId]
  );

  if (isLoading || !issueData) {
    return <LoadingView type="label" />;
  }

  return (
    <div className="flex flex-col md:flex-row max-w-screen-lg mx-auto gap-2">
      {/* 小屏幕下在顶部显示状态和优先级选择器 */}

      <div className="md:hidden px-5 flex flex-row gap-6 pb-3 border-b border-gray-200 dark:border-gray-800 pb-2">
        <IssueStateSelector
          issueId={issueData.id}
          initialState={issueData.state}
          showText={true}
          showBackground={true}
          onStateChange={handleStateChange}
        />

        <IssuePrioritySelector
          issueId={issueData.id}
          initialPriority={issueData.priority}
          showText={true}
          showBackground={true}
          onPriorityChange={handlePriorityChange}
        />

        <IssueLevelSelector
          issueId={issueData.id}
          initialLevel={issueData.level}
          showBackground={true}
          onLevelChange={handleLevelChange}
        />
      </div>

      <div className="flex-1">
        <IssueEditorView issueData={issueData} />
      </div>

      {/* 中等屏幕及以上在右侧显示状态和优先级选择器 */}
      <div className="hidden md:block md:w-1/3">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="text-sm text-gray-500">State</div>
            <IssueStateSelector
              issueId={issueData.id}
              initialState={issueData.state}
              showText={true}
              onStateChange={handleStateChange}
            />
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-sm text-gray-500">Priority</div>
            <IssuePrioritySelector
              issueId={issueData.id}
              initialPriority={issueData.priority}
              showText={true}
              onPriorityChange={handlePriorityChange}
            />
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-sm text-gray-500">Level</div>
            <IssueLevelSelector
              issueId={issueData.id}
              initialLevel={issueData.level}
              onLevelChange={handleLevelChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
