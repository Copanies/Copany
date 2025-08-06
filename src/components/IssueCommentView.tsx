"use client";

import { useState, useEffect, useCallback } from "react";
import { IssueComment } from "@/types/database.types";
import {
  getIssueCommentsAction,
  createIssueCommentAction,
  updateIssueCommentAction,
  deleteIssueCommentAction,
} from "@/actions/issueComment.actions";
import { getUsersByIdsAction, UserInfo } from "@/actions/user.actions";
import MilkdownEditor from "@/components/MilkdownEditor";
import MilkdownView from "@/components/MilkdownView";
import { ArrowUpIcon, ArrowTurnUpLeftIcon } from "@heroicons/react/24/outline";
import Button from "@/components/commons/Button";
import Dropdown from "@/components/commons/Dropdown";
import Image from "next/image";
import EllipsisHorizontalIcon from "@heroicons/react/24/outline/EllipsisHorizontalIcon";

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
  const [userInfoMap, setUserInfoMap] = useState<Record<string, UserInfo>>({});
  const [hoveredCommentId, setHoveredCommentId] = useState<string | null>(null);
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(
    null
  );
  const [replyContent, setReplyContent] = useState("");

  // 格式化相对时间
  const formatRelativeTime = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return "just now";
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} min ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hr ago`;
    } else if (diffInSeconds < 2592000) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day ago`;
    } else if (diffInSeconds < 31536000) {
      const months = Math.floor(diffInSeconds / 2592000);
      return `${months} mo ago`;
    } else {
      const years = Math.floor(diffInSeconds / 31536000);
      return `${years} yr ago`;
    }
  };

  // 构建评论树结构 - 所有子评论平铺显示
  const buildCommentTree = (comments: IssueComment[]) => {
    const rootComments: IssueComment[] = [];
    const allReplies: IssueComment[] = [];

    // 分离根评论和所有回复
    comments.forEach((comment) => {
      if (comment.parent_id) {
        allReplies.push(comment);
      } else {
        rootComments.push(comment);
      }
    });

    // 按时间排序所有回复
    allReplies.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    return { rootComments, allReplies };
  };

  // Load comments
  const loadComments = useCallback(async () => {
    try {
      setIsLoading(true);
      const commentsData = await getIssueCommentsAction(issueId);
      setComments(commentsData);

      // 获取所有评论创建者的用户信息
      const userIds = [
        ...new Set(commentsData.map((comment) => comment.created_by)),
      ];
      if (userIds.length > 0) {
        const users = await getUsersByIdsAction(userIds);
        setUserInfoMap(users);
      }
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

  // Start replying to comment
  const handleStartReply = useCallback((commentId: string) => {
    setReplyingToCommentId(commentId);
    setReplyContent("");
  }, []);

  // Cancel reply
  const handleCancelReply = useCallback(() => {
    setReplyingToCommentId(null);
    setReplyContent("");
  }, []);

  // Submit reply
  const handleSubmitReply = useCallback(async () => {
    if (!replyingToCommentId || !replyContent.trim()) return;

    try {
      setIsSubmitting(true);
      const newReply = await createIssueCommentAction(
        issueId,
        replyContent,
        replyingToCommentId
      );
      setComments((prev) => [...prev, newReply]);
      setReplyingToCommentId(null);
      setReplyContent("");
    } catch (error) {
      console.error("Error creating reply:", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [issueId, replyingToCommentId, replyContent]);

  // 处理评论操作
  const handleCommentAction = useCallback(
    (comment: IssueComment, action: number) => {
      switch (action) {
        case 1: // Edit
          handleStartEdit(comment);
          break;
        case 2: // Delete
          handleDeleteComment(comment.id);
          break;
        default:
          break;
      }
    },
    [handleStartEdit, handleDeleteComment]
  );

  // 渲染用户头像和姓名
  const renderUserInfo = (userId: string) => {
    const userInfo = userInfoMap[userId];

    if (!userInfo) {
      return (
        <div className="flex items-center space-x-1">
          <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300">
            U
          </div>
          <span className="text-sm text-gray-500 text-center">
            Unknown User
          </span>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-1">
        {userInfo.avatar_url ? (
          <Image
            src={userInfo.avatar_url}
            alt={userInfo.name}
            width={20}
            height={20}
            className="w-5 h-5 rounded-full"
          />
        ) : (
          <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300">
            {userInfo.name[0]?.toUpperCase() || "U"}
          </div>
        )}
        <span className="text-base font-medium text-gray-900 dark:text-gray-100 text-center">
          {userInfo.name}
        </span>
      </div>
    );
  };

  if (isLoading) {
    return <div className="p-4">Loading comments...</div>;
  }

  const { rootComments, allReplies } = buildCommentTree(comments);

  return (
    <div className="space-y-4 px-3">
      {/* Comments list */}
      <div className="space-y-4">
        {rootComments.map((comment) => {
          const commentReplies = allReplies.filter((reply) => {
            // 检查回复是否属于这个根评论（包括间接回复）
            let currentParentId = reply.parent_id;
            while (currentParentId) {
              if (currentParentId === comment.id) {
                return true;
              }
              // 找到当前回复的父评论
              const parentReply = allReplies.find(
                (r) => r.id === currentParentId
              );
              if (!parentReply) break;
              currentParentId = parentReply.parent_id;
            }
            return false;
          });

          return (
            <div
              key={comment.id}
              className="flex flex-col gap-0 border border-gray-200 dark:border-gray-700 rounded-lg"
            >
              {/* Root comment content */}
              <div
                className="flex flex-col gap-0 group"
                onMouseEnter={(e) => {
                  e.stopPropagation();
                  setHoveredCommentId(comment.id);
                }}
                onMouseLeave={(e) => {
                  e.stopPropagation();
                  setHoveredCommentId(null);
                }}
              >
                <div className="flex justify-between items-start px-4 pt-3 ">
                  <div className="flex items-center space-x-2">
                    {renderUserInfo(comment.created_by)}
                    <div className="text-sm text-gray-500 text-center">
                      {formatRelativeTime(comment.created_at)}
                      {comment.is_edited && " (edited)"}
                    </div>
                  </div>
                  <div
                    className={`flex flex-row gap-2 transition-opacity duration-200 ${
                      hoveredCommentId === comment.id
                        ? "opacity-100"
                        : "opacity-0"
                    }`}
                  >
                    <Button
                      onClick={() => handleStartReply(comment.id)}
                      variant="ghost"
                      size="sm"
                      shape="square"
                      className="!p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      <ArrowTurnUpLeftIcon className="w-4 h-4" />
                    </Button>

                    <Dropdown
                      trigger={
                        <div className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md p-1 -m-1 cursor-pointer">
                          <EllipsisHorizontalIcon className="w-5 h-5" />
                        </div>
                      }
                      options={[
                        { value: 1, label: "Edit" },
                        { value: 2, label: "Delete" },
                      ]}
                      selectedValue={null}
                      onSelect={(value) => handleCommentAction(comment, value)}
                      showBackground={false}
                      size="md"
                    />
                  </div>
                </div>
                {editingCommentId === comment.id ? (
                  <div>
                    <div className="">
                      <MilkdownEditor
                        onContentChange={setEditingContent}
                        initialContent={comment.content}
                        isFullScreen={false}
                      />
                    </div>
                    <div className="flex space-x-2 justify-end px-4 pb-3">
                      <Button
                        onClick={handleCancelEdit}
                        className=""
                        variant="ghost"
                        size="sm"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSaveEdit}
                        disabled={isSubmitting}
                        className=""
                        size="sm"
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="prose prose-sm px-1 -mb-1 -mt-2">
                    <MilkdownView content={comment.content} />
                  </div>
                )}
              </div>

              {/* Render replies */}
              {commentReplies.length > 0 && (
                <div className="border-t pb-2 border-gray-200 dark:border-gray-700">
                  <div className="space-y-0">
                    {commentReplies.map((reply) => (
                      <div
                        key={reply.id}
                        className="group"
                        onMouseEnter={(e) => {
                          e.stopPropagation();
                          setHoveredCommentId(reply.id);
                        }}
                        onMouseLeave={(e) => {
                          e.stopPropagation();
                          setHoveredCommentId(null);
                        }}
                      >
                        <div className="flex justify-between items-start px-4 pt-3">
                          <div className="flex items-center space-x-2">
                            {renderUserInfo(reply.created_by)}

                            {reply.parent_id &&
                              reply.parent_id !== comment.id && (
                                <div className="flex items-center space-x-1">
                                  <ArrowTurnUpLeftIcon className="w-4 h-4" />
                                  <div className="text-sm font-medium">
                                    @
                                    {userInfoMap[
                                      commentReplies.find(
                                        (r) => r.id === reply.parent_id
                                      )?.created_by ?? ""
                                    ]?.name || "Unknown User"}
                                  </div>
                                </div>
                              )}
                            <div className="text-sm text-gray-500 text-center">
                              {formatRelativeTime(reply.created_at)}
                              {reply.is_edited && " (edited)"}
                            </div>
                          </div>
                          <div
                            className={`flex flex-row gap-2 transition-opacity duration-200 ${
                              hoveredCommentId === reply.id
                                ? "opacity-100"
                                : "opacity-0"
                            }`}
                          >
                            <Button
                              onClick={() => handleStartReply(reply.id)}
                              variant="ghost"
                              size="sm"
                              shape="square"
                              className="!p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                              <ArrowTurnUpLeftIcon className="w-4 h-4" />
                            </Button>
                            <Dropdown
                              trigger={
                                <div className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md p-1 -m-1 cursor-pointer">
                                  <EllipsisHorizontalIcon className="w-5 h-5" />
                                </div>
                              }
                              options={[
                                { value: 1, label: "Edit" },
                                { value: 2, label: "Delete" },
                              ]}
                              selectedValue={null}
                              onSelect={(value) =>
                                handleCommentAction(reply, value)
                              }
                              showBackground={false}
                              size="md"
                            />
                          </div>
                        </div>

                        {editingCommentId === reply.id ? (
                          <div>
                            <div className="pl-7 -mb-1 -mt-2">
                              <MilkdownEditor
                                onContentChange={setEditingContent}
                                initialContent={reply.content}
                                isFullScreen={false}
                                placeholder=""
                              />
                            </div>
                            <div className="flex space-x-2 justify-end px-3 pb-3">
                              <Button
                                onClick={handleCancelEdit}
                                className=""
                                variant="ghost"
                                size="sm"
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={handleSaveEdit}
                                disabled={isSubmitting}
                                className=""
                                size="sm"
                              >
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="prose prose-sm pl-7 -mb-1 -mt-2">
                            <MilkdownView content={reply.content} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reply input */}
              {(replyingToCommentId === comment.id ||
                commentReplies
                  .map((reply) => reply.id)
                  .includes(replyingToCommentId ?? "")) && (
                <div className="border-t border-gray-200 dark:border-gray-700">
                  <div className="h-fit p-1">
                    <MilkdownEditor
                      key={replyingToCommentId} // 添加 key 来强制重新渲染
                      onContentChange={setReplyContent}
                      initialContent=""
                      isFullScreen={false}
                      placeholder={
                        replyingToCommentId === comment.id
                          ? "Write a reply..."
                          : `Reply to @${
                              userInfoMap[
                                commentReplies.find(
                                  (r) => r.id === replyingToCommentId
                                )?.created_by ?? ""
                              ]?.name || "Unknown User"
                            }...`
                      }
                    />
                    <div className="flex space-x-2 justify-end p-2">
                      <Button
                        onClick={handleCancelReply}
                        className=""
                        variant="ghost"
                        size="sm"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSubmitReply}
                        disabled={isSubmitting || !replyContent.trim()}
                        className=""
                        size="sm"
                      >
                        Reply
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* New comment input */}
      <div className="border rounded-lg border-gray-200 dark:border-gray-700 flex flex-col h-fit">
        <div className="h-fit p-1">
          <MilkdownEditor
            onContentChange={setNewCommentContent}
            initialContent=""
            isFullScreen={false}
            placeholder="Leave a comment..."
          />
        </div>
        <div className="flex justify-end p-2">
          <Button
            onClick={handleSubmitComment}
            disabled={isSubmitting || !newCommentContent.trim()}
            shape="square"
            size="sm"
            className="!p-1"
          >
            <ArrowUpIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
