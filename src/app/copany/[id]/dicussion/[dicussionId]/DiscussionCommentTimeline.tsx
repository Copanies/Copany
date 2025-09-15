"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  useDiscussionComments,
  useCreateDiscussionComment,
  useUpdateDiscussionComment,
  useDeleteDiscussionComment,
} from "@/hooks/discussionComments";
import type { DiscussionComment } from "@/types/database.types";
import { formatRelativeTime } from "@/utils/time";
import { useUsersInfo } from "@/hooks/userInfo";
import { useCurrentUser } from "@/hooks/currentUser";
import { ArrowUpIcon, ArrowTurnUpLeftIcon } from "@heroicons/react/24/outline";
import { EllipsisHorizontalIcon } from "@heroicons/react/24/outline";
import Button from "@/components/commons/Button";
import Dropdown from "@/components/commons/Dropdown";
import MilkdownEditor from "@/components/MilkdownEditor";
import { EMPTY_ARRAY, EMPTY_OBJECT, EMPTY_STRING } from "@/utils/constants";

interface DiscussionCommentTimelineProps {
  discussionId: string;
  canEdit: boolean;
}

interface CommentCardProps {
  comment: DiscussionComment;
  replies: DiscussionComment[];
  userInfos: Record<
    string,
    { name: string; email: string; avatar_url: string }
  >;
  editingCommentId: string | null;
  setEditingCommentId: (id: string | null) => void;
  editingContent: string;
  setEditingContent: (content: string) => void;
  replyingToCommentId: string | null;
  setReplyingToCommentId: (id: string | null) => void;
  replyContent: string;
  setReplyContent: (content: string) => void;
  hoveredCommentId: string | null;
  setHoveredCommentId: (id: string | null) => void;
  onSubmitReply: (parentId: string, content: string) => Promise<void>;
  onSaveEdit: (commentId: string, content: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  isSubmitting: boolean;
  isLoggedIn: boolean;
}

function CommentCard({
  comment,
  replies,
  userInfos,
  editingCommentId,
  setEditingCommentId,
  editingContent,
  setEditingContent,
  replyingToCommentId,
  setReplyingToCommentId,
  replyContent,
  setReplyContent,
  hoveredCommentId,
  setHoveredCommentId,
  onSubmitReply,
  onSaveEdit,
  onDelete,
  isSubmitting,
  isLoggedIn,
}: CommentCardProps) {
  const { data: currentUser } = useCurrentUser();
  const currentUserId = currentUser?.id ?? null;
  const [openMenuCommentId, setOpenMenuCommentId] = useState<string | null>(
    null
  );

  const author = comment.created_by ? userInfos[comment.created_by] : undefined;

  return (
    <div className="flex flex-col gap-0">
      {/* Root comment header */}
      <div
        className="flex justify-between items-start group"
        onMouseEnter={() => setHoveredCommentId(String(comment.id))}
        onMouseLeave={() => {
          if (openMenuCommentId !== String(comment.id)) {
            setHoveredCommentId(null);
          }
        }}
      >
        <div className="flex items-center space-x-2">
          {author?.avatar_url ? (
            <>
              <Image
                src={author.avatar_url}
                alt={author.name || "User"}
                width={32}
                height={32}
                className="w-8 h-8 rounded-full"
              />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {author.name}
              </span>
            </>
          ) : (
            <>
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-600 dark:text-gray-300">
                {(author?.name || "U")[0]?.toUpperCase()}
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {author?.name || "Unknown User"}
              </span>
            </>
          )}
          <div className="text-sm text-gray-500">
            {formatRelativeTime(comment.created_at)}
          </div>
        </div>

        {/* Actions */}
        <div
          className={`flex flex-row gap-2 transition-opacity duration-200 ${
            hoveredCommentId === String(comment.id) ||
            openMenuCommentId === String(comment.id)
              ? "opacity-100"
              : "opacity-0"
          }`}
        >
          {isLoggedIn ? (
            <Button
              onClick={() => setReplyingToCommentId(String(comment.id))}
              variant="ghost"
              size="sm"
              shape="square"
              className="!p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <ArrowTurnUpLeftIcon className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              shape="square"
              className="!p-1 text-gray-400"
              disabled
              disableTooltipConent="Sign in to reply"
            >
              <ArrowTurnUpLeftIcon className="w-4 h-4" />
            </Button>
          )}
          {isLoggedIn &&
            comment.created_by &&
            String(comment.created_by) === String(currentUserId) && (
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
                onSelect={async (value) => {
                  if (value === 1) {
                    setEditingCommentId(String(comment.id));
                    setEditingContent(comment.content || "");
                  } else if (value === 2) {
                    await onDelete(String(comment.id));
                  }
                }}
                showBackground={false}
                size="md"
                onOpenChange={(open) => {
                  setOpenMenuCommentId(open ? String(comment.id) : null);
                  if (open) setHoveredCommentId(String(comment.id));
                }}
              />
            )}
        </div>
      </div>

      {/* Root content or editor */}
      {editingCommentId === String(comment.id) &&
      comment.created_by &&
      String(comment.created_by) === String(currentUserId) ? (
        <div>
          <div className="px-1 -mb-1 -mt-2">
            <MilkdownEditor
              onContentChange={setEditingContent}
              initialContent={comment.content || EMPTY_STRING}
              placeholder={isLoggedIn ? EMPTY_STRING : "Sign in to edit"}
              isReadonly={!isLoggedIn}
            />
          </div>
          <div className="flex space-x-2 justify-end px-2 pb-3">
            <Button
              onClick={() => {
                setEditingCommentId(null);
                setEditingContent("");
              }}
              variant="ghost"
              size="sm"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!editingContent.trim()) return;
                await onSaveEdit(String(comment.id), editingContent);
              }}
              disabled={isSubmitting}
              size="sm"
            >
              Save
            </Button>
          </div>
        </div>
      ) : (
        <div className="pl-10 -mb-1 -mt-2 -mx-3">
          <MilkdownEditor
            initialContent={comment.content || EMPTY_STRING}
            isReadonly={true}
            maxSizeTitle="sm"
            placeholder={EMPTY_STRING}
          />
        </div>
      )}

      {/* Replies */}
      {replies.length > 0 && (
        <div className="pl-8 pt-3">
          <div className="space-y-3">
            {replies.map((reply) => {
              const replyAuthor = reply.created_by
                ? userInfos[reply.created_by]
                : undefined;
              return (
                <div
                  key={reply.id}
                  className="group"
                  onMouseEnter={() => setHoveredCommentId(String(reply.id))}
                  onMouseLeave={() => {
                    if (openMenuCommentId !== String(reply.id)) {
                      setHoveredCommentId(null);
                    }
                  }}
                >
                  <div className="flex justify-between items-start space-x-1">
                    <div className="flex items-center space-x-2">
                      {replyAuthor?.avatar_url ? (
                        <Image
                          src={replyAuthor.avatar_url}
                          alt={replyAuthor.name || "User"}
                          width={32}
                          height={32}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-600 dark:text-gray-300">
                          {(replyAuthor?.name || "U")[0]?.toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {replyAuthor?.name || "Unknown User"}
                      </span>
                      <div className="text-sm text-gray-500">
                        {formatRelativeTime(reply.created_at)}
                      </div>
                    </div>

                    <div
                      className={`flex flex-row gap-2 transition-opacity duration-200 ${
                        hoveredCommentId === String(reply.id) ||
                        openMenuCommentId === String(reply.id)
                          ? "opacity-100"
                          : "opacity-0"
                      }`}
                    >
                      {isLoggedIn ? (
                        <Button
                          onClick={() =>
                            setReplyingToCommentId(String(reply.id))
                          }
                          variant="ghost"
                          size="sm"
                          shape="square"
                          className="!p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          <ArrowTurnUpLeftIcon className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          shape="square"
                          className="!p-1 text-gray-400"
                          disabled
                          disableTooltipConent="Sign in to reply"
                        >
                          <ArrowTurnUpLeftIcon className="w-4 h-4" />
                        </Button>
                      )}
                      {isLoggedIn &&
                        reply.created_by &&
                        String(reply.created_by) === String(currentUserId) && (
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
                            onSelect={async (value) => {
                              if (value === 1) {
                                setEditingCommentId(String(reply.id));
                                setEditingContent(reply.content || "");
                              } else if (value === 2) {
                                await onDelete(String(reply.id));
                              }
                            }}
                            showBackground={false}
                            size="md"
                            onOpenChange={(open) => {
                              setOpenMenuCommentId(
                                open ? String(reply.id) : null
                              );
                              if (open) setHoveredCommentId(String(reply.id));
                            }}
                          />
                        )}
                    </div>
                  </div>

                  {editingCommentId === String(reply.id) &&
                  reply.created_by &&
                  String(reply.created_by) === String(currentUserId) ? (
                    <div>
                      <div className="pl-6 -mb-1 -mt-2">
                        <MilkdownEditor
                          onContentChange={setEditingContent}
                          initialContent={reply.content || EMPTY_STRING}
                          placeholder={
                            isLoggedIn ? EMPTY_STRING : "Sign in to edit"
                          }
                          isReadonly={!isLoggedIn}
                        />
                      </div>
                      <div className="flex space-x-2 justify-end px-2 pb-3">
                        <Button
                          onClick={() => {
                            setEditingCommentId(null);
                            setEditingContent("");
                          }}
                          variant="ghost"
                          size="sm"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={async () => {
                            if (!editingContent.trim()) return;
                            await onSaveEdit(String(reply.id), editingContent);
                          }}
                          disabled={isSubmitting}
                          size="sm"
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="pl-6 -mb-1 -mt-2">
                      <MilkdownEditor
                        initialContent={reply.content || EMPTY_STRING}
                        isReadonly={true}
                        maxSizeTitle="sm"
                        placeholder={EMPTY_STRING}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reply input */}
      {(replyingToCommentId === String(comment.id) ||
        replies
          .map((r) => String(r.id))
          .includes(replyingToCommentId ?? "")) && (
        <div className="border-t border-gray-200 dark:border-gray-800">
          <div className="h-fit px-1">
            <MilkdownEditor
              key={replyingToCommentId || "reply"}
              onContentChange={setReplyContent}
              initialContent={EMPTY_STRING}
              maxSizeTitle="sm"
              placeholder={
                isLoggedIn
                  ? replyingToCommentId === String(comment.id)
                    ? "Write a reply..."
                    : `Reply to @${
                        userInfos[
                          replies.find(
                            (r) => String(r.id) === String(replyingToCommentId)
                          )?.created_by ?? ""
                        ]?.name || "Unknown User"
                      }...`
                  : "Sign in to reply"
              }
              isReadonly={!isLoggedIn}
            />
            <div className="flex space-x-2 justify-end p-2">
              <Button
                onClick={() => {
                  setReplyingToCommentId(null);
                  setReplyContent("");
                }}
                variant="ghost"
                size="sm"
              >
                Cancel
              </Button>
              {isLoggedIn ? (
                <Button
                  onClick={async () => {
                    if (!replyingToCommentId || !replyContent.trim()) return;
                    await onSubmitReply(replyingToCommentId, replyContent);
                  }}
                  disabled={isSubmitting || !replyContent.trim()}
                  size="sm"
                >
                  Reply
                </Button>
              ) : (
                <Button
                  disabled
                  size="sm"
                  disableTooltipConent="Sign in to reply"
                >
                  Reply
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DiscussionCommentTimeline({
  discussionId,
  canEdit: _canEdit,
}: DiscussionCommentTimelineProps) {
  const { data: comments = EMPTY_ARRAY } = useDiscussionComments(discussionId);
  const { data: currentUser } = useCurrentUser();
  const createCommentMutation = useCreateDiscussionComment(discussionId);
  const updateCommentMutation = useUpdateDiscussionComment(discussionId);
  const deleteCommentMutation = useDeleteDiscussionComment(discussionId);

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>("");
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(
    null
  );
  const [replyContent, setReplyContent] = useState<string>("");
  const [newCommentContent, setNewCommentContent] = useState<string>("");
  const [newCommentKey, setNewCommentKey] = useState<number>(Math.random());
  const [hoveredCommentId, setHoveredCommentId] = useState<string | null>(null);

  // Collect user IDs from comments
  const userIds = useMemo(() => {
    const idSet = new Set<string>();
    for (const comment of comments) {
      if (comment.created_by) idSet.add(String(comment.created_by));
    }
    if (currentUser?.id) {
      idSet.add(String(currentUser.id));
    }
    return Array.from(idSet);
  }, [comments, currentUser?.id]);

  // Get user infos
  const { data: userInfosMap = EMPTY_OBJECT } = useUsersInfo(userIds);
  const userInfos = useMemo(() => {
    const map: Record<
      string,
      { name: string; email: string; avatar_url: string }
    > = {};
    for (const [id, userInfo] of Object.entries(
      userInfosMap as Record<
        string,
        { name: string; email: string; avatar_url: string }
      >
    )) {
      map[id] = {
        name: userInfo.name || userInfo.email || id,
        email: userInfo.email,
        avatar_url: userInfo.avatar_url || "",
      };
    }
    return map;
  }, [userInfosMap]);

  // Build comment hierarchy
  const commentById = useMemo(() => {
    const map = new Map<string, DiscussionComment>();
    for (const c of comments) map.set(String(c.id), c);
    return map;
  }, [comments]);

  const rootComments = comments.filter((c) => c.parent_id == null);
  const repliesOnly = comments.filter((c) => c.parent_id != null);

  const getRepliesForRoot = (rootId: string): DiscussionComment[] => {
    const result: DiscussionComment[] = [];
    for (const r of repliesOnly) {
      let current: DiscussionComment | undefined = r;
      while (current && current.parent_id) {
        const parent = commentById.get(String(current.parent_id));
        if (!parent) break;
        if (String(parent.id) === String(rootId)) {
          result.push(r);
          break;
        }
        current = parent;
      }
    }
    return result.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  };

  // Comment handlers
  const handleSubmitReply = async (
    parentId: string,
    content: string
  ): Promise<void> => {
    try {
      await createCommentMutation.mutateAsync({ content, parentId });
      setReplyingToCommentId(null);
      setReplyContent("");
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveEdit = async (
    commentId: string,
    content: string
  ): Promise<void> => {
    if (!content.trim()) return;
    try {
      await updateCommentMutation.mutateAsync({ commentId, content });
      setEditingCommentId(null);
      setEditingContent("");
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (commentId: string): Promise<void> => {
    try {
      await deleteCommentMutation.mutateAsync({ commentId });
      if (replyingToCommentId === commentId) {
        setReplyingToCommentId(null);
        setReplyContent("");
      }
      if (editingCommentId === commentId) {
        setEditingCommentId(null);
        setEditingContent("");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const isSubmitting =
    createCommentMutation.isPending ||
    updateCommentMutation.isPending ||
    deleteCommentMutation.isPending;

  return (
    <div className="flex flex-col gap-4">
      {/* Comments */}
      <div className="flex flex-col gap-4">
        {rootComments.map((comment) => {
          const replies = getRepliesForRoot(String(comment.id));
          return (
            <CommentCard
              key={comment.id}
              comment={comment}
              replies={replies}
              userInfos={userInfos}
              editingCommentId={editingCommentId}
              setEditingCommentId={setEditingCommentId}
              editingContent={editingContent}
              setEditingContent={setEditingContent}
              replyingToCommentId={replyingToCommentId}
              setReplyingToCommentId={setReplyingToCommentId}
              replyContent={replyContent}
              setReplyContent={setReplyContent}
              hoveredCommentId={hoveredCommentId}
              setHoveredCommentId={setHoveredCommentId}
              onSubmitReply={handleSubmitReply}
              onSaveEdit={handleSaveEdit}
              onDelete={handleDelete}
              isSubmitting={isSubmitting}
              isLoggedIn={!!currentUser}
            />
          );
        })}
      </div>

      {/* New comment composer */}
      <div className="border rounded-lg border-gray-200 dark:border-gray-800 flex flex-col h-fit">
        <div className="h-fit px-1">
          <MilkdownEditor
            key={`${newCommentKey}-${currentUser ? "logged-in" : "logged-out"}`}
            onContentChange={setNewCommentContent}
            initialContent=""
            maxSizeTitle="sm"
            placeholder={
              currentUser
                ? "Leave a comment..."
                : "Sign in to join the discussion"
            }
            isReadonly={!currentUser}
          />
        </div>
        <div className="flex justify-end p-2">
          {currentUser ? (
            <Button
              onClick={async () => {
                if (!newCommentContent.trim()) return;
                try {
                  await createCommentMutation.mutateAsync({
                    content: newCommentContent,
                  });
                  setNewCommentContent("");
                  setNewCommentKey(Math.random());
                } catch (e) {
                  console.error(e);
                }
              }}
              disabled={
                createCommentMutation.isPending || !newCommentContent.trim()
              }
              shape="square"
              size="sm"
              className="!p-1"
            >
              <ArrowUpIcon className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              disabled
              shape="square"
              size="sm"
              className="!p-1"
              disableTooltipConent="Sign in to join the discussion"
            >
              <ArrowUpIcon className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
