"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  IssueActivity,
  IssueActivityType,
  IssueState,
  IssuePriority,
  IssueLevel,
} from "@/types/database.types";
import { listIssueActivityAction } from "@/actions/issueActivity.actions";
import { issueActivityManager, userInfoManager } from "@/utils/cache";
import { formatRelativeTime } from "@/utils/time";
import { renderLevelLabel } from "@/components/IssueLevelSelector";
import { renderPriorityLabel } from "@/components/IssuePrioritySelector";
import { renderStateLabel } from "@/components/IssueStateSelector";
import {
  renderUserLabelSm,
  renderUnassignedLabelSm,
} from "@/components/IssueAssigneeSelector";
import { ArrowRightIcon } from "@heroicons/react/20/solid";
import type { IssueComment } from "@/types/database.types";
import {
  getIssueCommentsAction,
  createIssueCommentAction,
  updateIssueCommentAction,
  deleteIssueCommentAction,
} from "@/actions/issueComment.actions";
import { issueCommentsManager } from "@/utils/cache";
import MilkdownEditor from "@/components/MilkdownEditor";
import Button from "@/components/commons/Button";
import { ArrowUpIcon } from "@heroicons/react/24/outline";
import IssueCommentCard from "@/components/IssueCommentCard";

interface IssueActivityTimelineProps {
  issueId: string;
}

