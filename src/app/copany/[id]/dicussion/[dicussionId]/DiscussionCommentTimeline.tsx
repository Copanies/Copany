"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  useDiscussionComments,
  useCreateDiscussionComment,
  useUpdateDiscussionComment,
  useDeleteDiscussionComment,
} from "@/hooks/discussionComments";
import {
  useDiscussionCommentVoteState,
  useToggleDiscussionCommentVote,
} from "@/hooks/discussionCommentVotes";
import type { DiscussionComment } from "@/types/database.types";
import { formatRelativeTime } from "@/utils/time";
import { useUsersInfo } from "@/hooks/userInfo";
import { useCurrentUser } from "@/hooks/currentUser";
import { ChatBubbleBottomCenterIcon } from "@heroicons/react/24/outline";
import arrowshape_up from "@/assets/arrowshape_up.svg";
import arrowshape_up_fill from "@/assets/arrowshape_up_fill.svg";
import arrowshape_up_fill_dark from "@/assets/arrowshape_up_fill_dark.svg";
import arrowshape_up_dark from "@/assets/arrowshape_up_dark.svg";
import { EllipsisHorizontalIcon } from "@heroicons/react/24/outline";
import Button from "@/components/commons/Button";
import Dropdown from "@/components/commons/Dropdown";
import MilkdownEditor from "@/components/commons/MilkdownEditor";
import { EMPTY_ARRAY, EMPTY_OBJECT, EMPTY_STRING } from "@/utils/constants";
import { useDarkMode } from "@/utils/useDarkMode";

interface DiscussionCommentTimelineProps {
  discussionId: string;
  canEdit: boolean;
}

interface VoteButtonProps {
  commentId: string;
  initialVoteCount: number;
  isLoggedIn: boolean;
}

function VoteButton({
  commentId,
  initialVoteCount,
  isLoggedIn,
}: VoteButtonProps) {
  const isDarkMode = useDarkMode();
  const { countQuery, flagQuery } = useDiscussionCommentVoteState(commentId, {
    enableCountQuery: initialVoteCount == null,
    countInitialData: initialVoteCount ?? undefined,
  });
  const hasVoted = flagQuery.data;
  const voteCount = countQuery.data ?? initialVoteCount ?? 0;
  const toggleVoteMutation = useToggleDiscussionCommentVote(commentId);

  const handleVote = async () => {
    if (!isLoggedIn) return;
    await toggleVoteMutation.mutateAsync({ toVote: !hasVoted });
  };

  return (
    <Button
      onClick={handleVote}
      variant={"secondary"}
      size="sm"
      disabled={toggleVoteMutation.isPending || !isLoggedIn}
      disableTooltipConent={!isLoggedIn ? "Sign in to vote" : undefined}
    >
      <div className="flex items-center gap-2">
        <Image
          src={
            hasVoted
              ? isDarkMode
                ? arrowshape_up_fill_dark
                : arrowshape_up_fill
              : isDarkMode
              ? arrowshape_up_dark
              : arrowshape_up
          }
          alt="Vote"
          width={16}
          height={16}
        />
        <span>{voteCount ?? 0}</span>
      </div>
    </Button>
  );
}

