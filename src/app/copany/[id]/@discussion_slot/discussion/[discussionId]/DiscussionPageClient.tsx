"use client";

import { Suspense } from "react";
import { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import { shimmerDataUrlWithTheme } from "@/utils/shimmer";
import { useDarkMode } from "@/utils/useDarkMode";
import { useRouter } from "next/navigation";
import {
  ChatBubbleBottomCenterIcon,
  ChevronLeftIcon,
  ArrowUpIcon,
  EllipsisHorizontalIcon,
} from "@heroicons/react/24/outline";
import arrowshape_up from "@/assets/arrowshape_up.svg";
import arrowshape_up_fill from "@/assets/arrowshape_up_fill.svg";
import arrowshape_up_fill_dark from "@/assets/arrowshape_up_fill_dark.svg";
import arrowshape_up_dark from "@/assets/arrowshape_up_dark.svg";
import { useDiscussion } from "@/hooks/discussions";
import {
  useDiscussionVoteState,
  useToggleDiscussionVote,
} from "@/hooks/discussionVotes";
import { useCreateDiscussionComment } from "@/hooks/discussionComments";
import { useDeleteDiscussion } from "@/hooks/discussions";
import { useUsersInfo } from "@/hooks/userInfo";
import { useCurrentUser } from "@/hooks/currentUser";
import { useQueryClient } from "@tanstack/react-query";
import type { Discussion } from "@/types/database.types";
import Button from "@/components/commons/Button";
import DiscussionLabelChips from "@/app/copany/[id]/_subTabs/discussion/DiscussionLabelChips";
import DiscussionCommentTimeline from "./DiscussionCommentTimeline";
import { formatRelativeTime } from "@/utils/time";
import LoadingView from "@/components/commons/LoadingView";
import MilkdownEditor from "@/components/commons/MilkdownEditor";
import Dropdown from "@/components/commons/Dropdown";
import Modal from "@/components/commons/Modal";
import DiscussionEditForm from "@/app/copany/[id]/_subTabs/discussion/DiscussionEditForm";

interface DiscussionPageClientProps {
  copanyId: string;
  discussionId: string;
}

export default function DiscussionPageClient({
  copanyId,
  discussionId,
}: DiscussionPageClientProps) {
  const isDarkMode = useDarkMode();
  const router = useRouter();
  const { data: discussion, isLoading } = useDiscussion(copanyId, discussionId);
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const { countQuery, flagQuery } = useDiscussionVoteState(discussionId, {
    countInitialData: discussion?.vote_up_count,
  });
  const voteToggle = useToggleDiscussionVote(discussionId);
  const createCommentMutation = useCreateDiscussionComment(discussionId);
  const deleteDiscussion = useDeleteDiscussion(copanyId);

  // 新增评论的状态管理
  // 当没有评论时，默认显示输入框
  const [showCommentInput, setShowCommentInput] = useState(
    (discussion?.comment_count ?? 0) === 0
  );
  const [newCommentContent, setNewCommentContent] = useState("");
  const [newCommentKey, setNewCommentKey] = useState(Math.random());

  // 编辑和删除弹窗状态
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 监听评论数量变化，当没有评论时自动显示输入框
  useEffect(() => {
    if (discussion && (discussion.comment_count ?? 0) === 0) {
      setShowCommentInput(true);
    }
  }, [discussion]);

  // 获取作者信息
  const creatorIds = useMemo(() => {
    if (!discussion?.creator_id) return [];
    return [String(discussion.creator_id)];
  }, [discussion?.creator_id]);
  const { data: usersMap = {} } = useUsersInfo(creatorIds);

  const creator = discussion?.creator_id
    ? usersMap[String(discussion.creator_id)]
    : undefined;

  // 检查当前用户是否有编辑和删除权限
  const canEdit =
    currentUser &&
    discussion &&
    String(currentUser.id) === String(discussion.creator_id);

  // 处理编辑
  const handleEdit = () => {
    setShowEditModal(true);
  };

  // 处理删除
  const handleDelete = async () => {
    if (!discussion) return;
    try {
      await deleteDiscussion.mutateAsync({ discussionId: discussion.id });
      router.push(`/copany/${copanyId}`); // 删除后返回到copany页面
    } catch (error) {
      console.error("删除discussion失败:", error);
    }
  };

  // 处理编辑完成
  const handleDiscussionUpdated = (updatedDiscussion: Discussion) => {
    // 手动更新discussions列表缓存，确保立即生效
    queryClient.setQueryData(
      ["discussions", copanyId],
      (prev: Discussion[] | undefined) => {
        if (!prev) return prev;
        return prev.map((d) =>
          String(d.id) === String(updatedDiscussion.id) ? updatedDiscussion : d
        );
      }
    );
    // 关闭弹窗
    setShowEditModal(false);
  };

  if (isLoading) {
    return <LoadingView />;
  }

  if (!discussion) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-500">Discussion not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Header with back button */}
      <div className="mb-6 flex items-center gap-3">
        <Button
          variant="secondary"
          size="md"
          shape="square"
          onClick={() => router.back()}
        >
          <ChevronLeftIcon className="w-3 h-3 text-gray-900 dark:text-gray-100" />
        </Button>
      </div>

      {/* Discussion header */}
      <div className="mb-5">
        {/* Creator info */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex flex-row items-center gap-3">
            {creator?.avatar_url ? (
              <Image
                src={creator.avatar_url}
                alt={creator.name}
                width={32}
                height={32}
                className="w-8 h-8 rounded-full"
                placeholder="blur"
                blurDataURL={shimmerDataUrlWithTheme(32, 32, isDarkMode)}
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm text-gray-700 dark:text-gray-200">
                {(creator?.name || "").slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="flex flex-row items-center gap-2">
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                {creator?.name || ""}
              </span>
              <span className="text-sm text-gray-500">
                {discussion.labels && discussion.labels.length > 0 && (
                  <DiscussionLabelChips labelIds={discussion.labels} />
                )}
              </span>
              <span>·</span>
              <span className="text-sm text-gray-500">
                {formatRelativeTime(discussion.created_at)}
              </span>
            </div>
          </div>

          {/* More menu - only show if user can edit */}
          {canEdit && (
            <Dropdown
              trigger={
                <div className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <EllipsisHorizontalIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </div>
              }
              options={[
                {
                  value: 1,
                  label: (
                    <div className="flex items-center gap-2">
                      <span>Edit</span>
                    </div>
                  ),
                },
                {
                  value: 2,
                  label: (
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                      <span>Delete</span>
                    </div>
                  ),
                },
              ]}
              selectedValue={null}
              onSelect={(value) => {
                if (value === 1) {
                  handleEdit();
                } else if (value === 2) {
                  setShowDeleteConfirm(true);
                }
              }}
              size="sm"
            />
          )}
        </div>
        <div className="flex flex-col gap-2">
          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {discussion.title}
          </h1>

          {/* Description */}
          {discussion.description && (
            <div className="text-gray-700 dark:text-gray-300 -mx-3 -my-2">
              <MilkdownEditor
                initialContent={discussion.description}
                maxSizeTitle="sm"
                isReadonly={true}
              />
            </div>
          )}
        </div>

        {/* Vote button */}
        <div className="flex items-center gap-3 mt-3">
          <Button
            size="sm"
            variant={"secondary"}
            onClick={() => voteToggle.mutate({ toVote: !flagQuery.data })}
            disabled={voteToggle.isPending || !currentUser}
            disableTooltipConent={!currentUser ? "Sign in to vote" : undefined}
          >
            <div className="flex items-center gap-2">
              <Image
                src={
                  flagQuery.data
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
                placeholder="blur"
                blurDataURL={shimmerDataUrlWithTheme(16, 16, isDarkMode)}
              />
              <span>{countQuery.data ?? 0}</span>
            </div>
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowCommentInput(!showCommentInput)}
          >
            <div className="flex items-center gap-2">
              <ChatBubbleBottomCenterIcon
                className="w-4 h-4"
                strokeWidth={1.5}
              />
              <span>{discussion.comment_count ?? 0}</span>
            </div>
          </Button>
        </div>
      </div>

      {/* New comment composer */}
      {!showCommentInput && (discussion.comment_count ?? 0) > 0 ? (
        <div
          className="mb-5 border rounded-full border-gray-200 dark:border-gray-800 flex flex-col h-fit hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
          onClick={() => setShowCommentInput(true)}
        >
          <div className="h-fit px-4 py-2">Join the discussion</div>
        </div>
      ) : (
        <div className="mb-5 border rounded-lg border-gray-200 dark:border-gray-800 flex flex-col h-fit">
          <div className="h-fit px-1">
            <MilkdownEditor
              key={`${newCommentKey}-${
                currentUser ? "logged-in" : "logged-out"
              }`}
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
          <div className="flex justify-end items-center gap-2 p-2">
            {(discussion.comment_count ?? 0) > 0 && (
              <Button
                onClick={() => {
                  setShowCommentInput(false);
                  setNewCommentContent("");
                  setNewCommentKey(Math.random());
                }}
                variant="ghost"
                size="sm"
              >
                Cancel
              </Button>
            )}
            <div className="flex gap-2">
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
                      setShowCommentInput(false);
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
      )}

      {/* Comments Timeline */}
      <Suspense
        fallback={<LoadingView type="label" label="Loading comments..." />}
      >
        <DiscussionCommentTimeline
          discussionId={discussionId}
          canEdit={!!currentUser}
        />
      </Suspense>

      {/* Edit Discussion Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        size="lg"
      >
        {discussion && (
          <DiscussionEditForm
            copanyId={copanyId}
            discussion={discussion}
            onDiscussionUpdated={handleDiscussionUpdated}
            onClose={() => setShowEditModal(false)}
          />
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        size="sm"
      >
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Delete Discussion
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Are you sure you want to delete this discussion? This action cannot
            be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleteDiscussion.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={async () => {
                await handleDelete();
                setShowDeleteConfirm(false);
              }}
              disabled={deleteDiscussion.isPending}
            >
              {deleteDiscussion.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
