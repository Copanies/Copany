"use client";

import { Suspense } from "react";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import {
  IssueWithAssignee,
  IssueState,
  IssuePriority,
  AssigneeUser,
} from "@/types/database.types";
import type { UserInfo } from "@/actions/user.actions";
import IssueStateSelector from "@/components/issue/IssueStateSelector";
import IssuePrioritySelector from "@/components/issue/IssuePrioritySelector";
import IssueAssigneeSelector from "@/components/issue/IssueAssigneeSelector";
import { renderUserLabel } from "@/components/issue/IssueAssigneeSelector";
import IssueEditorView from "@/components/issue/IssueEditorView";

import AssignmentRequestModal from "@/components/issue/AssignmentRequestModal";
import IssueActivityTimeline from "@/components/issue/IssueActivityTimeline";
import { useIssue } from "@/hooks/issues";
import { useQueryClient } from "@tanstack/react-query";
import LoadingView from "@/components/commons/LoadingView";
import { useDarkMode } from "@/utils/useDarkMode";

import IssueLevelSelector from "@/components/issue/IssueLevelSelector";
import {
  ChevronLeftIcon,
  ArrowRightIcon,
  HandRaisedIcon,
} from "@heroicons/react/24/outline";
import Button from "@/components/commons/Button";
import { EyeIcon } from "@heroicons/react/24/outline";

import type { AssignmentRequest } from "@/types/database.types";
import * as Tooltip from "@radix-ui/react-tooltip";

// React Query hooks
import { useCurrentUser } from "@/hooks/currentUser";
import { useContributors } from "@/hooks/contributors";
import { useCopany } from "@/hooks/copany";
import { useAssignmentRequests } from "@/hooks/assignmentRequests";
import { useUsersInfo } from "@/hooks/userInfo";
import { useIssuePermission } from "@/hooks/permissions";
import {
  EMPTY_CONTRIBUTORS_ARRAY,
  EMPTY_ASSIGNMENT_REQUESTS_ARRAY,
  EMPTY_USER_INFOS_OBJECT,
  EMPTY_ARRAY,
} from "@/utils/constants";

interface IssuePageClientProps {
  copanyId: string;
  issueId: string;
}

