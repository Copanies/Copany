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
import {
  currentUserManager,
  contributorsManager,
  issuesManager,
} from "@/utils/cache";
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

  // For tracking unsaved changes
  const hasUnsavedChangesRef = useRef(false);

  // Save handling when page leaves
  useEffect(() => {
    const handleBeforeUnload = () => {
      // If there are unsaved changes, save silently
      if (hasUnsavedChangesRef.current && issueData) {
        // Save in cache first
        issuesManager.updateIssue(copanyId, issueData);
        // Use sendBeacon for reliable background save
        const payload = JSON.stringify({
          id: issueData.id,
          title: issueData.title,
          description: issueData.description,
          state: issueData.state ?? 0,
          priority: issueData.priority ?? null,
          level: issueData.level ?? null,
          assignee: issueData.assignee ?? null,
        });

        // Try using sendBeacon for background save
        if (navigator.sendBeacon) {
          navigator.sendBeacon("/api/issue/update", payload);
        }

        console.log("🚀 Background save initiated on page unload");
      }
    };

    const handleVisibilityChange = () => {
      // Save immediately when page becomes hidden
      if (document.hidden && hasUnsavedChangesRef.current && issueData) {
        // Here you can trigger save logic
        console.log("🚀 Background save initiated on visibility change");
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [issueData, copanyId]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        // Load user and contributor data
        const [user, contributorList] = await Promise.all([
          currentUserManager.getCurrentUser(),
          contributorsManager.getContributors(copanyId),
        ]);

        setCurrentUser(user);
        setContributors(contributorList);

        console.log(`[IssuePageClient] 📱 Client mounted, checking cache...`);

        // First try to get from cache
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

        // Then get latest data from server
        const freshIssueData = await getIssueAction(issueId);
        console.log(
          `[IssuePageClient] ✅ Loaded from server:`,
          freshIssueData?.title
        );
        setIssueData(freshIssueData);

        // Update cache
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

  // Handle title change
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

  // Handle description change
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
        console.log(`[IssuePageClient] 📝 Description updated`, newDescription);
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

      <div className="flex-1 mb-20 max-w-screen-lg mx-auto">
        <IssueEditorView
          issueData={issueData}
          onTitleChange={handleTitleChange}
          onDescriptionChange={handleDescriptionChange}
        />
      </div>

      {/* Show state and priority selectors on larger screens */}
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
