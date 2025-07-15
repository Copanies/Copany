"use client";
import { useState, useRef, useEffect, useCallback } from "react";
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
  issuesManager,
  currentUserManager,
  contributorsManager,
} from "@/utils/cache";
import IssueLevelSelector from "@/components/IssueLevelSelector";
import IssueCreateForm from "@/components/IssueCreateForm";
import { User } from "@supabase/supabase-js";

// 按状态分组的函数
function groupIssuesByState(issues: IssueWithAssignee[]) {
  const grouped = issues.reduce((acc, issue) => {
    let state = issue.state || IssueState.Backlog;

    // 将 Duplicate 状态合并到 Canceled 分组
    if (state === IssueState.Duplicate) {
      state = IssueState.Canceled;
    }

    if (!acc[state]) {
      acc[state] = [];
    }
    acc[state].push(issue);
    return acc;
  }, {} as Record<number, IssueWithAssignee[]>);

  // 优先级排序函数：Urgent > High > Medium > Low > None
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

  // 按状态顺序排序
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
      issues: grouped[state].sort(sortByPriority), // 在每个状态组内按优先级排序
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

  // 添加共享的用户和贡献者状态
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [contributors, setContributors] = useState<CopanyContributor[]>([]);

  const router = useRouter();
  const searchParams = useSearchParams();
  const hasInitialLoadRef = useRef(false);

  // 获取用户和贡献者数据的函数
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

  // 使用新的 SWR 策略加载 Issues
  const loadIssues = useCallback(async () => {
    if (hasInitialLoadRef.current) return;
    hasInitialLoadRef.current = true;

    try {
      setIsLoading(true);

      // 使用 SWR 策略：立即返回缓存 + 后台更新
      const issuesData = await issuesManager.getIssues(copanyId, () =>
        getIssuesAction(copanyId)
      );

      setIssues(issuesData);
    } catch (error) {
      console.error("Error loading issues:", error);
    } finally {
      setIsLoading(false);
    }
  }, [copanyId]);

  // 组件挂载时加载数据
  useEffect(() => {
    loadIssues();
    loadUserData();
  }, [loadIssues, loadUserData]);

  // 处理 issue 创建完成后的回调
  const handleIssueCreated = useCallback(
    (newIssue: IssueWithAssignee) => {
      setIssues((prevIssues) => {
        const updatedIssues = [...prevIssues, newIssue];
        // 更新 issues 列表缓存
        issuesManager.setIssues(copanyId, updatedIssues);
        return updatedIssues;
      });
    },
    [copanyId]
  );

  // 处理 issue 状态更新后的回调
  const handleIssueStateUpdated = useCallback(
    (issueId: string, newState: number) => {
      setIssues((prevIssues) => {
        const updatedIssues = prevIssues.map((issue) => {
          if (issue.id === issueId) {
            const updatedIssue = {
              ...issue,
              state: newState,
            };
            // 同时更新单个 issue 缓存
            issuesManager.updateIssue(copanyId, updatedIssue);
            return updatedIssue;
          }
          return issue;
        });
        // 更新 issues 列表缓存
        issuesManager.setIssues(copanyId, updatedIssues);
        return updatedIssues;
      });
    },
    [copanyId]
  );

  // 处理 issue 优先级更新后的回调
  const handleIssuePriorityUpdated = useCallback(
    (issueId: string, newPriority: number) => {
      setIssues((prevIssues) => {
        const updatedIssues = prevIssues.map((issue) => {
          if (issue.id === issueId) {
            const updatedIssue = {
              ...issue,
              priority: newPriority,
            };
            // 同时更新单个 issue 缓存
            issuesManager.updateIssue(copanyId, updatedIssue);
            return updatedIssue;
          }
          return issue;
        });
        return updatedIssues;
      });
    },
    [copanyId]
  );

  // 处理 issue 等级更新后的回调
  const handleIssueLevelUpdated = useCallback(
    (issueId: string, newLevel: number) => {
      setIssues((prevIssues) => {
        const updatedIssues = prevIssues.map((issue) => {
          if (issue.id === issueId) {
            const updatedIssue = {
              ...issue,
              level: newLevel,
            };
            // 同时更新单个 issue 缓存
            issuesManager.updateIssue(copanyId, updatedIssue);
            return updatedIssue;
          }
          return issue;
        });
        return updatedIssues;
      });
    },
    [copanyId]
  );

  // 处理 issue assignee 更新后的回调
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
            // 同时更新单个 issue 缓存
            issuesManager.updateIssue(copanyId, updatedIssue);
            return updatedIssue;
          }
          return issue;
        });
        return updatedIssues;
      });
    },
    [copanyId]
  );

  // 处理删除 issue
  const handleDeleteIssue = useCallback(
    async (issueId: string) => {
      try {
        // 先从前端移除
        setIssues((prevIssues) => {
          const updatedIssues = prevIssues.filter(
            (issue) => issue.id !== issueId
          );
          // 更新 issues 列表缓存
          issuesManager.setIssues(copanyId, updatedIssues);
          return updatedIssues;
        });
        setContextMenu({ show: false, x: 0, y: 0, issueId: "" }); // 关闭菜单

        // 然后调用删除接口
        await deleteIssueAction(issueId);
      } catch (error) {
        console.error("Error deleting issue:", error);
        // 如果删除失败，重新加载数据恢复状态
        const issuesData = await issuesManager.getIssues(copanyId, () =>
          getIssuesAction(copanyId)
        );
        setIssues(issuesData);
      }
    },
    [copanyId]
  );

  // 处理右键菜单
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

  // 关闭右键菜单
  const handleCloseContextMenu = useCallback(() => {
    setContextMenu({ show: false, x: 0, y: 0, issueId: "" });
  }, []);

  // 创建菜单项
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
        <Button
          onClick={() => setIsModalOpen(true)}
          className="w-[100px]"
          size="sm"
        >
          New Issue
        </Button>
      </div>
      <div className="relative">
        {groupIssuesByState(issues).map((group) => (
          <div key={group.state} className="">
            {/* 分组标题 */}
            <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 border-y border-gray-200 dark:border-gray-700">
              <div className="flex flex-row items-center gap-2">
                {group.label}
                <span className="text-base text-gray-600 dark:text-gray-400">
                  {group.issues.length}
                </span>
              </div>
            </div>

            {/* 该状态下的 issues */}
            {group.issues.map((issue) => (
              <div
                className="flex flex-row items-center gap-2 py-2 px-4 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer"
                key={issue.id}
                onClick={() => {
                  // 保留当前的 URL 参数
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

        {/* 右键菜单 */}
        <ContextMenu
          show={contextMenu.show}
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={handleCloseContextMenu}
        />
      </div>
      {/* 创建 Issue 弹窗 */}
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