export default function IssueActivityTimeline({
  issueId,
}: IssueActivityTimelineProps) {
  const [items, setItems] = useState<IssueActivity[]>([]);
  const [comments, setComments] = useState<IssueComment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>("");
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(
    null
  );
  const [replyContent, setReplyContent] = useState<string>("");
  const [newCommentContent, setNewCommentContent] = useState<string>("");
  const [newCommentKey, setNewCommentKey] = useState<number>(Math.random());
  const [hoveredCommentId, setHoveredCommentId] = useState<string | null>(null);
  const [userInfos, setUserInfos] = useState<
    Record<string, { name: string; email: string; avatar_url: string }>
  >({});

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const data = await issueActivityManager.getActivities(issueId, () =>
        listIssueActivityAction(issueId, 200)
      );
      setItems(data);
      // load comments (root only)
      const allComments = await issueCommentsManager.getComments(issueId, () =>
        getIssueCommentsAction(issueId)
      );
      setComments(allComments);
      const idSet = new Set<string>();
      for (const a of data) {
        if (a.actor_id) idSet.add(String(a.actor_id));
        const p = (a.payload || {}) as any;
        if (p.from_user_id) idSet.add(String(p.from_user_id));
        if (p.to_user_id) idSet.add(String(p.to_user_id));
      }
      for (const c of allComments) {
        if (c.created_by) idSet.add(String(c.created_by));
      }
      const ids = Array.from(idSet);
      if (ids.length > 0) {
        const users = await userInfoManager.getMultipleUserInfo(ids);
        const map: Record<
          string,
          { name: string; email: string; avatar_url: string }
        > = {};
        for (const id of Object.keys(users)) {
          map[id] = {
            name: users[id].name || users[id].email || id,
            email: users[id].email,
            avatar_url: users[id].avatar_url || "",
          };
        }
        setUserInfos(map);
      }
      setIsLoading(false);
    };
    load();
  }, [issueId]);

  const getStateName = (v: number | null | undefined): string => {
    if (v == null) return "";
    switch (v) {
      case IssueState.Backlog:
        return "Backlog";
      case IssueState.Todo:
        return "Todo";
      case IssueState.InProgress:
        return "In Progress";
      case IssueState.Done:
        return "Done";
      case IssueState.Canceled:
        return "Canceled";
      case IssueState.Duplicate:
        return "Duplicate";
      default:
        return String(v);
    }
  };

  const getPriorityName = (v: number | null | undefined): string => {
    if (v == null) return "";
    switch (v) {
      case IssuePriority.None:
        return "No priority";
      case IssuePriority.Urgent:
        return "Urgent";
      case IssuePriority.High:
        return "High";
      case IssuePriority.Medium:
        return "Medium";
      case IssuePriority.Low:
        return "Low";
      default:
        return String(v);
    }
  };

  const getLevelName = (v: number | null | undefined): string => {
    if (v == null) return "";
    switch (v) {
      case IssueLevel.level_S:
        return "Level S";
      case IssueLevel.level_A:
        return "Level A";
      case IssueLevel.level_B:
        return "Level B";
      case IssueLevel.level_C:
        return "Level C";
      case IssueLevel.level_None:
        return "Unknown level";
      default:
        return String(v);
    }
  };

  const renderHeaderText = (item: IssueActivity): string => {
    const who = item.actor_id ? userInfos[item.actor_id]?.name || "" : "System";
    const p = (item.payload || {}) as any;
    const title = p.issue_title ? `"${p.issue_title}"` : "Issue";
    switch (item.type as IssueActivityType) {
      case "issue_created":
        return `${who} created ${title}`;
      case "title_changed":
        return `${who} updated the title`;
      case "state_changed":
        return `${who} changed state from ${getStateName(
          p.from_state
        )} to ${getStateName(p.to_state)}`;
      case "priority_changed":
        return `${who} changed priority from ${getPriorityName(
          p.from_priority
        )} to ${getPriorityName(p.to_priority)}`;
      case "level_changed":
        return `${who} changed level from ${getLevelName(
          p.from_level
        )} to ${getLevelName(p.to_level)}`;
      case "assignee_changed":
        return `${who} changed the assignee`;
      case "issue_closed":
        return `${who} closed ${title}`;
      default:
        return `${who} updated ${title}`;
    }
  };

  const renderDiffLine = (item: IssueActivity) => {
    const p = (item.payload || {}) as any;
    switch (item.type as IssueActivityType) {
      case "title_changed":
        return (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            “{p.from_title || ""}” → “{p.to_title || ""}”
          </span>
        );
      case "state_changed":
        return null; // use header text only
      case "priority_changed":
        return null; // use header text only
      case "level_changed":
        return null; // use header text only
      case "assignee_changed": {
        const fromInfo = p.from_user_id
          ? userInfos[String(p.from_user_id)]
          : null;
        const toInfo = p.to_user_id ? userInfos[String(p.to_user_id)] : null;
        return (
          <div className="flex items-center gap-2">
            {p.from_user_id
              ? renderUserLabelSm(
                  fromInfo?.name || p.from_user_name || "",
                  fromInfo?.avatar_url || null,
                  true
                )
              : renderUnassignedLabelSm(true)}
            <ArrowRightIcon className="w-4 h-4 text-gray-400" />
            {p.to_user_id
              ? renderUserLabelSm(
                  toInfo?.name || p.to_user_name || "",
                  toInfo?.avatar_url || null,
                  true
                )
              : renderUnassignedLabelSm(true)}
          </div>
        );
      }
      default:
        return null;
    }
  };

  // Build helper structures to fetch replies for a given root comment
  const commentById = useMemo(() => {
    const map = new Map<string, IssueComment>();
    for (const c of comments) map.set(String(c.id), c);
    return map;
  }, [comments]);

  const repliesOnly = useMemo(
    () => comments.filter((c) => c.parent_id != null),
    [comments]
  );

  // Build merged entries (activities + root comments) sorted by time asc
  const rootComments = comments.filter((c) => c.parent_id == null);
  const merged = [
    ...items.map((a) => ({ kind: "activity" as const, at: a.created_at, a })),
    ...rootComments.map((c) => ({
      kind: "comment" as const,
      at: c.created_at,
      c,
    })),
  ].sort((x, y) => new Date(x.at).getTime() - new Date(y.at).getTime());

  if (merged.length === 0) return null;

  const renderLeft = (entry: (typeof merged)[number]) => {
    if (entry.kind === "activity") {
      const item = entry.a;
      if (item.type === "state_changed")
        return renderStateLabel((item.payload as any)?.to_state ?? null, false);
      if (item.type === "priority_changed")
        return renderPriorityLabel(
          (item.payload as any)?.to_priority ?? null,
          false
        );
      if (item.type === "level_changed")
        return renderLevelLabel((item.payload as any)?.to_level ?? null, false);
      if (item.actor_id && userInfos[item.actor_id]?.avatar_url)
        return (
          <Image
            src={userInfos[item.actor_id]!.avatar_url}
            alt={userInfos[item.actor_id]!.name || "User"}
            width={20}
            height={20}
            className="w-5 h-5 rounded-full"
          />
        );
      return (
        <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 flex items-center justify-center text-[10px] text-gray-600 dark:text-gray-300">
          {(item.actor_id &&
            userInfos[item.actor_id]?.name?.[0]?.toUpperCase()) ||
            "S"}
        </div>
      );
    }
    // In timeline, comment item should not render extra avatar on the left
    return null;
  };

  const getRepliesForRoot = (rootId: string): IssueComment[] => {
    const result: IssueComment[] = [];
    for (const r of repliesOnly) {
      let current: IssueComment | undefined = r;
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

  const renderRight = (entry: (typeof merged)[number]) => {
    if (entry.kind === "activity") {
      const item = entry.a;
      return (
        <div className="flex-1">
          <div className="flex flex-row items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400 ">
              {renderHeaderText(item)}
            </span>
            {renderDiffLine(item)}
            <span className="text-sm text-gray-500">
              {formatRelativeTime(item.created_at)}
            </span>
          </div>
        </div>
      );
    }
    const c = entry.c;
    const replies = getRepliesForRoot(String(c.id));

    // Handlers proxied to IssueCommentCard
    const handleSubmitReply = async (
      parentId: string,
      content: string
    ): Promise<void> => {
      try {
        setIsSubmitting(true);
        const newReply = await createIssueCommentAction(
          issueId,
          content,
          parentId
        );
        issueCommentsManager.addComment(issueId, newReply);
        setComments((prev) => [...prev, newReply]);
        setReplyingToCommentId(null);
        setReplyContent("");
      } catch (e) {
        console.error(e);
      } finally {
        setIsSubmitting(false);
      }
    };

    const handleSaveEdit = async (
      commentId: string,
      content: string
    ): Promise<void> => {
      if (!content.trim()) return;
      try {
        setIsSubmitting(true);
        const updated = await updateIssueCommentAction(commentId, content);
        issueCommentsManager.updateComment(issueId, updated);
        setComments((prev) =>
          prev.map((x) => (String(x.id) === String(updated.id) ? updated : x))
        );
        setEditingCommentId(null);
        setEditingContent("");
      } catch (e) {
        console.error(e);
      } finally {
        setIsSubmitting(false);
      }
    };

    const handleDelete = async (commentId: string): Promise<void> => {
      try {
        setIsSubmitting(true);
        await deleteIssueCommentAction(commentId);
        issueCommentsManager.removeComment(issueId, commentId);
        setComments((prev) =>
          prev.filter((x) => String(x.id) !== String(commentId))
        );
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
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <div className="flex-1 -ml-10">
        <IssueCommentCard
          comment={c}
          replies={replies}
          userInfos={userInfos}
          formatRelativeTime={formatRelativeTime}
          hoveredCommentId={hoveredCommentId}
          setHoveredCommentId={setHoveredCommentId}
          replyingToCommentId={replyingToCommentId}
          setReplyingToCommentId={setReplyingToCommentId}
          replyContent={replyContent}
          setReplyContent={setReplyContent}
          onSubmitReply={handleSubmitReply}
          editingCommentId={editingCommentId}
          setEditingCommentId={setEditingCommentId}
          editingContent={editingContent}
          setEditingContent={setEditingContent}
          onSaveEdit={handleSaveEdit}
          onDelete={handleDelete}
          isSubmitting={isSubmitting}
        />
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-1 px-[26px] w-full">
      {merged.map((entry) => (
        <div
          key={
            entry.kind === "activity" ? `a-${entry.a.id}` : `c-${entry.c.id}`
          }
          className="flex flex-col items-stretch w-full"
        >
          <div className="flex items-start gap-2 w-full">
            <div className="w-5 flex items-center justify-center">
              {renderLeft(entry)}
            </div>
            {renderRight(entry)}
          </div>
          <div className="flex w-5 items-center justify-center">
            <div className="mt-1 w-px h-2 bg-gray-300 dark:bg-gray-700" />
          </div>
        </div>
      ))}

      {/* New root comment composer */}
      <div className="-ml-3 border rounded-lg border-gray-200 dark:border-gray-800 flex flex-col h-fit">
        <div className="h-fit">
          <MilkdownEditor
            key={newCommentKey}
            onContentChange={setNewCommentContent}
            initialContent=""
            isFullScreen={false}
            placeholder="Leave a comment..."
          />
        </div>
        <div className="flex justify-end p-2">
          <Button
            onClick={async () => {
              if (!newCommentContent.trim()) return;
              try {
                setIsSubmitting(true);
                const newComment = await createIssueCommentAction(
                  issueId,
                  newCommentContent
                );
                issueCommentsManager.addComment(issueId, newComment);
                setComments((prev) => [...prev, newComment]);
                setNewCommentContent("");
                setNewCommentKey(Math.random());
              } catch (e) {
                console.error(e);
              } finally {
                setIsSubmitting(false);
              }
            }}
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
