"use client";

import { Suspense } from "react";
import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChatBubbleBottomCenterIcon,
  ChevronLeftIcon,
  ArrowUpIcon,
  EllipsisHorizontalIcon,
} from "@heroicons/react/24/outline";
import {
  useDiscussion,
  useDiscussionById,
  useDeleteDiscussion,
} from "@/hooks/discussions";
import { useCreateDiscussionComment } from "@/hooks/discussionComments";
import { useUsersInfo } from "@/hooks/userInfo";
import { useCurrentUser } from "@/hooks/currentUser";
import { useQueryClient } from "@tanstack/react-query";
import type { Discussion } from "@/types/database.types";
import Button from "@/components/commons/Button";
import DiscussionLabelChips from "@/components/discussion/DiscussionLabelChips";
import DiscussionCommentTimeline from "@/app/copany/[id]/@discussion_slot/discussion/[discussionId]/DiscussionCommentTimeline";
import { formatRelativeTime } from "@/utils/time";
import LoadingView from "@/components/commons/LoadingView";
import { useTranslations } from "next-intl";
import MilkdownEditor from "@/components/commons/MilkdownEditor";
import UserAvatar from "@/components/commons/UserAvatar";
import Dropdown from "@/components/commons/Dropdown";
import Modal from "@/components/commons/Modal";
import DiscussionEditForm from "./DiscussionEditForm";
import VoteButton from "./VoteButton";

interface DiscussionDetailViewProps {
  discussionId: string;
  copanyId?: string | null;
}

export default function DiscussionDetailView({
  discussionId,
  copanyId,
}: DiscussionDetailViewProps) {
  const router = useRouter();
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const tTime = useTranslations("time");

  // Fetch discussion - derive from list cache using select
  // Always call both hooks to satisfy Rules of Hooks, use enabled to control execution
  const discussionWithCopany = useDiscussion(copanyId || "", discussionId);
  const discussionWithoutCopany = useDiscussionById(discussionId);

  // Use appropriate data based on whether copanyId exists
  const discussion = copanyId
    ? discussionWithCopany.data
    : discussionWithoutCopany.data;
  const isLoading = copanyId
    ? discussionWithCopany.isLoading
    : discussionWithoutCopany.isLoading;

  const createCommentMutation = useCreateDiscussionComment(discussionId);
  const deleteDiscussion = useDeleteDiscussion(copanyId || null);

  // New comment state management
  const [showCommentInput, setShowCommentInput] = useState(
    (discussion?.comment_count ?? 0) === 0
  );
  const [newCommentContent, setNewCommentContent] = useState("");
  const [newCommentKey, setNewCommentKey] = useState(Math.random());

  // Edit and delete modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Listen to comment count changes
  useEffect(() => {
    if (discussion && (discussion.comment_count ?? 0) === 0) {
      setShowCommentInput(true);
    }
  }, [discussion]);

  // Get creator info
  const creatorIds = useMemo(() => {
    if (!discussion?.creator_id) return [];
    return [String(discussion.creator_id)];
  }, [discussion?.creator_id]);
  const { data: usersMap = {} } = useUsersInfo(creatorIds);

  const creator = discussion?.creator_id
    ? usersMap[String(discussion.creator_id)]
    : undefined;

  // Check if current user can edit and delete
  const canEdit =
    currentUser &&
    discussion &&
    String(currentUser.id) === String(discussion.creator_id);

  // Handle edit
  const handleEdit = () => {
    setShowEditModal(true);
  };

  // Handle delete
  const handleDelete = async () => {
    if (!discussion) return;
    try {
      await deleteDiscussion.mutateAsync({ discussionId: discussion.id });
      // Navigate based on whether it has copany
      if (copanyId) {
        router.push(`/copany/${copanyId}`);
      } else {
        router.push("/discussion");
      }
    } catch (error) {
      console.error("Failed to delete discussion:", error);
    }
  };

  // Handle edit completion
  const handleDiscussionUpdated = (updatedDiscussion: Discussion) => {
    // Update list cache - derived discussions will update automatically via select
    type InfiniteData = {
      pages: { discussions: Discussion[]; hasMore: boolean }[];
      pageParams: unknown[];
    };

    if (copanyId) {
      queryClient.setQueryData<InfiniteData>(
        ["discussions", copanyId, "v2"],
        (prev) => {
          if (!prev?.pages) return prev;
          return {
            ...prev,
            pages: prev.pages.map((page) => ({
              ...page,
              discussions: page.discussions.map((d) =>
                String(d.id) === String(updatedDiscussion.id)
                  ? updatedDiscussion
                  : d
              ),
            })),
          };
        }
      );
    }
    // Update global discussions list cache
    queryClient.setQueryData<InfiniteData>(
      ["discussions", "all", "v2"],
      (prev) => {
        if (!prev?.pages) return prev;
        return {
          ...prev,
          pages: prev.pages.map((page) => ({
            ...page,
            discussions: page.discussions.map((d) =>
              String(d.id) === String(updatedDiscussion.id)
                ? updatedDiscussion
                : d
            ),
          })),
        };
      }
    );
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
            <UserAvatar
              userId={String(discussion?.creator_id || "")}
              name={creator?.name || ""}
              avatarUrl={creator?.avatar_url || null}
              email={creator?.email}
              size="lg"
              showTooltip={true}
            />
            <div className="flex flex-row items-center gap-2">
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                {creator?.name || ""}
              </span>
              {copanyId &&
                discussion.labels &&
                discussion.labels.length > 0 && (
                  <span className="text-sm text-gray-600 dark:text-gray-400 hidden md:block">
                    <DiscussionLabelChips labelIds={discussion.labels} />
                  </span>
                )}
              <span>·</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {formatRelativeTime(discussion.created_at, tTime)}
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
          {copanyId && discussion.labels && discussion.labels.length > 0 && (
            <span className="block md:hidden text-sm text-gray-600 dark:text-gray-400">
              <DiscussionLabelChips labelIds={discussion.labels} />
            </span>
          )}
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
          <VoteButton
            discussionId={discussionId}
            size="sm"
            count={discussion?.vote_up_count}
          />
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
            copanyId={copanyId || null}
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
