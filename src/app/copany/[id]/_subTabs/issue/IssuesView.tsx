"use client";
import { Suspense } from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Modal from "@/components/commons/Modal";
import ContextMenu, { ContextMenuItem } from "@/components/commons/ContextMenu";
import {
  IssueWithAssignee,
  IssuePriority,
  IssueState,
  AssigneeUser,
} from "@/types/database.types";
import IssueStateSelector from "@/app/copany/[id]/_subTabs/issue/_components/IssueStateSelector";
import IssuePrioritySelector from "@/app/copany/[id]/_subTabs/issue/_components/IssuePrioritySelector";
import IssueAssigneeSelector from "@/app/copany/[id]/_subTabs/issue/_components/IssueAssigneeSelector";
import Button from "@/components/commons/Button";
import LoadingView from "@/components/commons/LoadingView";
import { renderStateLabel } from "@/app/copany/[id]/_subTabs/issue/_components/IssueStateSelector";
import EmptyPlaceholderView from "@/components/commons/EmptyPlaceholderView";
import { InboxStackIcon, PlusIcon } from "@heroicons/react/24/outline";
import IssueLevelSelector from "@/app/copany/[id]/_subTabs/issue/_components/IssueLevelSelector";
import IssueCreateForm from "@/app/copany/[id]/_subTabs/issue/_components/IssueCreateForm";
import type { IssueReviewer } from "@/types/database.types";
import { CheckIcon } from "@heroicons/react/20/solid";
import { HandRaisedIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import { shimmerDataUrlWithTheme } from "@/utils/shimmer";
import { useDarkMode } from "@/utils/useDarkMode";
import type { AssignmentRequest } from "@/types/database.types";
import { EMPTY_ARRAY, EMPTY_REVIEWERS_OBJECT } from "@/utils/constants";

import AssignmentRequestModal from "@/app/copany/[id]/_subTabs/issue/_components/AssignmentRequestModal";
import { useIssues, useDeleteIssue } from "@/hooks/issues";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/currentUser";
import { useContributors } from "@/hooks/contributors";

import { useAssignmentRequestsByCopany } from "@/hooks/assignmentRequests";
import { useUsersInfo } from "@/hooks/userInfo";
import { useCopany } from "@/hooks/copany";
import { useMultipleIssueReviewers } from "@/hooks/reviewers";
import { issuesUiStateManager } from "@/utils/cache";
import {
  EMPTY_STRING,
  EMPTY_ISSUES_ARRAY,
  EMPTY_CONTRIBUTORS_ARRAY,
  EMPTY_ASSIGNMENT_REQUESTS_ARRAY,
  EMPTY_USER_INFOS_OBJECT,
  EMPTY_CAN_EDIT_BY_ISSUE,
  EMPTY_REVIEWERS_BY_ISSUE,
  EMPTY_PENDING_REQUESTERS_BY_ISSUE,
  EMPTY_ISSUE_DATA,
  NO_TITLE_TEXT,
} from "@/utils/constants";

// Function to group issues by state
function groupIssuesByState(issues: IssueWithAssignee[]) {
  const grouped = issues.reduce((acc, issue) => {
    let state = issue.state || IssueState.Backlog;

    // Merge Duplicate state into Canceled group
    if (state === IssueState.Duplicate) {
      state = IssueState.Canceled;
    }

    if (!acc[state]) {
      acc[state] = [];
    }
    acc[state].push(issue);
    return acc;
  }, {} as Record<number, IssueWithAssignee[]>);

  // Priority sorting function: Urgent > High > Medium > Low > None
  const sortByPriority = (a: IssueWithAssignee, b: IssueWithAssignee) => {
    const priorityOrder: Record<number, number> = {
      [IssuePriority.Urgent]: 0,
      [IssuePriority.High]: 1,
      [IssuePriority.Medium]: 2,
      [IssuePriority.Low]: 3,
      [IssuePriority.None]: 4,
    };

    const aPriority = a.priority ?? IssuePriority.None;
    const bPriority = b.priority ?? IssuePriority.None;

    return priorityOrder[aPriority] - priorityOrder[bPriority];
  };

  // For Done / Canceled (including Duplicate merged) groups, sort by closed_at desc
  const sortByClosedAtDesc = (a: IssueWithAssignee, b: IssueWithAssignee) => {
    const aTime = a.closed_at ? new Date(a.closed_at).getTime() : 0;
    const bTime = b.closed_at ? new Date(b.closed_at).getTime() : 0;
    return bTime - aTime;
  };

  // Sort by state order
  const stateOrder = [
    IssueState.InReview,
    IssueState.InProgress,
    IssueState.Todo,
    IssueState.Backlog,
    IssueState.Done,
    IssueState.Canceled,
  ];

  return stateOrder
    .filter((state) => grouped[state] && grouped[state].length > 0)
    .map((state) => ({
      state,
      label: renderStateLabel(state, true, true),
      issues:
        state === IssueState.Done || state === IssueState.Canceled
          ? grouped[state].slice().sort(sortByClosedAtDesc)
          : grouped[state].slice().sort(sortByPriority),
    }));
}

export default function IssuesView({ copanyId }: { copanyId: string }) {
  const isDarkMode = useDarkMode();
  const { data: issuesData, isLoading: isIssuesLoading } = useIssues(copanyId);
  const issues = issuesData || EMPTY_ISSUES_ARRAY;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState<string>("");
  const [contextMenu, setContextMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
    issueId: string;
  }>({ show: false, x: 0, y: 0, issueId: "" });

  // React Query hooks for data fetching
  const { data: currentUser } = useCurrentUser();
  const { data: contributors = EMPTY_CONTRIBUTORS_ARRAY } =
    useContributors(copanyId);
  const { data: assignmentRequests = EMPTY_ASSIGNMENT_REQUESTS_ARRAY } =
    useAssignmentRequestsByCopany(copanyId);
  const { data: copany } = useCopany(copanyId);

  // Local state for UI
  const [canEditByIssue, setCanEditByIssue] = useState<Record<string, boolean>>(
    EMPTY_CAN_EDIT_BY_ISSUE
  );

  // cache reviewers per issue for lightweight list indicators
  const [reviewersByIssue, setReviewersByIssue] = useState<
    Record<string, IssueReviewer[]>
  >(EMPTY_REVIEWERS_BY_ISSUE);

  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const deleteIssue = useDeleteIssue(copanyId);

  // Search query state synced with URL ?q=
  const [searchQuery, setSearchQuery] = useState<string>(
    searchParams.get("q") ?? EMPTY_STRING
  );
  useEffect(() => {
    setSearchQuery(searchParams.get("q") ?? EMPTY_STRING);
  }, [searchParams]);

  // Collapsible group states via cache manager
  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<number, boolean>
  >(() => issuesUiStateManager.getCollapsedGroups(copanyId));

  const toggleGroupCollapse = useCallback(
    (state: number) => {
      setCollapsedGroups((prev) => {
        const next = { ...prev, [state]: !prev[state] } as Record<
          number,
          boolean
        >;
        issuesUiStateManager.setCollapsedGroups(copanyId, next);
        return next;
      });
    },
    [copanyId]
  );

  // When copanyId changes, reload UI state from cache (CSR only)
  useEffect(() => {
    setCollapsedGroups(issuesUiStateManager.getCollapsedGroups(copanyId));
  }, [copanyId]);

  // Compute per-issue permissions for current list
  useEffect(() => {
    try {
      if (!currentUser || !copany) {
        setCanEditByIssue(EMPTY_CAN_EDIT_BY_ISSUE);
        return;
      }

      const uid = String(currentUser.id);
      const ownerId = copany.created_by ? String(copany.created_by) : null;

      const map: Record<string, boolean> = {};
      for (const issue of issues) {
        const isCreator = !!(
          issue.created_by && String(issue.created_by) === uid
        );
        const isAssignee = !!(issue.assignee && String(issue.assignee) === uid);
        const isOwner = !!(ownerId && ownerId === uid);
        map[String(issue.id)] = isCreator || isAssignee || isOwner;
      }
      setCanEditByIssue(map);
    } catch (_) {
      // ignore
    }
  }, [issues, currentUser, copany]);

  // Filtered issues by search query
  const filteredIssues = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return issues;
    return issues.filter((issue) => {
      const title = (issue.title || "").toLowerCase();
      const idStr = String(issue.id || "");
      return title.includes(q) || idStr.includes(q);
    });
  }, [issues, searchQuery]);

  // Compute pending requesters by issue from assignment requests data
  const pendingRequestersByIssue = useMemo(() => {
    if (!assignmentRequests || assignmentRequests.length === 0)
      return EMPTY_PENDING_REQUESTERS_BY_ISSUE;

    const byIssue: Record<string, AssignmentRequest[]> = {};
    for (const request of assignmentRequests) {
      const key = String(request.issue_id);
      if (!byIssue[key]) byIssue[key] = [];
      byIssue[key].push(request);
    }

    const result: Record<string, string[]> = {};
    for (const [issueId, requests] of Object.entries(byIssue)) {
      const byRequester = new Map<string, AssignmentRequest[]>();
      const sorted = [...requests].sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      for (const request of sorted) {
        const key = String(request.requester_id);
        if (!byRequester.has(key)) byRequester.set(key, []);
        byRequester.get(key)!.push(request);
      }

      const inProgress: string[] = [];
      for (const [requesterId, items] of byRequester.entries()) {
        // Without status, any existing items mean in-progress requests by this requester
        if (items.length > 0) inProgress.push(requesterId);
      }

      result[issueId] = inProgress;
    }

    return result;
  }, [assignmentRequests]);

  // Get unique user IDs from pending requesters for user info
  const pendingRequesterIds = useMemo(() => {
    const ids = new Set<string>();
    for (const requesterIds of Object.values(pendingRequestersByIssue)) {
      for (const id of requesterIds) {
        ids.add(id);
      }
    }
    return Array.from(ids);
  }, [pendingRequestersByIssue]);

  // Fetch user info for pending requesters
  const { data: requestersInfo = EMPTY_USER_INFOS_OBJECT } =
    useUsersInfo(pendingRequesterIds);

  // Get issue IDs that need reviewers data
  const issueIdsNeedingReviewers = useMemo(() => {
    return filteredIssues
      .filter((it) => it.state === IssueState.InReview)
      .map((it) => String(it.id));
  }, [filteredIssues]);

  // Fetch reviewers data for all InReview issues
  const { data: reviewersData = EMPTY_REVIEWERS_OBJECT } =
    useMultipleIssueReviewers(issueIdsNeedingReviewers);

  // Update local state when reviewers data changes
  useEffect(() => {
    if (Object.keys(reviewersData).length > 0) {
      setReviewersByIssue((prev) => ({
        ...prev,
        ...reviewersData,
      }));
    }
  }, [reviewersData]);

  const renderReviewBadge = (issue: IssueWithAssignee) => {
    if (issue.state !== IssueState.InReview) return null;
    const list = reviewersByIssue[String(issue.id)] || EMPTY_ARRAY;
    if (list.length === 0) return null;
    const meId = currentUser?.id ? String(currentUser.id) : null;
    const hasApproved = list.some((r) => r.status === "approved");
    const needsMyReview = !!(
      meId &&
      list.some(
        (r) => String(r.reviewer_id) === meId && r.status === "requested"
      )
    );
    if (hasApproved) {
      return (
        <div className="flex flex-row items-center gap-1">
          <CheckIcon className="w-4 h-4 text-[#058E00]" />
          <span className="text-gray-500 dark:text-gray-400 hidden md:block">
            approved
          </span>
        </div>
      );
    } else if (needsMyReview) {
      return (
        <div className="flex flex-row items-center gap-1">
          <div className="w-4 h-4 flex items-center justify-center">
            <div className="w-1 h-1 rounded-full bg-yellow-600" />
          </div>
          <span className="text-gray-500 dark:text-gray-400 hidden md:block">
            needs your review
          </span>
        </div>
      );
    } else {
      return null;
    }
  };

  const renderAssignmentRequestBadge = (issueId: string) => {
    const reqIds = pendingRequestersByIssue[String(issueId)] || EMPTY_ARRAY;
    if (!reqIds || reqIds.length === 0) return null;
    const max = 2;
    const shown = reqIds.slice(0, max);
    const rest = reqIds.length - shown.length;
    return (
      <div className="flex flex-row items-center gap-0 -ml-1">
        <HandRaisedIcon className="w-[18px] h-[18px] -rotate-30 translate-y-0.5 translate-x-1" />
        <div className="flex -space-x-2">
          {shown.map((id) => {
            const info = requestersInfo[id];
            const name = info?.name || "";
            const avatar = info?.avatar_url || "";
            return avatar ? (
              <Image
                key={id}
                src={avatar}
                alt={name}
                width={22}
                height={22}
                className="w-[22px] h-[22px] rounded-full border border-white dark:border-black"
                placeholder="blur"
                blurDataURL={shimmerDataUrlWithTheme(22, 22, isDarkMode)}
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
  };

  // Handle issue creation callback
  const handleIssueCreated = useCallback(
    (newIssue: IssueWithAssignee) => {
      queryClient.setQueryData<IssueWithAssignee[]>(
        ["issues", copanyId],
        (prev) => {
          const base = prev || EMPTY_ISSUES_ARRAY;
          const exists = base.some(
            (it) => String(it.id) === String(newIssue.id)
          );
          return exists
            ? base.map((it) =>
                String(it.id) === String(newIssue.id) ? newIssue : it
              )
            : [...base, newIssue];
        }
      );
    },
    [copanyId, queryClient]
  );

  // Handle issue state update callback
  const handleIssueStateUpdated = useCallback(
    (issueId: string, newState: number) => {
      queryClient.setQueryData<IssueWithAssignee[]>(
        ["issues", copanyId],
        (prev) => {
          const base = prev || EMPTY_ISSUES_ARRAY;
          return base.map((issue) =>
            String(issue.id) === String(issueId)
              ? { ...issue, state: newState }
              : issue
          );
        }
      );
    },
    [copanyId, queryClient]
  );

  // Handle issue priority update callback
  const handleIssuePriorityUpdated = useCallback(
    (issueId: string, newPriority: number) => {
      queryClient.setQueryData<IssueWithAssignee[]>(
        ["issues", copanyId],
        (prev) => {
          const base = prev || EMPTY_ISSUES_ARRAY;
          return base.map((issue) =>
            String(issue.id) === String(issueId)
              ? { ...issue, priority: newPriority }
              : issue
          );
        }
      );
    },
    [copanyId, queryClient]
  );

  // Handle issue level update callback
  const handleIssueLevelUpdated = useCallback(
    (issueId: string, newLevel: number) => {
      queryClient.setQueryData<IssueWithAssignee[]>(
        ["issues", copanyId],
        (prev) => {
          const base = prev || EMPTY_ISSUES_ARRAY;
          return base.map((issue) =>
            String(issue.id) === String(issueId)
              ? { ...issue, level: newLevel }
              : issue
          );
        }
      );
    },
    [copanyId, queryClient]
  );

  // Handle issue assignee update callback
  const handleIssueAssigneeUpdated = useCallback(
    (
      issueId: string,
      newAssignee: string | null,
      assigneeUser: AssigneeUser | null
    ) => {
      queryClient.setQueryData<IssueWithAssignee[]>(
        ["issues", copanyId],
        (prev) => {
          const base = prev || EMPTY_ISSUES_ARRAY;
          return base.map((issue) =>
            String(issue.id) === String(issueId)
              ? { ...issue, assignee: newAssignee, assignee_user: assigneeUser }
              : issue
          );
        }
      );
    },
    [copanyId, queryClient]
  );

  // Handle issue deletion
  const handleDeleteIssue = useCallback(
    async (issueId: string) => {
      try {
        await deleteIssue.mutateAsync({ issueId });
        setContextMenu({ show: false, x: 0, y: 0, issueId: "" });
      } catch (error) {
        console.error("Error deleting issue:", error);
        try {
          await queryClient.invalidateQueries({
            queryKey: ["issues", copanyId],
          });
        } catch (_) {}
      }
    },
    [copanyId, queryClient, deleteIssue]
  );

  // Handle right-click menu
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, issueId: string) => {
      e.preventDefault();
      setContextMenu({
        show: true,
        x: e.clientX,
        y: e.clientY,
        issueId,
      });
    },
    []
  );

  // Close right-click menu
  const handleCloseContextMenu = useCallback(() => {
    setContextMenu({ show: false, x: 0, y: 0, issueId: "" });
  }, []);

  // Create menu items
  const contextMenuItems: ContextMenuItem[] = [
    {
      label: "Delete Issue",
      onClick: () => handleDeleteIssue(contextMenu.issueId),
      className: "text-gray-900 dark:text-gray-100",
    },
  ];

  if (isIssuesLoading) {
    return <LoadingView type="label" />;
  }

  if (issues.length === 0) {
    return (
      <div>
        <EmptyPlaceholderView
          icon={
            <InboxStackIcon
              className="w-16 h-16 text-gray-500 dark:text-gray-400"
              strokeWidth={1}
            />
          }
          title="Add first issue"
          description="Issues are the smallest task units in Copany and form the foundation of contributions. By completing an Issue, members earn corresponding contribution points. Each Issue has its own priority, status, and contribution level."
          buttonIcon={<PlusIcon className="w-4 h-4" />}
          buttonTitle="New Issue"
          buttonAction={() => setIsModalOpen(true)}
          buttonDisabled={!currentUser}
          buttonTooltip="Sign in to create an issue"
        />
        {createIssueModal()}
      </div>
    );
  }

  const newIssueButton = () => {
    return (
      <Button
        onClick={() => setIsModalOpen(true)}
        className="min-w-fit"
        size="md"
        disabled={!currentUser}
        disableTooltipConent="Sign in to create an issue"
      >
        <div className="flex flex-row items-center gap-1">
          <span className="text-base">New Issue</span>
        </div>
      </Button>
    );
  };

  return (
    <div className="min-h-screen w-full min-w-0 flex flex-col gap-3">
      <div className="flex w-full min-w-0 items-center justify-between px-0 gap-3">
        {newIssueButton()}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            const value = e.target.value;
            setSearchQuery(value);
            const params = new URLSearchParams(searchParams.toString());
            if (value.trim()) {
              params.set("q", value);
            } else {
              params.delete("q");
            }
            const qs = params.toString();
            // Keep on the same path and update only query string
            router.replace(qs ? `?${qs}` : "?");
          }}
          placeholder="Search issues"
          className="border border-gray-300 dark:border-gray-700 rounded-md px-2 py-1 w-56 max-w-full shrink min-w-24 bg-transparent dark:text-gray-100 text-base"
        />
      </div>
      <Suspense
        fallback={<LoadingView type="label" label="Loading issues..." />}
      >
        <div className="relative w-full min-w-0">
          {groupIssuesByState(filteredIssues).map((group) => (
            <div key={group.state} className="w-full min-w-0">
              {/* Group title (click to toggle collapse) */}
              <div
                className="px-3 md:px-4 py-2 bg-gray-100 dark:bg-gray-800 border-y border-gray-200 dark:border-gray-700 cursor-pointer select-none"
                onClick={() => toggleGroupCollapse(group.state)}
              >
                <div className="flex flex-row items-center gap-2">
                  {group.label}
                  <span className="text-base text-gray-600 dark:text-gray-400">
                    {group.issues.length}
                  </span>
                </div>
              </div>

              {/* Issues in this state (hidden when collapsed) */}
              {!collapsedGroups[group.state] &&
                group.issues.map((issue) => {
                  const readOnly = !(canEditByIssue[String(issue.id)] ?? false);
                  return (
                    <div
                      className="flex w-full min-w-0 flex-row items-center gap-2 py-2 px-3 md:px-4 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer select-none"
                      key={issue.id}
                      onClick={() => {
                        // Keep current URL parameters
                        const params = new URLSearchParams(
                          searchParams.toString()
                        );
                        router.push(
                          `/copany/${copanyId}/issue/${
                            issue.id
                          }?${params.toString()}`
                        );
                      }}
                      onContextMenu={(e) => handleContextMenu(e, issue.id)}
                    >
                      <IssueStateSelector
                        issueId={issue.id}
                        initialState={issue.state}
                        showText={false}
                        readOnly={readOnly}
                        onStateChange={handleIssueStateUpdated}
                        onServerUpdated={(serverIssue) => {
                          queryClient.setQueryData<IssueWithAssignee[]>(
                            ["issues", copanyId],
                            (prev) => {
                              const base = prev || EMPTY_ISSUES_ARRAY;
                              return base.map((it) =>
                                String(it.id) === String(serverIssue.id)
                                  ? serverIssue
                                  : it
                              );
                            }
                          );
                        }}
                      />
                      <IssuePrioritySelector
                        issueId={issue.id}
                        initialPriority={issue.priority}
                        showText={false}
                        onPriorityChange={handleIssuePriorityUpdated}
                        readOnly={readOnly}
                      />
                      <div className="text-base text-gray-900 dark:text-gray-100 text-left flex-1 min-w-0 flex items-center gap-2">
                        <span className="truncate">
                          {issue.title || NO_TITLE_TEXT}
                        </span>
                        {renderReviewBadge(issue)}
                      </div>
                      {renderAssignmentRequestBadge(String(issue.id))}
                      <IssueLevelSelector
                        issueId={issue.id}
                        initialLevel={issue.level}
                        showText={false}
                        onLevelChange={handleIssueLevelUpdated}
                        readOnly={readOnly}
                      />
                      <IssueAssigneeSelector
                        issueId={issue.id}
                        initialAssignee={issue.assignee}
                        assigneeUser={issue.assignee_user}
                        currentUser={currentUser}
                        contributors={contributors}
                        showText={false}
                        onAssigneeChange={handleIssueAssigneeUpdated}
                        readOnly={readOnly}
                        disableServerUpdate={false}
                        hasPendingByMe={(() => {
                          const meId = currentUser?.id
                            ? String(currentUser.id)
                            : null;
                          if (!meId) return false;
                          const reqIds =
                            pendingRequestersByIssue[String(issue.id)] ||
                            EMPTY_ARRAY;
                          return reqIds.includes(meId);
                        })()}
                        onRequestAssignment={() => {
                          setSelectedIssueId(String(issue.id));
                          setIsRequestModalOpen(true);
                        }}
                      />
                    </div>
                  );
                })}
            </div>
          ))}

          {/* Right-click menu */}
          <ContextMenu
            show={contextMenu.show}
            x={contextMenu.x}
            y={contextMenu.y}
            items={contextMenuItems}
            onClose={handleCloseContextMenu}
          />
        </div>
      </Suspense>
      {/* Create Issue modal */}
      {createIssueModal()}

      {/* Assignment Request Modal */}
      <AssignmentRequestModal
        isOpen={isRequestModalOpen}
        onClose={() => {
          setIsRequestModalOpen(false);
          setSelectedIssueId("");
        }}
        issueId={selectedIssueId}
        copanyId={copanyId}
        currentUser={currentUser || null}
      />
    </div>
  );

  function createIssueModal() {
    return (
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        size="lg"
      >
        <IssueCreateForm
          copanyId={copanyId}
          onIssueCreated={handleIssueCreated}
          onClose={() => setIsModalOpen(false)}
          currentUser={currentUser || EMPTY_ISSUE_DATA}
          contributors={contributors}
        />
      </Modal>
    );
  }
}
