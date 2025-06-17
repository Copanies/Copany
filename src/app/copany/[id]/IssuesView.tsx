"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import "@milkdown/theme-nord/style.css";
import { createIssue, getAllIssues } from "@/services/copanyFuncs";
import Modal from "@/components/commons/Modal";
import MilkdownEditor from "@/components/commons/MilkdownEditor";

export default function IssuesView({ copanyId }: { copanyId: number }) {
  const [issues, setIssues] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 加载 issues 的函数
  const loadIssues = useCallback(async () => {
    try {
      setIsLoading(true);
      const issuesData = await getAllIssues(copanyId);
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

  return (
    <div>
      {/* 顶部操作栏 */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Issues
        </h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="cursor-pointer rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 border-1 border-gray-300 px-2"
        >
          Create Issue
        </button>
      </div>

      {/* Issues 列表 */}
      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <div className="text-gray-500 dark:text-gray-400">Loading...</div>
        </div>
      ) : (
        <div className="">
          {issues.map((issue) => (
            <div key={issue.id} className="">
              <div className="text-md text-gray-900 dark:text-gray-100 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                {issue.title}
              </div>
            </div>
          ))}
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
  copanyId: number;
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
      const formData = new FormData(e.currentTarget);

      // 从编辑器获取内容
      let editorContent = "";
      if (editorDivRef.current && (editorDivRef.current as any).getContent) {
        editorContent = (editorDivRef.current as any).getContent();
      }

      await createIssue({
        copany_id: copanyId,
        title: formData.get("title") as string,
        description: description,
        url: "",
        state: "",
        created_by_id: "",
        closed_at: "",
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
            <MilkdownEditor onContentChange={handleContentChange} />
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
