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
import { renderUserLabel } from "@/components/IssueAssigneeSelector";
import IssueEditorView from "@/components/IssueEditorView";
import Modal from "@/components/commons/Modal";
import IssueActivityTimeline from "@/components/IssueActivityTimeline";
import {
  currentUserManager,
  contributorsManager,
  issuesManager,
  copanyManager,
  issuePermissionManager,
  assignmentRequestsManager,
} from "@/utils/cache";
import LoadingView from "@/components/commons/LoadingView";
import { User } from "@supabase/supabase-js";
import IssueLevelSelector from "@/components/IssueLevelSelector";
import {
  ChevronLeftIcon,
  ArrowRightIcon,
  HandRaisedIcon,
} from "@heroicons/react/24/outline";
import Button from "@/components/commons/Button";
import { EyeIcon } from "@heroicons/react/24/outline";
import { getCopanyByIdAction } from "@/actions/copany.actions";
import Image from "next/image";
import {
  listAssignmentRequestsAction,
  requestAssignmentToEditorsAction,
} from "@/actions/assignmentRequest.actions";
import type { AssignmentRequest } from "@/types/database.types";
import * as Tooltip from "@radix-ui/react-tooltip";
import { userInfoManager } from "@/utils/cache";
import type { UserInfo } from "@/actions/user.actions";

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
  const [pendingRequestsByRequester, setPendingRequestsByRequester] = useState<
    Record<string, AssignmentRequest[]>
  >({});
  const [requestersInfo, setRequestersInfo] = useState<
    Record<string, UserInfo>
  >({});
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
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

  const computeEditPermission = useCallback(
    async (issueData: IssueWithAssignee) => {
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
    },
    [copanyId]
  );

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        // Load user and contributor data
        const [user, contributorList, _copany] = await Promise.all([
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

        // Load pending assignment requests (requested only), grouped by requester
        try {
          const list = await assignmentRequestsManager.getRequests(
            issueId,
            () => listAssignmentRequestsAction(issueId)
          );
          const map: Record<string, AssignmentRequest[]> = {};
          for (const it of list) {
            if (it.status !== "requested") continue;
            const key = String(it.requester_id);
            if (!map[key]) map[key] = [];
            map[key].push(it);
          }
          setPendingRequestsByRequester(map);
          // 批量获取请求者用户信息
          const requesterIds = Object.keys(map);
          if (requesterIds.length > 0) {
            try {
              const infos = await userInfoManager.getMultipleUserInfo(
                requesterIds
              );
              setRequestersInfo(infos);
            } catch (e) {
              console.error("Failed to load requester user infos", e);
            }
          }
        } catch (e) {
          console.error(e);
        }
      } catch (error) {
        console.error("Error loading issue data:", error);
        setIsPermissionResolved(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    // Listen cache updates to immediately reflect background refresh results
    const onCacheUpdated = (e: Event) => {
      try {
        const detail = (e as CustomEvent).detail as {
          manager: string;
          key: string;
          data: unknown;
        };
        if (!detail) return;
        if (detail.manager === "IssuesManager" && detail.key === copanyId) {
          const list = detail.data as any[];
          const found = list.find((x) => String(x.id) === String(issueId));
          if (found) setIssueData(found);
        }
      } catch (_) {}
    };
    if (typeof window !== "undefined") {
      window.addEventListener("cache:updated", onCacheUpdated as any);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("cache:updated", onCacheUpdated as any);
      }
    };
  }, [copanyId, issueId, computeEditPermission]);

  const reloadPendingRequests = useCallback(async () => {
    try {
      const list = await assignmentRequestsManager.getRequests(issueId, () =>
        listAssignmentRequestsAction(issueId)
      );
      const map: Record<string, AssignmentRequest[]> = {};
      for (const it of list) {
        if (it.status !== "requested") continue;
        const key = String(it.requester_id);
        if (!map[key]) map[key] = [];
        map[key].push(it);
      }
      setPendingRequestsByRequester(map);
    } catch (e) {
      console.error(e);
    }
  }, [issueId]);

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

  const assignmentRequestView = (() => {
    if (Object.keys(pendingRequestsByRequester).length === 0) return null;
    return (
      <div className="flex flex-col gap-3">
        {Object.entries(pendingRequestsByRequester).map(
          ([requesterId, reqs]) => (
            <div
              key={requesterId}
              className="flex items-center justify-between"
            >
              {/* <div className="flex items-center gap-2"> */}
              <div className="flex flex-row items-center gap-0 -ml-2">
                <HandRaisedIcon className="w-5 h-5 -rotate-30 translate-y-0.5 translate-x-1" />
                <div className="hover:opacity-80 cursor-pointer">
                  {renderUserLabel(
                    reqs[0]?.requester_id &&
                      currentUser?.id === reqs[0].requester_id
                      ? currentUser?.user_metadata?.name || "Unknown"
                      : requestersInfo[requesterId]?.name || requesterId,
                    reqs[0]?.requester_id &&
                      currentUser?.id === reqs[0].requester_id
                      ? currentUser?.user_metadata?.avatar_url || null
                      : requestersInfo[requesterId]?.avatar_url || null,
                    true,
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
                variant="primary"
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
          <div className="flex flex-row items-center gap-2">
            <IssueAssigneeSelector
              issueId={issueData.id}
              initialAssignee={issueData.assignee}
              assigneeUser={issueData.assignee_user}
              currentUser={currentUser}
              contributors={contributors}
              onAssigneeChange={handleAssigneeChange}
              readOnly={!canEdit}
              onRequestAssignment={() => setIsRequestModalOpen(true)}
            />
            {(() => {
              const meId = currentUser?.id ? String(currentUser.id) : null;
              const hasPendingByMe = !!(
                meId &&
                pendingRequestsByRequester[meId] &&
                pendingRequestsByRequester[meId].length > 0
              );
              const canRequest = !canEdit && !!currentUser && !hasPendingByMe;
              if (!currentUser || canEdit) return null;
              if (canRequest) {
                return (
                  <Button
                    size="xs"
                    variant="primary"
                    onClick={() => setIsRequestModalOpen(true)}
                  >
                    <div className="flex flex-row items-center gap-1">
                      <HandRaisedIcon className="w-4 h-4 -rotate-30" />
                      <p>Own this</p>
                    </div>
                  </Button>
                );
              }
            })()}
          </div>

          {(() => {
            const requesterIds = Object.keys(pendingRequestsByRequester);
            if (requesterIds.length === 0) return null;
            const max = 5;
            const shown = requesterIds.slice(0, max);
            const rest = requesterIds.length - shown.length;
            return (
              <div className="flex flex-row items-center gap-0 -ml-1">
                <HandRaisedIcon className="w-5 h-5 -rotate-30 translate-y-0.5 translate-x-1" />
                <div className="flex -space-x-1">
                  {shown.map((id) => {
                    const info = requestersInfo[id];
                    const name = info?.name || id;
                    const avatar = info?.avatar_url || "";
                    return avatar ? (
                      <Image
                        key={id}
                        src={avatar}
                        alt={name}
                        width={22}
                        height={22}
                        className="w-[22px] h-[22px] rounded-full border border-white dark:border-black"
                      />
                    ) : (
                      <div
                        key={id}
                        className="w-[22px] h-[22px] rounded-full bg-gray-200 dark:bg-gray-700 border border-white dark:border-black flex items-center justify-center text-[9px] text-gray-600 dark:text-gray-300"
                        title={name}
                      >
                        {name.slice(0, 1).toUpperCase()}
                      </div>
                    );
                  })}
                  {rest > 0 ? (
                    <div className="w-[22px] h-[22px] rounded-full bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 text-xs font-medium">
                      +{rest}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })()}
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
              canEdit={canEdit}
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
              <div className="flex flex-row items-center justify-between gap-2">
                <IssueAssigneeSelector
                  issueId={issueData.id}
                  initialAssignee={issueData.assignee}
                  assigneeUser={issueData.assignee_user}
                  currentUser={currentUser}
                  contributors={contributors}
                  onAssigneeChange={handleAssigneeChange}
                  readOnly={!canEdit}
                  onRequestAssignment={() => setIsRequestModalOpen(true)}
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
                        variant="primary"
                        onClick={() => setIsRequestModalOpen(true)}
                      >
                        <div className="flex flex-row items-center gap-1">
                          <HandRaisedIcon className="w-4 h-4 -rotate-30" />
                          <p>Own this</p>
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
                {(() => {
                  const creatorId = issueData.created_by
                    ? String(issueData.created_by)
                    : null;
                  if (creatorId) {
                    const creator = contributors.find(
                      (c) => String(c.user_id) === creatorId
                    );
                    if (creator) {
                      return renderUserLabel(
                        creator.name,
                        creator.avatar_url,
                        true,
                        creator.email
                      );
                    }
                    // fallback to currentUser only if same as creatorId
                    if (currentUser && String(currentUser.id) === creatorId) {
                      return renderUserLabel(
                        currentUser.user_metadata?.name || "Unknown",
                        currentUser.user_metadata?.avatar_url || null,
                        true,
                        currentUser.email || null
                      );
                    }
                  }
                  return renderUserLabel("Unknown", null, true, null);
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Assignment Request Modal */}
      <Modal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        size="sm"
      >
        <div className="p-5">
          <div className="text-lg font-semibold mb-6 text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <div className="flex flex-row items-center gap-0 -ml-2">
              <HandRaisedIcon className="w-5 h-5 -rotate-30 translate-y-0.5 translate-x-1" />
              {currentUser?.user_metadata?.avatar_url ? (
                <Image
                  src={currentUser.user_metadata.avatar_url}
                  alt={currentUser.user_metadata?.name || "User"}
                  width={28}
                  height={28}
                  className="w-5 h-5 rounded-full"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-gray-300 dark:bg-gray-600 border border-gray-300 dark:border-gray-700 flex items-center justify-center text-xs text-gray-700 dark:text-gray-300">
                  {(
                    currentUser?.user_metadata?.name ||
                    currentUser?.email ||
                    "U"
                  )
                    .slice(0, 1)
                    .toUpperCase()}
                </div>
              )}
            </div>
            <span>Request to be assigned</span>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold">Message (optional)</label>
            <textarea
              className="w-full min-h-[32px] rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 outline-none"
              placeholder="Leave a message"
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
            />
            <div className="flex flex-row flex-wrap gap-2 mt-1">
              {[
                "I can do this.",
                "I will finish it.",
                "I like this idea.",
                "I want to fix it.",
              ].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setRequestMessage(t)}
                  className="px-2 py-1 text-sm rounded-md bg-gray-100 dark:bg-gray-900 hover:cursor-pointer"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsRequestModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={async () => {
                try {
                  await requestAssignmentToEditorsAction(
                    issueId,
                    requestMessage.trim() ? requestMessage.trim() : null
                  );
                  setIsRequestModalOpen(false);
                  setRequestMessage("");
                  await reloadPendingRequests();
                } catch (e) {
                  console.error(e);
                }
              }}
            >
              Send
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
