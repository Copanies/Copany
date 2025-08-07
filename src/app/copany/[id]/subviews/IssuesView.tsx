"use client";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Modal from "@/components/commons/Modal";
import ContextMenu, { ContextMenuItem } from "@/components/commons/ContextMenu";
import { deleteIssueAction, getIssuesAction } from "@/actions/issue.actions";
import {
  IssueWithAssignee,
  IssuePriority,
  IssueState,
  CopanyContributor,
  AssigneeUser,
} from "@/types/database.types";
import IssueStateSelector from "@/components/IssueStateSelector";
import IssuePrioritySelector from "@/components/IssuePrioritySelector";
import IssueAssigneeSelector from "@/components/IssueAssigneeSelector";
import Button from "@/components/commons/Button";
import LoadingView from "@/components/commons/LoadingView";
import { renderStateLabel } from "@/components/IssueStateSelector";
import EmptyPlaceholderView from "@/components/commons/EmptyPlaceholderView";
import { InboxStackIcon, PlusIcon } from "@heroicons/react/24/outline";
import {
  currentUserManager,
  contributorsManager,
  IssuesManager,
} from "@/utils/cache";
import IssueLevelSelector from "@/components/IssueLevelSelector";
import IssueCreateForm from "@/components/IssueCreateForm";
import { User } from "@supabase/supabase-js";

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

  // Sort by state order
  const stateOrder = [
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
      issues: grouped[state].sort(sortByPriority), // Sort by priority within each state group
    }));
}