interface CommentNodeProps {
  comment: DiscussionComment;
  allComments: readonly DiscussionComment[];
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
  onSubmitReply: (parentId: string, content: string) => Promise<void>;
  onSaveEdit: (commentId: string, content: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  isSubmitting: boolean;
  isLoggedIn: boolean;
  level: number;
  isThisLevelLastComment: boolean;
}

function CommentNode({
  comment,
  allComments,
  userInfos,
  editingCommentId,
  setEditingCommentId,
  editingContent,
  setEditingContent,
  replyingToCommentId,
  setReplyingToCommentId,
  replyContent,
  setReplyContent,
  onSubmitReply,
  onSaveEdit,
  onDelete,
  isSubmitting,
  isLoggedIn,
  level,
  isThisLevelLastComment,
}: CommentNodeProps) {
  const { data: currentUser } = useCurrentUser();
  const currentUserId = currentUser?.id ?? null;
  const [_openMenuCommentId, setOpenMenuCommentId] = useState<string | null>(
    null
  );

  const author = comment.created_by ? userInfos[comment.created_by] : undefined;
  const indentLevel = Math.min(level, 6); // Maximum 6 levels of indentation

  // Check if this comment has children
  const hasChildren = useMemo(() => {
    return allComments.some((c) => String(c.parent_id) === String(comment.id));
  }, [allComments, comment.id]);
  return (
    <div className="flex flex-col gap-0 relative">
      {!isThisLevelLastComment && level > 0 && (
        <div className="absolute top-0 -bottom-2 left-[-12px] w-px bg-gray-200 dark:bg-gray-700" />
      )}

      {/* Author info and actions */}
      <div className="flex justify-between items-start relative">
        <div className="flex items-center space-x-2 relative z-10">
          {/* Arc curve for nested comments */}
          {level > 0 && (
            <div
              className="absolute left-[-12px] top-2 w-2 h-2 border-l-1 border-b-1 border-gray-200 dark:border-gray-700 rounded-bl-[8px]"
              style={{
                borderTopColor: "transparent",
                borderRightColor: "transparent",
              }}
            />
          )}

          {author?.avatar_url ? (
            <>
              <Image
                src={author.avatar_url}
                alt={author.name || "User"}
                width={32}
                height={32}
                className="w-8 h-8 rounded-full relative z-10"
              />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {author.name}
              </span>
            </>
          ) : (
            <>
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-600 dark:text-gray-300 relative z-10">
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

        {/* Edit/Delete Menu */}
        {isLoggedIn &&
          comment.created_by &&
          String(comment.created_by) === String(currentUserId) &&
          !comment.deleted_at && (
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
              }}
            />
          )}
      </div>

      <div className="flex flex-col gap-0 ml-10 relative">
        {/* Vertical line from avatar center */}
        {hasChildren && (
          <div
            className="absolute left-[-24px] top-1 -bottom-5 w-px bg-gray-200 dark:bg-gray-700"
            style={{ left: "-24px" }}
          />
        )}

        {/* Content or editor */}
        {editingCommentId === String(comment.id) &&
        comment.created_by &&
        String(comment.created_by) === String(currentUserId) ? (
          <div className="mb-3 border border-gray-200 dark:border-gray-800 rounded-lg">
            <div className="px-1 -mb-1">
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
        ) : comment.deleted_at ? (
          <div className="-mt-2">
            <div className="text-gray-500 dark:text-gray-400 italic py-2">
              This comment has been deleted
            </div>
          </div>
        ) : (
          <div className="-mx-3 -mt-2">
            <MilkdownEditor
              initialContent={comment.content || EMPTY_STRING}
              isReadonly={true}
              maxSizeTitle="sm"
              placeholder={EMPTY_STRING}
            />
          </div>
        )}

        {/* Action buttons - only show for non-deleted comments */}
        {!comment.deleted_at && (
          <div className="flex items-center gap-2">
            <VoteButton
              commentId={String(comment.id)}
              initialVoteCount={comment.vote_up_count}
              isLoggedIn={isLoggedIn}
            />
            <Button
              onClick={() => setReplyingToCommentId(String(comment.id))}
              variant="secondary"
              size="sm"
              disabled={!isLoggedIn}
              disableTooltipConent={
                !isLoggedIn ? "Sign in to reply" : undefined
              }
            >
              <div className="flex items-center gap-2">
                <ChatBubbleBottomCenterIcon
                  className="w-4 h-4"
                  strokeWidth={1.5}
                />
                <span>Reply</span>
              </div>
            </Button>
          </div>
        )}

        {/* Reply input */}
        {replyingToCommentId === String(comment.id) && (
          <div className="mt-3 border border-gray-200 dark:border-gray-800 rounded-lg">
            <div className="h-fit px-1">
              <MilkdownEditor
                key={`reply-${comment.id}`}
                onContentChange={setReplyContent}
                initialContent={EMPTY_STRING}
                maxSizeTitle="sm"
                placeholder={
                  isLoggedIn ? "Write a reply..." : "Sign in to reply"
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
                      if (!replyContent.trim()) return;
                      await onSubmitReply(String(comment.id), replyContent);
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

      {/* Child comments */}
      <div className="flex flex-col gap-0 pt-3 ml-4">
        {(() => {
          const directChildren = buildCommentTree(
            allComments,
            String(comment.id)
          );
          return (
            directChildren.length > 0 && (
              <div className="pl-3">
                <div className="space-y-0">
                  {directChildren.map((child, index) => (
                    <CommentNode
                      key={child.id}
                      comment={child}
                      allComments={allComments}
                      userInfos={userInfos}
                      editingCommentId={editingCommentId}
                      setEditingCommentId={setEditingCommentId}
                      editingContent={editingContent}
                      setEditingContent={setEditingContent}
                      replyingToCommentId={replyingToCommentId}
                      setReplyingToCommentId={setReplyingToCommentId}
                      replyContent={replyContent}
                      setReplyContent={setReplyContent}
                      onSubmitReply={onSubmitReply}
                      onSaveEdit={onSaveEdit}
                      onDelete={onDelete}
                      isSubmitting={isSubmitting}
                      isLoggedIn={isLoggedIn}
                      level={level + 1}
                      isThisLevelLastComment={
                        index === directChildren.length - 1
                      }
                    />
                  ))}
                </div>
              </div>
            )
          );
        })()}
      </div>
    </div>
  );
}

// Helper function to build comment tree
function buildCommentTree(
  comments: readonly DiscussionComment[],
  parentId?: string | null
): DiscussionComment[] {
  return comments
    .filter((comment) => {
      if (parentId === undefined || parentId === null) {
        // For root comments, parent_id should be null
        return comment.parent_id === null;
      }
      // For child comments, match the parent_id
      return String(comment.parent_id) === String(parentId);
    })
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
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

  // Build comment tree
  const rootComments = useMemo(() => buildCommentTree(comments), [comments]);

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
    <div className="flex flex-col gap-1 pb-[200px]">
      <div className="flex flex-col gap-1">
        {rootComments.map((comment, index) => (
          <CommentNode
            key={comment.id}
            comment={comment}
            allComments={comments}
            userInfos={userInfos}
            editingCommentId={editingCommentId}
            setEditingCommentId={setEditingCommentId}
            editingContent={editingContent}
            setEditingContent={setEditingContent}
            replyingToCommentId={replyingToCommentId}
            setReplyingToCommentId={setReplyingToCommentId}
            replyContent={replyContent}
            setReplyContent={setReplyContent}
            onSubmitReply={handleSubmitReply}
            onSaveEdit={handleSaveEdit}
            onDelete={handleDelete}
            isSubmitting={isSubmitting}
            isLoggedIn={!!currentUser}
            level={0}
            isThisLevelLastComment={index === rootComments.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
