"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Modal from "@/components/commons/Modal";
import MilkdownEditor from "@/components/MilkdownEditor";
import ContextMenu, { ContextMenuItem } from "@/components/commons/ContextMenu";
import {
  createIssueAction,
  deleteIssueAction,
  getIssuesAction,
} from "@/actions/issue.actions";
import {
  Issue,
  IssueLevel,
  IssuePriority,
  IssueState,
} from "@/types/database.types";
import IssueStateSelector from "@/components/IssueStateSelector";
import IssuePrioritySelector from "@/components/IssuePrioritySelector";
import Button from "@/components/commons/Button";
import LoadingView from "@/components/commons/LoadingView";
import { renderStateLabel } from "@/components/IssueStateSelector";
import { issuesCache, unifiedIssueCache } from "@/utils/cache";
import IssueLevelSelector from "@/components/IssueLevelSelector";

// 按状态分组的函数
function groupIssuesByState(issues: Issue[]) {
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
  }, {} as Record<number, Issue[]>);

  // 优先级排序函数：Urgent > High > Medium > Low > None
  const sortByPriority = (a: Issue, b: Issue) => {
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
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
    issueId: string;
  }>({ show: false, x: 0, y: 0, issueId: "" });
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasInitialLoadRef = useRef(false);
  const hasMountedRef = useRef(false);

  // 静默刷新函数
  const silentRefreshIssues = useCallback(async () => {
    try {
      const issuesData = await getIssuesAction(copanyId);
      setIssues(issuesData);
      // 更新缓存
      issuesCache.set(copanyId, issuesData);
    } catch (error) {
      console.error("Error refreshing issues:", error);
    }
  }, [copanyId]);

  // 客户端挂载后检查缓存
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      console.log(`[IssuesView] 📱 Client mounted, checking cache...`);

      // 尝试从缓存读取数据
      const cachedData = issuesCache.get(copanyId);
      if (cachedData) {
        console.log(
          `[IssuesView] 💾 Using cached data: ${cachedData.length} issues`
        );
        setIssues(cachedData);
        setIsLoading(false);
        // 有缓存数据时，延迟执行静默刷新
        setTimeout(() => {
          silentRefreshIssues();
        }, 500);
      } else {
        console.log(`[IssuesView] 🚫 No cache available`);
      }
    }
  }, [copanyId, silentRefreshIssues]);

  // 加载 issues 的函数
  const loadIssues = useCallback(async () => {
    try {
      setIsLoading(true);
      const issuesData = await getIssuesAction(copanyId);
      setIssues(issuesData);
      // 更新缓存
      issuesCache.set(copanyId, issuesData);
      console.log(
        `[IssuesView] 💾 Cached ${issuesData.length} issues for copany: ${copanyId}`
      );
      console.log(
        `[IssuesView] 📋 Issue IDs:`,
        issuesData.map((issue) => issue.id)
      );
    } catch (error) {
      console.error("Error loading issues:", error);
    } finally {
      setIsLoading(false);
    }
  }, [copanyId]);

  // 组件挂载时加载数据
  useEffect(() => {
    if (!hasInitialLoadRef.current && hasMountedRef.current) {
      hasInitialLoadRef.current = true;

      // 如果没有缓存数据，立即加载
      const cachedData = issuesCache.get(copanyId);
      if (!cachedData) {
        loadIssues();
      }

      // 设置定时静默刷新
      const interval = setInterval(() => {
        silentRefreshIssues();
      }, 30000); // 每30秒静默刷新一次

      return () => clearInterval(interval);
    }
  }, [loadIssues, silentRefreshIssues, copanyId]);

  // 处理 issue 创建完成后的回调
  const handleIssueCreated = useCallback(
    (newIssue: Issue) => {
      setIssues((prevIssues) => {
        const updatedIssues = [...prevIssues, newIssue];
        // 更新 issues 列表缓存
        issuesCache.set(copanyId, updatedIssues);
        return updatedIssues;
      });
      // 同时缓存新创建的 issue
      unifiedIssueCache.setIssue(copanyId, newIssue);
    },
    [copanyId]
  );

  // 处理 issue 状态更新后的回调
  const handleIssueStateUpdated = useCallback(
    (issueId: string, newState: number) => {
      setIssues((prevIssues) => {
        const updatedIssues = prevIssues.map((issue) => {
          if (issue.id === issueId) {
            const updatedIssue = { ...issue, state: newState };
            // 同时更新单个 issue 缓存
            unifiedIssueCache.setIssue(copanyId, updatedIssue);
            return updatedIssue;
          }
          return issue;
        });
        // 更新 issues 列表缓存
        issuesCache.set(copanyId, updatedIssues);
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
            const updatedIssue = { ...issue, priority: newPriority };
            // 同时更新单个 issue 缓存
            unifiedIssueCache.setIssue(copanyId, updatedIssue);
            return updatedIssue;
          }
          return issue;
        });
        // 更新 issues 列表缓存
        issuesCache.set(copanyId, updatedIssues);
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
            const updatedIssue = { ...issue, level: newLevel };
            // 同时更新单个 issue 缓存
            unifiedIssueCache.setIssue(copanyId, updatedIssue);
            return updatedIssue;
          }
          return issue;
        });
        // 更新 issues 列表缓存
        issuesCache.set(copanyId, updatedIssues);
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
          issuesCache.set(copanyId, updatedIssues);
          return updatedIssues;
        });
        // 清除单个 issue 缓存
        unifiedIssueCache.removeIssue(copanyId, issueId);
        setContextMenu({ show: false, x: 0, y: 0, issueId: "" }); // 关闭菜单

        // 然后调用删除接口
        await deleteIssueAction(issueId);
      } catch (error) {
        console.error("Error deleting issue:", error);
        // 如果删除失败，重新加载数据恢复状态
        loadIssues();
      }
    },
    [copanyId, loadIssues]
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
      className: "text-gray-700 dark:text-gray-300",
    },
  ];

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

      {/* Issues 列表 */}
      {isLoading ? (
        <LoadingView type="label" />
      ) : (
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
                    console.log(
                      `[IssuesView] 🖱️ Clicking issue: ${issue.id} (${issue.title})`
                    );

                    // 智能缓存策略：比较数据新旧程度
                    unifiedIssueCache.smartSetIssue(copanyId, issue);

                    // 保留当前的 URL 参数
                    const params = new URLSearchParams(searchParams.toString());
                    router.push(
                      `/copany/${copanyId}/issue/${
                        issue.id
                      }?${params.toString()}`
                    );
                  }}
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
                  <div
                    className="text-base text-gray-900 dark:text-gray-100 text-left flex-1 w-full"
                    onContextMenu={(e) => handleContextMenu(e, issue.id)}
                  >
                    {issue.title}
                  </div>
                  {issue.level != IssueLevel.level_None &&
                    issue.level != null && (
                      <IssueLevelSelector
                        issueId={issue.id}
                        initialLevel={issue.level}
                        showText={false}
                        onLevelChange={handleIssueLevelUpdated}
                      />
                    )}
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
      )}

      {/* 创建 Issue 弹窗 */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <IssueForm
          copanyId={copanyId}
          onIssueCreated={handleIssueCreated}
          onClose={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
}

// Issue 表单组件
function IssueForm({
  copanyId,
  onIssueCreated,
  onClose,
}: {
  copanyId: string;
  onIssueCreated: (newIssue: Issue) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const editorDivRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // 使用 useCallback 稳定函数引用
  const handleContentChange = useCallback((content: string) => {
    console.log("content", content);
    setDescription(content);
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      const newIssue = await createIssueAction({
        copany_id: copanyId,
        title: title,
        description: description,
        state: IssueState.Backlog,
        priority: IssuePriority.None,
        level: IssueLevel.level_None,
      });

      // 重置表单
      setTitle("");
      setDescription("");
      if (formRef.current) {
        formRef.current.reset();
      }

      // 通知父组件刷新数据并关闭弹窗
      onIssueCreated(newIssue);
      onClose();
    } catch (error) {
      console.error("Error creating issue:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-2">
        <div>
          <input
            type="text"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-transparent px-3 py-2 text-gray-900 dark:text-gray-100 focus:border-0 focus:outline-none focus:ring-0 focus:ring-blue-500 text-xl font-semibold"
            required
            disabled={isSubmitting}
            placeholder="Issue title"
          />
        </div>

        <div>
          <div ref={editorDivRef}>
            <MilkdownEditor
              onContentChange={handleContentChange}
              isFullScreen={false}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="submit"
            disabled={isSubmitting || title.length === 0}
            variant="primary"
          >
            {isSubmitting ? "Creating..." : "Create Issue"}
          </Button>
        </div>
      </form>
    </div>
  );
}
