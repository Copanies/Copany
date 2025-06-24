"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import MilkdownEditor from "@/components/MilkdownEditor";
import ContextMenu, { ContextMenuItem } from "@/components/ContextMenu";
import {
  createIssueAction,
  deleteIssueAction,
  getIssuesAction,
} from "@/actions/issue.actions";
import { Issue } from "@/app/database.types";

export default function IssueSubTabView({ copanyId }: { copanyId: string }) {
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
  // 加载 issues 的函数
  const loadIssues = useCallback(async () => {
    try {
      setIsLoading(true);
      const issuesData = await getIssuesAction(copanyId);
      setIssues(issuesData);
      console.log("issues", issuesData);
    } catch (error) {
      console.error("Error loading issues:", error);
    } finally {
      setIsLoading(false);
    }
  }, [copanyId]);

  // 组件挂载时加载数据
  useEffect(() => {
    loadIssues();
  }, [loadIssues]);

  // 处理 issue 创建完成后的回调
  const handleIssueCreated = useCallback(() => {
    loadIssues();
  }, [loadIssues]);

  // 处理删除 issue
  const handleDeleteIssue = useCallback(
    async (issueId: string) => {
      try {
        await deleteIssueAction(issueId);
        loadIssues(); // 重新加载列表
        setContextMenu({ show: false, x: 0, y: 0, issueId: "" }); // 关闭菜单
      } catch (error) {
        console.error("Error deleting issue:", error);
      }
    },
    [loadIssues]
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
    <div className="h-full flex flex-col gap-3">
      {/* 顶部操作栏 */}
      <div className="flex flex-col justify-between items-center mx-4 py-3 px-16 rounded-md border border-[#E7E7E7] dark:border-[#333333]">
        <div className="font-bold">👋 Want to contribute to Copany?</div>
        <div className="">
          If you have a bug or an idea, read the contributing guidelines before
          opening an issue.
        </div>
        <div className="">
          If you're interested in any of the issues below, reach out to the
          issue owner to discuss collaboration.
        </div>
      </div>

      <button
        onClick={() => setIsModalOpen(true)}
        className="cursor-pointer w-[100px] mx-4 px-2 py-1 rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 border-1 border-gray-300"
      >
        New Issue
      </button>

      {/* Issues 列表 */}
      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <div className="text-gray-500 dark:text-gray-400">Loading...</div>
        </div>
      ) : (
        <div className="relative">
          {issues.map((issue) => (
            <div key={issue.id} className="">
              <div
                className="text-md text-gray-900 dark:text-gray-100 py-2 px-4 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                onContextMenu={(e) => handleContextMenu(e, issue.id)}
                onClick={() =>
                  router.push(`/copany/${copanyId}/issue/${issue.id}`)
                }
              >
                {issue.title}
              </div>
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
  onIssueCreated: () => void;
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
      await createIssueAction({
        copany_id: copanyId,
        title: title,
        description: description,
        state: 0,
      });

      // 重置表单
      setTitle("");
      setDescription("");
      if (formRef.current) {
        formRef.current.reset();
      }

      // 通知父组件刷新数据并关闭弹窗
      onIssueCreated();
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
            className="w-full bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 focus:border-0 focus:outline-none focus:ring-0 focus:ring-blue-500 text-xl font-semibold"
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
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            Cancell
          </button>
          <button
            type="submit"
            disabled={isSubmitting || title.length === 0}
            className={`px-4 py-2 text-sm font-medium text-white dark:text-gray-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
              isSubmitting
                ? "bg-[#383633] dark:bg-[#383633] cursor-not-allowed"
                : "bg-[#383633] dark:bg-[#383633] hover:bg-[#4a4a4a] dark:hover:bg-[#4a4a4a]"
            }`}
          >
            {isSubmitting ? "Creating..." : "Create Issue"}
          </button>
        </div>
      </form>
    </div>
  );
}