export default function IssuesView({ copanyId }: { copanyId: string }) {
  const [issues, setIssues] = useState<IssueWithAssignee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
    issueId: string;
  }>({ show: false, x: 0, y: 0, issueId: "" });

  // Add shared user and contributor status
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [contributors, setContributors] = useState<CopanyContributor[]>([]);

  const router = useRouter();
  const searchParams = useSearchParams();
  const hasInitialLoadRef = useRef(false);

  // Create IssuesManager instance with data update callback
  const issuesManagerWithCallback = useMemo(() => {
    return new IssuesManager((key, updatedData) => {
      console.log(
        `[IssuesView] Background refresh completed, data updated: ${key}`,
        updatedData
      );
      setIssues(updatedData); // 自动更新 UI
    });
  }, []);

  // Function to load user and contributor data
  const loadUserData = useCallback(async () => {
    try {
      const [user, contributorList] = await Promise.all([
        currentUserManager.getCurrentUser(),
        contributorsManager.getContributors(copanyId),
      ]);

      setCurrentUser(user);
      setContributors(contributorList);
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  }, [copanyId]);

  // Use new SWR strategy to load Issues
  const loadIssues = useCallback(async () => {
    if (hasInitialLoadRef.current) return;
    hasInitialLoadRef.current = true;

    try {
      setIsLoading(true);

      // Use IssuesManager with callback, support background refresh to automatically update UI
      const issuesData = await issuesManagerWithCallback.getIssues(
        copanyId,
        () => getIssuesAction(copanyId)
      );

      setIssues(issuesData);
    } catch (error) {
      console.error("Error loading issues:", error);
    } finally {
      setIsLoading(false);
    }
  }, [copanyId, issuesManagerWithCallback]);

  // Load data when component mounts
  useEffect(() => {
    loadIssues();
    loadUserData();
  }, [loadIssues, loadUserData]);

  // Handle issue creation callback
  const handleIssueCreated = useCallback(
    (newIssue: IssueWithAssignee) => {
      setIssues((prevIssues) => {
        const updatedIssues = [...prevIssues, newIssue];
        // Update issues list cache
        issuesManagerWithCallback.setIssues(copanyId, updatedIssues);
        return updatedIssues;
      });
    },
    [copanyId, issuesManagerWithCallback]
  );

  // Handle issue state update callback
  const handleIssueStateUpdated = useCallback(
    (issueId: string, newState: number) => {
      setIssues((prevIssues) => {
        const updatedIssues = prevIssues.map((issue) => {
          if (issue.id === issueId) {
            const updatedIssue = {
              ...issue,
              state: newState,
            };
            // Update single issue cache
            issuesManagerWithCallback.updateIssue(copanyId, updatedIssue);
            return updatedIssue;
          }
          return issue;
        });
        // Update issues list cache
        issuesManagerWithCallback.setIssues(copanyId, updatedIssues);
        return updatedIssues;
      });
    },
    [copanyId, issuesManagerWithCallback]
  );

  // Handle issue priority update callback
  const handleIssuePriorityUpdated = useCallback(
    (issueId: string, newPriority: number) => {
      setIssues((prevIssues) => {
        const updatedIssues = prevIssues.map((issue) => {
          if (issue.id === issueId) {
            const updatedIssue = {
              ...issue,
              priority: newPriority,
            };
            // Update single issue cache
            issuesManagerWithCallback.updateIssue(copanyId, updatedIssue);
            return updatedIssue;
          }
          return issue;
        });
        return updatedIssues;
      });
    },
    [copanyId, issuesManagerWithCallback]
  );

  // Handle issue level update callback
  const handleIssueLevelUpdated = useCallback(
    (issueId: string, newLevel: number) => {
      setIssues((prevIssues) => {
        const updatedIssues = prevIssues.map((issue) => {
          if (issue.id === issueId) {
            const updatedIssue = {
              ...issue,
              level: newLevel,
            };
            // Update single issue cache
            issuesManagerWithCallback.updateIssue(copanyId, updatedIssue);
            return updatedIssue;
          }
          return issue;
        });
        return updatedIssues;
      });
    },
    [copanyId, issuesManagerWithCallback]
  );

  // Handle issue assignee update callback
  const handleIssueAssigneeUpdated = useCallback(
    (
      issueId: string,
      newAssignee: string | null,
      assigneeUser: AssigneeUser | null
    ) => {
      setIssues((prevIssues) => {
        const updatedIssues = prevIssues.map((issue) => {
          if (issue.id === issueId) {
            const updatedIssue = {
              ...issue,
              assignee: newAssignee,
              assignee_user: assigneeUser,
            };
            // Update single issue cache
            issuesManagerWithCallback.updateIssue(copanyId, updatedIssue);
            return updatedIssue;
          }
          return issue;
        });
        return updatedIssues;
      });
    },
    [copanyId, issuesManagerWithCallback]
  );

  // Handle issue deletion
  const handleDeleteIssue = useCallback(
    async (issueId: string) => {
      try {
        // Remove from frontend first
        setIssues((prevIssues) => {
          const updatedIssues = prevIssues.filter(
            (issue) => issue.id !== issueId
          );
          // Update issues list cache
          issuesManagerWithCallback.setIssues(copanyId, updatedIssues);
          return updatedIssues;
        });
        setContextMenu({ show: false, x: 0, y: 0, issueId: "" }); // Close menu

        // Then call delete interface
        await deleteIssueAction(issueId);
      } catch (error) {
        console.error("Error deleting issue:", error);
        // If deletion fails, reload data to restore state
        const issuesData = await issuesManagerWithCallback.getIssues(
          copanyId,
          () => getIssuesAction(copanyId)
        );
        setIssues(issuesData);
      }
    },
    [copanyId, issuesManagerWithCallback]
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

  if (isLoading) {
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
        />
        {createIssueModal()}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col gap-3">
      <div className="flex items-center justify-between md:px-4 px-0">
        <Button onClick={() => setIsModalOpen(true)} className="" size="md">
          New Issue
        </Button>
      </div>
      <div className="relative">
        {groupIssuesByState(issues).map((group) => (
          <div key={group.state} className="">
            {/* Group title */}
            <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 border-y border-gray-200 dark:border-gray-700">
              <div className="flex flex-row items-center gap-2">
                {group.label}
                <span className="text-base text-gray-600 dark:text-gray-400">
                  {group.issues.length}
                </span>
              </div>
            </div>

            {/* Issues in this state */}
            {group.issues.map((issue) => (
              <div
                className="flex flex-row items-center gap-2 py-2 px-4 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer"
                key={issue.id}
                onClick={() => {
                  // Keep current URL parameters
                  const params = new URLSearchParams(searchParams.toString());
                  router.push(
                    `/copany/${copanyId}/issue/${issue.id}?${params.toString()}`
                  );
                }}
                onContextMenu={(e) => handleContextMenu(e, issue.id)}
              >
                <IssueStateSelector
                  issueId={issue.id}
                  initialState={issue.state}
                  showText={false}
                  onStateChange={handleIssueStateUpdated}
                />
                <IssuePrioritySelector
                  issueId={issue.id}
                  initialPriority={issue.priority}
                  showText={false}
                  onPriorityChange={handleIssuePriorityUpdated}
                />
                <div className="text-base text-gray-900 dark:text-gray-100 text-left flex-1 w-full">
                  {issue.title || "No title"}
                </div>
                <IssueLevelSelector
                  issueId={issue.id}
                  initialLevel={issue.level}
                  showText={false}
                  onLevelChange={handleIssueLevelUpdated}
                />
                <IssueAssigneeSelector
                  issueId={issue.id}
                  initialAssignee={issue.assignee}
                  assigneeUser={issue.assignee_user}
                  currentUser={currentUser}
                  contributors={contributors}
                  showText={false}
                  onAssigneeChange={handleIssueAssigneeUpdated}
                />
              </div>
            ))}
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
      {/* Create Issue modal */}
      {createIssueModal()}
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
          currentUser={currentUser}
          contributors={contributors}
        />
      </Modal>
    );
  }
}
