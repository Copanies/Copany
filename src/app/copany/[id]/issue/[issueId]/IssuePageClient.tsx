"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { getIssueAction } from "@/actions/issue.actions";
import {
  IssueWithAssignee,
  IssueState,
  IssuePriority,
  CopanyContributor,
  AssigneeUser,
  Copany,
} from "@/types/database.types";
import IssueStateSelector from "@/components/IssueStateSelector";
import IssuePrioritySelector from "@/components/IssuePrioritySelector";
import IssueAssigneeSelector from "@/components/IssueAssigneeSelector";
import IssueEditorView from "@/components/IssueEditorView";
import IssueActivityTimeline from "@/components/IssueActivityTimeline";
import {
  currentUserManager,
  contributorsManager,
  issuesManager,
  copanyManager,
  issuePermissionManager,
} from "@/utils/cache";
import LoadingView from "@/components/commons/LoadingView";
import { User } from "@supabase/supabase-js";
import IssueLevelSelector from "@/components/IssueLevelSelector";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import Button from "@/components/commons/Button";
import { EyeIcon } from "@heroicons/react/24/outline";
import { getCopanyByIdAction } from "@/actions/copany.actions";
import * as Tooltip from "@radix-ui/react-tooltip";

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
  const [canEdit, setCanEdit] = useState<boolean>(false);
  const [isPermissionResolved, setIsPermissionResolved] =
    useState<boolean>(false);
  const [readOnlyTooltip, setReadOnlyTooltip] = useState<string>("");
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const handleBack = () => {
    // Build return URL, keep tab and subtab parameters
    const copanyId = params.id;
    const tab = searchParams.get("tab") || "Cooperate";
    const subtab = searchParams.get("subtab") || "Issue";

    const backUrl = `/copany/${copanyId}?tab=${tab}&subtab=${subtab}`;
    router.push(backUrl);
  };

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
        const [user, contributorList, copany] = await Promise.all([
          currentUserManager.getCurrentUser(),
          contributorsManager.getContributors(copanyId),
          copanyManager.getCopany(copanyId, async () => {
            const result = await getCopanyByIdAction(copanyId);
            if (!result) throw new Error("Copany not found");
            return result as Copany;
          }),
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
        } else {
          console.log(
            `[IssuePageClient] 🚫 No cache available, loading from server...`
          );
        }

        // Compute edit permission
        if (cachedData) {
          await computeEditPermission(cachedData);
        }

        setIsLoading(false);

        // Then get latest data from server
        const freshIssueData = await getIssueAction(issueId);
        console.log(
          `[IssuePageClient] ✅ Loaded from server:`,
          freshIssueData?.title
        );
        setIssueData(freshIssueData);
        await computeEditPermission(freshIssueData);
        // Update cache
        if (freshIssueData) {
          issuesManager.updateIssue(copanyId, freshIssueData);
        }
      } catch (error) {
        console.error("Error loading issue data:", error);
        setIsPermissionResolved(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [copanyId, issueId]);

  async function computeEditPermission(issueData: IssueWithAssignee) {
    const allowed = await issuePermissionManager.canEditIssue(
      copanyId,
      issueData
    );
    setCanEdit(allowed);
    setReadOnlyTooltip(
      allowed
        ? ""
        : "Only the Copany owner, Issue creator, or current assignee can edit."
    );
    setIsPermissionResolved(true);
  }

  const handleStateChange = useCallback(
    async (newState: IssueState) => {
      if (!issueData) return;

      try {
        // Optimistically update state only; closed_at handled by cache and corrected by server
        const optimistic = { ...issueData, state: newState };
        setIssueData(optimistic);
        issuesManager.updateIssue(copanyId, optimistic);
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
    <div>
      <div className="max-w-screen-lg mx-auto flex flex-row items-center p-3 gap-2">
        <Button variant="primary" size="md" shape="square" onClick={handleBack}>
          <ChevronLeftIcon className="w-3 h-3 text-gray-900 dark:text-gray-100" />
        </Button>
        {isPermissionResolved && !canEdit && (
          <Tooltip.Provider delayDuration={150} skipDelayDuration={300}>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <div className="flex flex-row items-center w-fit gap-1 text-base bg-gray-100 dark:bg-gray-900 rounded-md px-2 py-[5px] cursor-default">
                  <EyeIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-gray-500 dark:text-gray-400 text-sm">
                    Read only
                  </span>
                </div>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  side="bottom"
                  sideOffset={8}
                  align="start"
                  className="z-[9999] rounded bg-white text-gray-900 text-sm px-3 py-2 shadow-lg border border-gray-200 w-80 md:w-96 whitespace-pre-line break-words"
                >
                  {readOnlyTooltip ||
                    "Only the Copany owner, Issue creator, or current assignee can edit."}
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>
        )}
      </div>
      <div className="flex flex-col md:flex-row max-w-screen-lg mx-auto md:gap-6">
        <div className="md:hidden mx-3 mb-2 flex flex-row flex-wrap gap-x-2 gap-y-2 pb-3 border-b border-gray-200 dark:border-gray-800">
          <IssueStateSelector
            issueId={issueData.id}
            initialState={issueData.state}
            showText={true}
            onStateChange={(_, newState) => handleStateChange(newState)}
            onServerUpdated={(serverIssue) => {
              setIssueData(serverIssue);
              issuesManager.updateIssue(copanyId, serverIssue);
            }}
            readOnly={!canEdit}
          />
          <IssuePrioritySelector
            issueId={issueData.id}
            initialPriority={issueData.priority}
            showText={true}
            onPriorityChange={(_, newPriority) =>
              handlePriorityChange(newPriority)
            }
            readOnly={!canEdit}
          />
          <IssueLevelSelector
            issueId={issueData.id}
            initialLevel={issueData.level}
            showText={true}
            onLevelChange={(_, newLevel) => handleLevelChange(newLevel)}
            readOnly={!canEdit}
          />
          <IssueAssigneeSelector
            issueId={issueData.id}
            initialAssignee={issueData.assignee}
            assigneeUser={issueData.assignee_user}
            currentUser={currentUser}
            contributors={contributors}
            onAssigneeChange={handleAssigneeChange}
            readOnly={!canEdit}
          />
        </div>

        <div className="flex-1 mb-100 md:w-2/3">
          <IssueEditorView
            issueData={issueData}
            onTitleChange={handleTitleChange}
            onDescriptionChange={handleDescriptionChange}
            isReadonly={!canEdit}
          />
          <div className="flex flex-col gap-3 pt-8 pr-3 md:pr-0">
            <p className="text-base font-medium px-3 text-gray-600 dark:text-gray-400">
              Activity
            </p>
            {/* Issue activity timeline (includes comments) */}
            <IssueActivityTimeline
              issueId={issueData.id}
              issueState={issueData.state}
              issueLevel={issueData.level}
            />
          </div>
        </div>
        <div className="hidden md:flex flex-col">
          <div className="flex-1 flex">
            <div
              className="w-px bg-gray-200 dark:bg-gray-800 h-full"
              style={{ minHeight: "100%" }}
            />
          </div>
        </div>
        {/* Show state and priority selectors on larger screens */}
        <div className="hidden md:block md:w-1/3 ">
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
                onServerUpdated={(serverIssue) => {
                  setIssueData(serverIssue);
                  issuesManager.updateIssue(copanyId, serverIssue);
                }}
                readOnly={!canEdit}
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
                readOnly={!canEdit}
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
                readOnly={!canEdit}
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
                readOnly={!canEdit}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