export default function IssuePageClient({
  copanyId,
  issueId,
}: IssuePageClientProps) {
  const [issueData, setIssueData] = useState<IssueWithAssignee | null>(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const handleBack = () => {
    // Build return URL, keep tab and subtab parameters
    const copanyId = params.id;
    const tab = searchParams.get("tab") || "Cooperate";

    const backUrl = `/copany/${copanyId}?tab=${tab}`;
    router.push(backUrl);
  };

  // For tracking unsaved changes
  const hasUnsavedChangesRef = useRef(false);

  // React Query hooks
  const { data: currentUser } = useCurrentUser();
  const {
    data: contributors = EMPTY_CONTRIBUTORS_ARRAY,
    isLoading: isContributorsLoading,
  } = useContributors(copanyId);
  const { data: _copany, isLoading: isCopanyLoading } = useCopany(copanyId);
  const {
    data: assignmentRequests = EMPTY_ASSIGNMENT_REQUESTS_ARRAY,
    isLoading: isAssignmentRequestsLoading,
  } = useAssignmentRequests(issueId);
  const { data: canEdit = false, isLoading: isPermissionLoading } =
    useIssuePermission(copanyId, issueData);
  const isDarkMode = useDarkMode();

  // Overall loading state
  const isLoading =
    isContributorsLoading ||
    isCopanyLoading ||
    isAssignmentRequestsLoading ||
    isPermissionLoading;

  // Collect user IDs from assignment requests for user info
  const userIds = useMemo(() => {
    const ids = new Set<string>();

    // Add requester IDs from assignment requests
    assignmentRequests.forEach((req) => {
      if (req.requester_id) ids.add(String(req.requester_id));
    });

    // Add creator ID if exists
    if (issueData?.created_by) {
      ids.add(String(issueData.created_by));
    }

    return Array.from(ids);
  }, [assignmentRequests, issueData?.created_by]);

  const { data: userInfosMap = EMPTY_USER_INFOS_OBJECT } =
    useUsersInfo(userIds);

  // Compute pending requests by requester
  const pendingRequestsByRequester = useMemo(() => {
    const map: Record<string, AssignmentRequest[]> = {};
    for (const req of assignmentRequests) {
      const key = String(req.requester_id);
      if (!map[key]) map[key] = [];
      map[key].push(req);
    }
    return map;
  }, [assignmentRequests]);

  // Extract requesters info and creator info
  const requestersInfo = useMemo(() => {
    const map: Record<string, UserInfo> = {};
    Object.keys(pendingRequestsByRequester).forEach((requesterId) => {
      if (userInfosMap[requesterId]) {
        map[requesterId] = userInfosMap[requesterId];
      }
    });
    return map;
  }, [pendingRequestsByRequester, userInfosMap]);

  const creatorInfo = useMemo(() => {
    if (!issueData?.created_by) return null;
    return userInfosMap[String(issueData.created_by)] || null;
  }, [issueData?.created_by, userInfosMap]);

  // Permission resolved when we have the data
  const isPermissionResolved = !isPermissionLoading;

  // Read-only tooltip
  const readOnlyTooltip = useMemo(() => {
    if (canEdit) return "";
    return "Only the Copany owner, Issue creator, or current assignee can edit.";
  }, [canEdit]);

  // Save handling when page leaves
  useEffect(() => {
    const handleBeforeUnload = () => {
      // If there are unsaved changes, save silently
      if (hasUnsavedChangesRef.current && issueData) {
        // Update React Query cache to persist latest draft locally
        try {
          queryClient.setQueryData<IssueWithAssignee[]>(
            ["issues", copanyId],
            (prev) => {
              if (!prev) return prev;
              return prev.map((it) =>
                String(it.id) === String(issueData.id) ? issueData : it
              );
            }
          );
        } catch (_) {}

        const payload = JSON.stringify({
          id: issueData.id,
          description: issueData.description,
        });

        if (navigator.sendBeacon) {
          navigator.sendBeacon("/api/issue/update", payload);
        }

        console.log("🚀 Background save initiated on page unload");
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && hasUnsavedChangesRef.current && issueData) {
        console.log("🚀 Background save initiated on visibility change");
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [issueData, queryClient, copanyId]);

  // Use React Query to get current issue
  const { data: rqIssue, isLoading: isIssueLoading } = useIssue(
    copanyId,
    issueId
  );

  // Sync RQ issue to local state for editor and permission computation
  useEffect(() => {
    if (rqIssue) {
      setIssueData(rqIssue);
    }
  }, [rqIssue]);

  const updateIssueInCache = useCallback(
    (updated: IssueWithAssignee) => {
      try {
        // 更新 issues 列表缓存
        queryClient.setQueryData<IssueWithAssignee[]>(
          ["issues", copanyId],
          (prev) => {
            if (!prev) return prev;
            return prev.map((it) =>
              String(it.id) === String(updated.id) ? updated : it
            );
          }
        );
      } catch (_) {}
    },
    [queryClient, copanyId]
  );

  // Remove old fetchCreator and reloadPendingRequests functions since data is now managed by React Query

  const handleStateChange = useCallback(
    async (newState: IssueState) => {
      if (!issueData) return;

      try {
        // Optimistically update state only; closed_at handled by cache and corrected by server
        const optimistic = { ...issueData, state: newState };
        setIssueData(optimistic);
        updateIssueInCache(optimistic);
        hasUnsavedChangesRef.current = true;
        console.log(`[IssuePageClient] 📝 State updated: ${newState}`);
      } catch (error) {
        console.error("Error updating issue state:", error);
      }
    },
    [issueData, updateIssueInCache]
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
        updateIssueInCache(updated);
        hasUnsavedChangesRef.current = true;
        console.log(`[IssuePageClient] 📝 Priority updated: ${newPriority}`);
      } catch (error) {
        console.error("Error updating issue priority:", error);
      }
    },
    [issueData, updateIssueInCache]
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
        updateIssueInCache(updated);
        hasUnsavedChangesRef.current = true;
        console.log(`[IssuePageClient] 📝 Level updated: ${newLevel}`);
      } catch (error) {
        console.error("Error updating issue level:", error);
      }
    },
    [issueData, updateIssueInCache]
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
        updateIssueInCache(updated);
        hasUnsavedChangesRef.current = true;
        console.log(`[IssuePageClient] 📝 Assignee updated: ${newAssignee}`);
      } catch (error) {
        console.error("Error updating issue assignee:", error);
      }
    },
    [issueData, updateIssueInCache]
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
        updateIssueInCache(updated);
        hasUnsavedChangesRef.current = true;
        console.log(`[IssuePageClient] 📝 Title updated: ${newTitle}`);
      } catch (error) {
        console.error("Error updating issue title:", error);
      }
    },
    [issueData, updateIssueInCache]
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
        updateIssueInCache(updated);
        hasUnsavedChangesRef.current = true;
        console.log(`[IssuePageClient] 📝 Description updated`, newDescription);
      } catch (error) {
        console.error("Error updating issue description:", error);
      }
    },
    [issueData, updateIssueInCache]
  );

  const assignmentRequestView = (() => {
    if (Object.keys(pendingRequestsByRequester).length === 0) return null;
    return (
      <div className="flex flex-col gap-3">
        {Object.entries(pendingRequestsByRequester).map(
          ([requesterId, reqs]) => (
            <div
              key={requesterId}
              className="flex items-center justify-between gap-2"
            >
              {/* <div className="flex items-center gap-2"> */}
              <div className="flex flex-row items-center gap-0 -ml-1">
                <HandRaisedIcon className="w-5 h-5 -rotate-30 translate-y-0.5 translate-x-1" />
                <div className="hover:opacity-80 cursor-pointer">
                  {renderUserLabel(
                    reqs[0]?.requester_id &&
                      currentUser?.id === reqs[0].requester_id
                      ? currentUser?.user_metadata?.name || ""
                      : requestersInfo[requesterId]?.name || "",
                    reqs[0]?.requester_id &&
                      currentUser?.id === reqs[0].requester_id
                      ? currentUser?.user_metadata?.avatar_url || null
                      : requestersInfo[requesterId]?.avatar_url || null,
                    true,
                    isDarkMode,
                    reqs[0]?.requester_id &&
                      currentUser?.id === reqs[0].requester_id
                      ? currentUser?.user_metadata?.email || null
                      : requestersInfo[requesterId]?.email || null
                  )}
                </div>
              </div>
              {/* <span className="text-sm text-gray-600 dark:text-gray-400">
                  wants to be assigned
                </span>
              </div> */}
              <Button
                variant="secondary"
                size="xs"
                onClick={() => {
                  const el = document.getElementById(
                    `assignment-request-${requesterId}`
                  );
                  if (el)
                    el.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    });
                }}
              >
                <div className="flex flex-row gap-1 items-center">
                  <ArrowRightIcon className="w-4 h-4" />
                  <span>View</span>
                </div>
              </Button>
            </div>
          )
        )}
      </div>
    );
  })();

  if (isLoading || isIssueLoading) {
    return <LoadingView type="page" />;
  }

  if (!issueData) {
    return <div>Issue not found</div>;
  }

  return (
    <div>
      <div className="max-w-screen-lg mx-auto flex flex-row items-center p-3 gap-2">
        <Button
          variant="secondary"
          size="md"
          shape="square"
          onClick={handleBack}
        >
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
                  className="tooltip-surface"
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
        <div className="md:hidden mx-3 mb-2 flex flex-col gap-3 pb-3 border-b border-gray-200 dark:border-gray-800">
          <div className="flex flex-row items-center gap-2 h-6">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400 w-16">
              State
            </div>
            <IssueStateSelector
              issueId={issueData.id}
              initialState={issueData.state}
              showText={true}
              copanyId={copanyId}
              onStateChange={(_, newState) => handleStateChange(newState)}
              onServerUpdated={(serverIssue) => {
                setIssueData(serverIssue);
                updateIssueInCache(serverIssue);
              }}
              readOnly={!canEdit}
            />
          </div>

          <div className="flex flex-row items-center gap-2 h-6">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400 w-16">
              Priority
            </div>
            <IssuePrioritySelector
              issueId={issueData.id}
              initialPriority={issueData.priority}
              showText={true}
              copanyId={copanyId}
              onPriorityChange={(_, newPriority) =>
                handlePriorityChange(newPriority)
              }
              readOnly={!canEdit}
            />
          </div>

          <div className="flex flex-row items-center gap-2 h-6">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400 w-16">
              Level
            </div>
            <IssueLevelSelector
              issueId={issueData.id}
              initialLevel={issueData.level}
              showText={true}
              copanyId={copanyId}
              onLevelChange={(_, newLevel) => handleLevelChange(newLevel)}
              readOnly={!canEdit}
            />
          </div>

          <div className="flex flex-row items-top gap-2">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400 w-16 h-6">
              Assignee
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex flex-row items-center gap-2 h-6">
                <IssueAssigneeSelector
                  issueId={issueData.id}
                  initialAssignee={issueData.assignee}
                  assigneeUser={issueData.assignee_user}
                  currentUser={currentUser}
                  contributors={contributors}
                  copanyId={copanyId}
                  onAssigneeChange={handleAssigneeChange}
                  readOnly={!canEdit}
                  onRequestAssignment={() => setIsRequestModalOpen(true)}
                  hasPendingByMe={(() => {
                    const meId = currentUser?.id
                      ? String(currentUser.id)
                      : null;
                    if (!meId) return false;
                    const list =
                      pendingRequestsByRequester[meId] || EMPTY_ARRAY;
                    return list.length > 0;
                  })()}
                />
                {(() => {
                  const meId = currentUser?.id ? String(currentUser.id) : null;
                  const hasPendingByMe = !!(
                    meId &&
                    pendingRequestsByRequester[meId] &&
                    pendingRequestsByRequester[meId].length > 0
                  );
                  const canRequest =
                    !canEdit && !!currentUser && !hasPendingByMe;
                  if (!currentUser || canEdit) return null;
                  if (canRequest) {
                    return (
                      <Button
                        size="xs"
                        variant="secondary"
                        onClick={() => setIsRequestModalOpen(true)}
                      >
                        <div className="flex flex-row items-center gap-1">
                          <HandRaisedIcon className="w-4 h-4 -rotate-30" />
                          <p>Assign to me</p>
                        </div>
                      </Button>
                    );
                  }
                })()}
              </div>
              {assignmentRequestView}
            </div>
          </div>

          <div className="flex flex-row items-center gap-2 h-6">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400 w-16">
              Creator
            </div>
            <div className="hover:opacity-80 cursor-pointer">
              {renderUserLabel(
                creatorInfo?.name || "",
                creatorInfo?.avatar_url || null,
                true,
                isDarkMode,
                creatorInfo?.email || null
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 mb-100 md:w-2/3">
          <Suspense
            fallback={
              <LoadingView type="label" label="Loading issue editor..." />
            }
          >
            <IssueEditorView
              issueData={issueData}
              onTitleChange={handleTitleChange}
              onDescriptionChange={handleDescriptionChange}
              isReadonly={!canEdit}
            />
          </Suspense>
          <div className="flex flex-col gap-3 pt-8 pr-3 md:pr-0">
            <p className="text-base font-medium px-3 text-gray-600 dark:text-gray-400">
              Activity
            </p>
            {/* Issue activity timeline (includes comments) */}
            <Suspense
              fallback={
                <LoadingView type="label" label="Loading activity..." />
              }
            >
              <IssueActivityTimeline
                issueId={issueData.id}
                copanyId={copanyId}
                canEdit={canEdit}
                issueState={issueData.state}
                issueLevel={issueData.level}
              />
            </Suspense>
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
        <div className="hidden md:block md:w-1/3 pr-4">
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
                  updateIssueInCache(serverIssue);
                  updateIssueInCache(serverIssue);
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
              <div className="flex flex-row items-center justify-between gap-2">
                <IssueAssigneeSelector
                  issueId={issueData.id}
                  initialAssignee={issueData.assignee}
                  assigneeUser={issueData.assignee_user}
                  currentUser={currentUser}
                  contributors={contributors}
                  copanyId={copanyId}
                  onAssigneeChange={handleAssigneeChange}
                  readOnly={!canEdit}
                  onRequestAssignment={() => setIsRequestModalOpen(true)}
                  hasPendingByMe={(() => {
                    const meId = currentUser?.id
                      ? String(currentUser.id)
                      : null;
                    if (!meId) return false;
                    const list =
                      pendingRequestsByRequester[meId] || EMPTY_ARRAY;
                    return list.length > 0;
                  })()}
                />
                {(() => {
                  const meId = currentUser?.id ? String(currentUser.id) : null;
                  const hasPendingByMe = !!(
                    meId &&
                    pendingRequestsByRequester[meId] &&
                    pendingRequestsByRequester[meId].length > 0
                  );
                  const canRequest =
                    !canEdit && !!currentUser && !hasPendingByMe;
                  if (!currentUser || canEdit) return null;
                  if (canRequest) {
                    return (
                      <Button
                        size="xs"
                        variant="secondary"
                        onClick={() => setIsRequestModalOpen(true)}
                      >
                        <div className="flex flex-row items-center gap-1">
                          <HandRaisedIcon className="w-4 h-4 -rotate-30" />
                          <p>Assign to me</p>
                        </div>
                      </Button>
                    );
                  }
                })()}
              </div>
              {assignmentRequestView}
            </div>
            <div className="flex flex-col gap-2">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Creator
              </div>
              <div className="hover:opacity-80 cursor-pointer">
                {renderUserLabel(
                  creatorInfo?.name || "",
                  creatorInfo?.avatar_url || null,
                  true,
                  isDarkMode,
                  creatorInfo?.email || null
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Assignment Request Modal */}
      <AssignmentRequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        issueId={issueId}
        copanyId={copanyId}
        currentUser={currentUser || null}
      />
    </div>
  );
}
