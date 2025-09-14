"use client";

import { useMemo, useState } from "react";
import {
  useDiscussions,
  useCreateDiscussion,
  useUpdateDiscussion,
  useDeleteDiscussion,
  useDiscussionVoteCount,
} from "@/hooks/discussions";
import {
  useDiscussionVoteState,
  useToggleDiscussionVote,
} from "@/hooks/discussionVotes";
import {
  useDiscussionComments,
  useCreateDiscussionComment,
  useUpdateDiscussionComment,
  useDeleteDiscussionComment,
} from "@/hooks/discussionComments";
import type { Discussion, DiscussionComment } from "@/types/database.types";
import Button from "@/components/commons/Button";
import EmptyPlaceholderView from "@/components/commons/EmptyPlaceholderView";
import {
  ChatBubbleLeftRightIcon,
  PlusIcon,
  HandThumbUpIcon,
} from "@heroicons/react/24/outline";
import { useUsersInfo } from "@/hooks/userInfo";
import type { UserInfo } from "@/actions/user.actions";
import Image from "next/image";
import { formatRelativeTime } from "@/utils/time";

export default function DiscussionView({ copanyId }: { copanyId: string }) {
  const { data: discussions, isLoading } = useDiscussions(copanyId);
  const create = useCreateDiscussion(copanyId);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [labelsStr, setLabelsStr] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [activeLabel, setActiveLabel] = useState<string>("all");

  const allLabels = useMemo(() => {
    const set = new Set<string>();
    (discussions || []).forEach((d) =>
      (d.labels || []).forEach((l) => set.add(l))
    );
    return Array.from(set);
  }, [discussions]);

  const filtered = useMemo(() => {
    if (!discussions) return [] as Discussion[];
    if (activeLabel === "all") return discussions;
    return discussions.filter((d) => (d.labels || []).includes(activeLabel));
  }, [discussions, activeLabel]);

  const creatorIds = useMemo(() => {
    const set = new Set<string>();
    (filtered || []).forEach((d) => {
      if (d.creator_id) set.add(String(d.creator_id));
    });
    return Array.from(set);
  }, [filtered]);
  const { data: usersMap = {} } = useUsersInfo(creatorIds);

  const onCreate = () => {
    if (!title.trim()) return;
    const labels = labelsStr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    create.mutate({
      title: title.trim(),
      description: description || null,
      labels,
    });
    setTitle("");
    setDescription("");
    setLabelsStr("");
    setShowCreate(false);
  };

  return (
    <div className="p-4 flex gap-4">
      <aside className="w-44 shrink-0">
        <div className="sticky top-4 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Label
          </h3>
          <div className="flex flex-col gap-2">
            <button
              className={`text-sm rounded-lg px-2 py-1 text-left border ${
                activeLabel === "all"
                  ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-black"
                  : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
              }`}
              onClick={() => setActiveLabel("all")}
            >
              All
            </button>
            {allLabels.map((l) => (
              <button
                key={l}
                className={`text-sm rounded-lg px-2 py-1 text-left border ${
                  activeLabel === l
                    ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-black"
                    : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                }`}
                onClick={() => setActiveLabel(l)}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <section className="flex-1 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div />
          <Button size="sm" onClick={() => setShowCreate((s) => !s)}>
            <div className="flex items-center gap-2">
              <PlusIcon className="w-4 h-4" />
              <span>New discussion</span>
            </div>
          </Button>
        </div>

        {showCreate && (
          <div className="border rounded-md p-4 flex flex-col gap-2">
            <div className="font-medium">Create Discussion</div>
            <input
              className="border rounded px-2 py-1 bg-white dark:bg-gray-900"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="border rounded px-2 py-1 bg-white dark:bg-gray-900"
              placeholder="Description (optional)"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <input
              className="border rounded px-2 py-1 bg-white dark:bg-gray-900"
              placeholder="Labels (comma separated)"
              value={labelsStr}
              onChange={(e) => setLabelsStr(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={onCreate}
                disabled={create.isPending}
              >
                {create.isPending ? "Creating..." : "Create"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="text-gray-500">Loading discussions...</div>
        ) : !discussions || discussions.length === 0 ? (
          <EmptyPlaceholderView
            icon={
              <ChatBubbleLeftRightIcon className="w-10 h-10 text-gray-400" />
            }
            title="No discussions yet"
            description="Create the first discussion to kick off the conversation."
            buttonIcon={<PlusIcon className="w-4 h-4" />}
            buttonTitle="New discussion"
            buttonAction={() => setShowCreate(true)}
          />
        ) : filtered.length === 0 ? (
          <EmptyPlaceholderView
            icon={
              <ChatBubbleLeftRightIcon className="w-10 h-10 text-gray-400" />
            }
            title="No discussions for this label"
            description="Try another label or clear the filter."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {filtered.map((d) => (
              <li key={d.id} className="border rounded-md p-4">
                <DiscussionItem
                  copanyId={copanyId}
                  discussion={d}
                  creator={
                    d.creator_id
                      ? (usersMap[String(d.creator_id)] as UserInfo | undefined)
                      : undefined
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function DiscussionItem({
  copanyId,
  discussion,
  creator,
}: {
  copanyId: string;
  discussion: Discussion;
  creator?: UserInfo;
}) {
  const update = useUpdateDiscussion(copanyId);
  const remove = useDeleteDiscussion(copanyId);
  const voteState = useDiscussionVoteState(discussion.id);
  const voteToggle = useToggleDiscussionVote(discussion.id);
  const voteCount = useDiscussionVoteCount(discussion.id);

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(discussion.title);
  const [description, setDescription] = useState(discussion.description || "");
  const [labelsStr, setLabelsStr] = useState(
    (discussion.labels || []).join(",")
  );
  const [showComments, setShowComments] = useState(false);

  const onSave = () => {
    const labels = labelsStr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    update.mutate({
      discussionId: discussion.id,
      updates: { title, description, labels },
    });
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          {isEditing ? (
            <div className="flex flex-col gap-2">
              <input
                className="border rounded px-2 py-1 bg-white dark:bg-gray-900"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <textarea
                className="border rounded px-2 py-1 bg-white dark:bg-gray-900"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <input
                className="border rounded px-2 py-1 bg-white dark:bg-gray-900"
                value={labelsStr}
                onChange={(e) => setLabelsStr(e.target.value)}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                {creator?.avatar_url ? (
                  <Image
                    src={creator.avatar_url}
                    alt={creator.name}
                    width={24}
                    height={24}
                    className="w-6 h-6 rounded-full"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-700 dark:text-gray-200">
                    {(creator?.name || "?").slice(0, 1).toUpperCase()}
                  </div>
                )}
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {creator?.name || "Unknown User"}
                </span>
                <span>·</span>
                <time title={discussion.created_at}>
                  {formatRelativeTime(discussion.created_at)}
                </time>
              </div>
              <div className="text-lg font-semibold">{discussion.title}</div>
              {discussion.description && (
                <div className="text-gray-700 whitespace-pre-wrap">
                  {discussion.description}
                </div>
              )}
              {discussion.labels && discussion.labels.length > 0 && (
                <div className="flex gap-2 flex-wrap mt-1">
                  {discussion.labels.map((l) => (
                    <span
                      key={l}
                      className="text-xs bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-2 py-0.5"
                    >
                      {l}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={voteState.data ? "primary" : "secondary"}
            onClick={() => voteToggle.mutate({ toVote: !voteState.data })}
            disabled={voteToggle.isPending}
          >
            <div className="flex items-center gap-2">
              <HandThumbUpIcon className="w-4 h-4" />
              <span>{voteCount.data ?? discussion.vote_up_count}</span>
            </div>
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isEditing ? (
          <>
            <Button
              variant="primary"
              size="sm"
              onClick={onSave}
              disabled={update.isPending}
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => remove.mutate({ discussionId: discussion.id })}
              disabled={remove.isPending}
            >
              Delete
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowComments((s) => !s)}
            >
              <div className="flex items-center gap-2">
                <ChatBubbleLeftRightIcon className="w-4 h-4" />
                <span>
                  {showComments
                    ? "Hide Comments"
                    : `Comments (${discussion.comment_count ?? 0})`}
                </span>
              </div>
            </Button>
          </>
        )}
      </div>

      <DiscussionCommentsPanel
        discussionId={discussion.id}
        visible={showComments}
      />
    </div>
  );
}

function DiscussionCommentsPanel({
  discussionId,
  visible,
}: {
  discussionId: string;
  visible: boolean;
}) {
  const { data: comments } = useDiscussionComments(discussionId);
  const create = useCreateDiscussionComment(discussionId);
  const update = useUpdateDiscussionComment(discussionId);
  const remove = useDeleteDiscussionComment(discussionId);

  const [content, setContent] = useState("");
  const [editing, setEditing] = useState<Record<string, string>>({});

  const onAdd = () => {
    if (!content.trim()) return;
    create.mutate({ content: content.trim() });
    setContent("");
  };

  if (!visible) return null;

  return (
    <div className="mt-2 border-t pt-3 flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          className="flex-1 border rounded px-2 py-1 bg-white dark:bg-gray-900"
          placeholder="Write a comment..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <Button
          variant="primary"
          size="sm"
          onClick={onAdd}
          disabled={create.isPending}
        >
          Post
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {(comments || []).map((c: DiscussionComment) => {
          const isEditing = editing[c.id] !== undefined;
          return (
            <div key={c.id} className="border rounded p-2">
              {isEditing ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    className="border rounded px-2 py-1 bg-white dark:bg-gray-900"
                    rows={2}
                    value={editing[c.id]}
                    onChange={(e) =>
                      setEditing({ ...editing, [c.id]: e.target.value })
                    }
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        const newText = (editing[c.id] || "").trim();
                        if (!newText) return;
                        update.mutate({ commentId: c.id, content: newText });
                        const { [c.id]: _, ...rest } = editing;
                        setEditing(rest);
                      }}
                      disabled={update.isPending}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const { [c.id]: _, ...rest } = editing;
                        setEditing(rest);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div className="whitespace-pre-wrap flex-1">{c.content}</div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        setEditing({ ...editing, [c.id]: c.content || "" })
                      }
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => remove.mutate({ commentId: c.id })}
                      disabled={remove.isPending}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
