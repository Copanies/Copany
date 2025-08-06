"use client";

import { useState, useEffect, useCallback } from "react";
import { IssueComment } from "@/types/database.types";
import {
  getIssueCommentsAction,
  createIssueCommentAction,
  updateIssueCommentAction,
  deleteIssueCommentAction,
} from "@/actions/issue.actions";
import MilkdownEditor from "@/components/MilkdownEditor";
import MilkdownView from "@/components/MilkdownView";

interface IssueCommentViewProps {
  issueId: string;
}

export default function IssueCommentView({ issueId }: IssueCommentViewProps) {
  const [comments, setComments] = useState<IssueComment[]>([]);
  const [newCommentContent, setNewCommentContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");

  // Load comments
  const loadComments = useCallback(async () => {
    try {
      setIsLoading(true);
      const commentsData = await getIssueCommentsAction(issueId);
      setComments(commentsData);
    } catch (error) {
      console.error("Error loading comments:", error);
    } finally {
      setIsLoading(false);
    }
  }, [issueId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  // Submit new comment
  const handleSubmitComment = useCallback(async () => {
    if (!newCommentContent.trim()) return;

    try {
      setIsSubmitting(true);
      const newComment = await createIssueCommentAction(
        issueId,
        newCommentContent
      );
      setComments((prev) => [...prev, newComment]);
      setNewCommentContent("");
    } catch (error) {
      console.error("Error creating comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [issueId, newCommentContent]);

  // Start editing comment
  const handleStartEdit = useCallback((comment: IssueComment) => {
    setEditingCommentId(comment.id);
    setEditingContent(comment.content);
  }, []);

  // Cancel editing
  const handleCancelEdit = useCallback(() => {
    setEditingCommentId(null);
    setEditingContent("");
  }, []);

  // Save edited comment
  const handleSaveEdit = useCallback(async () => {
    if (!editingCommentId || !editingContent.trim()) return;

    try {
      setIsSubmitting(true);
      const updatedComment = await updateIssueCommentAction(
        editingCommentId,
        editingContent
      );
      setComments((prev) =>
        prev.map((comment) =>
          comment.id === editingCommentId ? updatedComment : comment
        )
      );
      setEditingCommentId(null);
      setEditingContent("");
    } catch (error) {
      console.error("Error updating comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [editingCommentId, editingContent]);

  // Delete comment
  const handleDeleteComment = useCallback(async (commentId: string) => {
    try {
      await deleteIssueCommentAction(commentId);
      setComments((prev) => prev.filter((comment) => comment.id !== commentId));
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  }, []);

  if (isLoading) {
    return <div className="p-4">Loading comments...</div>;
  }

  return (
    <div className="space-y-4">
      {/* New comment input */}
      <div className="border rounded-lg p-4">
        <div className="mb-2">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Add a comment
          </h3>
        </div>
        <div className="min-h-[100px]">
          <MilkdownEditor
            onContentChange={setNewCommentContent}
            initialContent=""
            isFullScreen={false}
          />
        </div>
        <div className="mt-2 flex justify-end">
          <button
            onClick={handleSubmitComment}
            disabled={isSubmitting || !newCommentContent.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? "Posting..." : "Post Comment"}
          </button>
        </div>
      </div>

      {/* Comments list */}
      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="border rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <div className="text-sm text-gray-500">
                {comment.created_by} •{" "}
                {new Date(comment.created_at).toLocaleString()}
                {comment.is_edited && " (edited)"}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleStartEdit(comment)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteComment(comment.id)}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </div>
            </div>

            {editingCommentId === comment.id ? (
              <div>
                <div className="min-h-[100px] mb-2">
                  <MilkdownEditor
                    onContentChange={setEditingContent}
                    initialContent={comment.content}
                    isFullScreen={false}
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleSaveEdit}
                    disabled={isSubmitting}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="prose prose-sm max-w-none">
                <MilkdownView content={comment.content} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
