"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import {
  IssueActivity,
  IssueActivityType,
  IssueState,
  IssuePriority,
  IssueLevel,
  IssueActivityPayload,
} from "@/types/database.types";
import { listIssueActivityAction } from "@/actions/issueActivity.actions";
import {
  issueActivityManager,
  userInfoManager,
  currentUserManager,
} from "@/utils/cache";
import { formatRelativeTime } from "@/utils/time";
import { renderLevelLabel } from "@/components/IssueLevelSelector";
import { renderPriorityLabel } from "@/components/IssuePrioritySelector";
import { renderStateLabel } from "@/components/IssueStateSelector";
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
import * as Tooltip from "@radix-ui/react-tooltip";
import IssueCommentCard from "@/components/IssueCommentCard";
import IssueReviewPanel from "@/components/IssueReviewPanel";
import AssignmentRequestPanel from "@/components/AssignmentRequestPanel";
import { assignmentRequestsManager } from "@/utils/cache";
import { listAssignmentRequestsAction } from "@/actions/assignmentRequest.actions";

interface IssueActivityTimelineProps {
  issueId: string;
  canEdit: boolean;
  issueState?: number | null;
  issueLevel?: number | null;
}

export default function IssueActivityTimeline({
  issueId,
  canEdit,
  issueState,
  issueLevel,
}: IssueActivityTimelineProps) {
  const [items, setItems] = useState<IssueActivity[]>([]);
  const [comments, setComments] = useState<IssueComment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>("");
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(
    null
  );
  const [replyContent, setReplyContent] = useState<string>("");
  const [newCommentContent, setNewCommentContent] = useState<string>("");
  const [newCommentKey, setNewCommentKey] = useState<number>(Math.random());
  const [newCommentFocusSignal, setNewCommentFocusSignal] = useState<
    number | undefined
  >(undefined);
  const [hoveredCommentId, setHoveredCommentId] = useState<string | null>(null);
  const [userInfos, setUserInfos] = useState<
    Record<string, { name: string; email: string; avatar_url: string }>
  >({});
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  const [requesterPanels, setRequesterPanels] = useState<
    { requesterId: string; at: string }[]
  >([]);

  useEffect(() => {
    const load = async () => {
      const data = await issueActivityManager.getActivities(issueId, () =>
        listIssueActivityAction(issueId, 200)
      );
      setItems(data);
      // load assignment requests group heads (only requested) and compute earliest created_at per requester
      // replaced with: load assignment requests panels: compute current batch per requester and hide if batch ended
      try {
        const reqs = await assignmentRequestsManager.getRequests(issueId, () =>
          listAssignmentRequestsAction(issueId)
        );
        const byRequester = new Map<string, typeof reqs>();
        for (const r of reqs) {
          const key = String(r.requester_id);
          const arr = byRequester.get(key) || [];
          arr.push(r);
          byRequester.set(key, arr);
        }
        const panels: { requesterId: string; at: string }[] = [];
        for (const [requesterId, list] of byRequester.entries()) {
          const sorted = list
            .slice()
            .sort(
              (a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime()
            );
          const lastTerminalAt = sorted
            .filter((r) => r.status === "refused" || r.status === "accepted")
            .reduce<string | null>((acc, r) => {
              const t = r.updated_at || r.created_at;
              if (!acc) return t;
              return new Date(t).getTime() > new Date(acc).getTime() ? t : acc;
            }, null);
          const currentBatch = sorted.filter((r) =>
            lastTerminalAt
              ? new Date(r.created_at).getTime() >
                new Date(lastTerminalAt).getTime()
              : true
          );
          if (currentBatch.length === 0) continue;
          if (currentBatch.some((r) => r.status !== "requested")) {
            continue;
          }
          const requestedOnly = currentBatch.filter(
            (r) => r.status === "requested"
          );
          if (requestedOnly.length === 0) continue;
          const at = requestedOnly[0].created_at;
          panels.push({ requesterId, at });
        }
        setRequesterPanels(panels);
      } catch (e) {
        // ignore
      }
      // load comments (root only)
      const allComments = await issueCommentsManager.getComments(issueId, () =>
        getIssueCommentsAction(issueId)
      );
      setComments(allComments);
      const idSet = new Set<string>();
      for (const a of data) {
        if (a.actor_id) idSet.add(String(a.actor_id));
        const p = (a.payload ?? {}) as IssueActivityPayload;
        if (p.from_user_id) idSet.add(String(p.from_user_id));
        if (p.to_user_id) idSet.add(String(p.to_user_id));
      }
      for (const c of allComments) {
        if (c.created_by) idSet.add(String(c.created_by));
      }
      // Ensure current logged-in user is present in userInfos by default
      try {
        const me = await currentUserManager.getCurrentUser();
        if (me?.id) {
          idSet.add(String(me.id));
          console.log("currentUserManager me", me);
          setCurrentUser({ id: String(me.id) });
        }
      } catch (e) {
        // ignore if unauthenticated
        console.error(e);
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
          setUserInfos(map);
        }
      }
    };
    load();

    // subscribe to cache updates to refresh UI immediately after background refresh
    const onCacheUpdated = (e: Event) => {
      try {
        const detail = (e as CustomEvent).detail as {
          manager: string;
          key: string;
          data: unknown;
        };
        if (!detail) return;
        if (
          detail.manager === "IssueActivityManager" &&
          detail.key === issueId
        ) {
          setItems(detail.data as any);
        }
        if (
          detail.manager === "AssignmentRequestsManager" &&
          detail.key === issueId
        ) {
          // recompute panels when assignment requests cache updates
          const reqs = detail.data as any[];
          const byRequester = new Map<string, any[]>();
          for (const r of reqs) {
            const key = String(r.requester_id);
            const arr = byRequester.get(key) || [];
            arr.push(r);
            byRequester.set(key, arr);
          }
          const panels: { requesterId: string; at: string }[] = [];
          for (const [requesterId, list] of byRequester.entries()) {
            const sorted = list
              .slice()
              .sort(
                (a, b) =>
                  new Date(a.created_at).getTime() -
                  new Date(b.created_at).getTime()
              );
            const lastTerminalAt = sorted
              .filter((r) => r.status === "refused" || r.status === "accepted")
              .reduce<string | null>((acc, r) => {
                const t = r.updated_at || r.created_at;
                if (!acc) return t;
                return new Date(t).getTime() > new Date(acc).getTime()
                  ? t
                  : acc;
              }, null);
            const currentBatch = sorted.filter((r) =>
              lastTerminalAt
                ? new Date(r.created_at).getTime() >
                  new Date(lastTerminalAt).getTime()
                : true
            );
            if (currentBatch.length === 0) continue;
            if (currentBatch.some((r) => r.status !== "requested")) {
              continue;
            }
            const requestedOnly = currentBatch.filter(
              (r) => r.status === "requested"
            );
            if (requestedOnly.length === 0) continue;
            const at = requestedOnly[0].created_at;
            panels.push({ requesterId, at });
          }
          setRequesterPanels(panels);
        }
      } catch (_) {}
    };
    if (typeof window !== "undefined") {
      window.addEventListener("cache:updated", onCacheUpdated as any);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("cache:updated", onCacheUpdated as any);
      }
    };
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
      case IssueState.InReview:
        return "In Review";
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

  const renderHeaderCompact = (item: IssueActivity): ReactNode => {
    const who = item.actor_id ? userInfos[item.actor_id]?.name || "" : "System";
    const p = (item.payload ?? {}) as IssueActivityPayload;
    const title = p.issue_title ? `"${p.issue_title}"` : "Issue";
    switch (item.type as IssueActivityType) {
      case "issue_created":
        return (
          <>
            <span className="font-medium">{who}</span> created {title}
          </>
        );
      case "title_changed":
        return (
          <>
            <span className="font-medium">{who}</span> updated the title to
            &quot;{p.to_title || ""}&quot;
          </>
        );
      case "state_changed":
        return (
          <>
            <span className="font-medium">{who}</span> changed state to{" "}
            {getStateName(p.to_state)}
          </>
        );
      case "priority_changed":
        return (
          <>
            <span className="font-medium">{who}</span> changed priority to{" "}
            {getPriorityName(p.to_priority)}
          </>
        );
      case "level_changed":
        return (
          <>
            <span className="font-medium">{who}</span> changed level to{" "}
            {getLevelName(p.to_level)}
          </>
        );
      case "assignee_changed": {
        const toInfo = p.to_user_id ? userInfos[String(p.to_user_id)] : null;
        const toLabel = toInfo?.name ? `@${toInfo.name}` : "Unassigned";
        return (
          <>
            <span className="font-medium">{who}</span> changed the assignee to{" "}
            {toLabel}
          </>
        );
      }
      case "review_requested": {
        const name =
          p.reviewer_name ||
          (p.reviewer_id ? userInfos[String(p.reviewer_id)]?.name : "");
        return (
          <>
            <span className="font-medium">{who}</span> requested review from{" "}
            {name || "a reviewer"}
          </>
        );
      }
      case "review_approved": {
        const name =
          p.reviewer_name ||
          (p.reviewer_id ? userInfos[String(p.reviewer_id)]?.name : "");
        return (
          <>
            <span className="font-medium">{who}</span> approved the review (
            {name || "reviewer"})
          </>
        );
      }
      case "assignment_requested": {
        const requester =
          p.requester_name ||
          (p.requester_id ? userInfos[String(p.requester_id)]?.name : "");
        return (
          <>
            <span className="font-medium">{requester || who}</span> requested to
            be assigned
          </>
        );
      }
      case "assignment_request_accepted": {
        const recipient =
          p.recipient_name ||
          (p.recipient_id ? userInfos[String(p.recipient_id)]?.name : "");
        const requester =
          p.requester_name ||
          (p.requester_id ? userInfos[String(p.requester_id)]?.name : "");
        return (
          <>
            <span className="font-medium">{recipient || who}</span> accepted{" "}
            {requester ? `@${requester}` : "the"} assignment request
          </>
        );
      }
      case "assignment_request_refused": {
        const recipient =
          p.recipient_name ||
          (p.recipient_id ? userInfos[String(p.recipient_id)]?.name : "");
        const requester =
          p.requester_name ||
          (p.requester_id ? userInfos[String(p.requester_id)]?.name : "");
        return (
          <>
            <span className="font-medium">{recipient || who}</span> refused{" "}
            {requester ? `@${requester}` : "the"} assignment request
          </>
        );
      }
      case "issue_closed":
        return (
          <>
            <span className="font-medium">{who}</span> closed {title}
          </>
        );
      default:
        return (
          <>
            <span className="font-medium">{who}</span> updated {title}
          </>
        );
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

  // Build merged entries (activities + root comments + assignment request panels) sorted by time asc
  const rootComments = comments.filter((c) => c.parent_id == null);
  type MergedEntry =
    | { kind: "activity"; at: string; a: IssueActivity }
    | { kind: "comment"; at: string; c: IssueComment }
    | { kind: "assign_panel"; at: string; requesterId: string };
  const merged: MergedEntry[] = [
    ...items.map((a) => ({ kind: "activity" as const, at: a.created_at, a })),
    ...rootComments.map((c) => ({
      kind: "comment" as const,
      at: c.created_at,
      c,
    })),
    ...requesterPanels.map((p) => ({
      kind: "assign_panel" as const,
      at: p.at,
      requesterId: p.requesterId,
    })),
  ].sort((x, y) => new Date(x.at).getTime() - new Date(y.at).getTime());

  const renderLeft = (entry: (typeof merged)[number]) => {
    if (entry.kind === "activity") {
      const item = entry.a;
      if (item.type === "state_changed")
        return renderStateLabel(
          (item.payload as IssueActivityPayload)?.to_state ?? null,
          false
        );
      if (item.type === "priority_changed")
        return renderPriorityLabel(
          (item.payload as IssueActivityPayload)?.to_priority ?? null,
          false
        );
      if (item.type === "level_changed")
        return renderLevelLabel(
          (item.payload as IssueActivityPayload)?.to_level ?? null,
          false
        );
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
    // In timeline, comment and assignment request panel items should not render extra avatar on the left
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
          <div className="flex flex-row items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {renderHeaderCompact(item)}
              <span className="pl-2 text-sm text-gray-500 whitespace-nowrap">
                {formatRelativeTime(item.created_at)}
              </span>
            </span>
          </div>
        </div>
      );
    }
    if (entry.kind === "assign_panel") {
      return (
        <div className="flex-1 -ml-10">
          <AssignmentRequestPanel
            key={entry.requesterId}
            issueId={issueId}
            requesterId={entry.requesterId}
            meId={currentUser?.id ?? null}
            canEdit={canEdit}
            onFocusNewComment={() =>
              setNewCommentFocusSignal((x) => (x == null ? 1 : x + 1))
            }
            onActivityChanged={async () => {
              const [fresh, reqs] = await Promise.all([
                listIssueActivityAction(issueId, 200),
                listAssignmentRequestsAction(issueId),
              ]);
              setItems(fresh);
              const byRequester = new Map<string, typeof reqs>();
              for (const r of reqs) {
                const key = String(r.requester_id);
                const arr = byRequester.get(key) || [];
                arr.push(r);
                byRequester.set(key, arr);
              }
              const panels: { requesterId: string; at: string }[] = [];
              for (const [requesterId, list] of byRequester.entries()) {
                const sorted = list
                  .slice()
                  .sort(
                    (a, b) =>
                      new Date(a.created_at).getTime() -
                      new Date(b.created_at).getTime()
                  );
                const lastTerminalAt = sorted
                  .filter(
                    (r) => r.status === "refused" || r.status === "accepted"
                  )
                  .reduce<string | null>((acc, r) => {
                    const t = r.updated_at || r.created_at;
                    if (!acc) return t;
                    return new Date(t).getTime() > new Date(acc).getTime()
                      ? t
                      : acc;
                  }, null);
                const currentBatch = sorted.filter((r) =>
                  lastTerminalAt
                    ? new Date(r.created_at).getTime() >
                      new Date(lastTerminalAt).getTime()
                    : true
                );
                if (currentBatch.length === 0) continue;
                if (currentBatch.some((r) => r.status !== "requested")) {
                  continue;
                }
                const requestedOnly = currentBatch.filter(
                  (r) => r.status === "requested"
                );
                if (requestedOnly.length === 0) continue;
                const at = requestedOnly[0].created_at;
                panels.push({ requesterId, at });
              }
              setRequesterPanels(panels);
            }}
          />
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
          isLoggedIn={!!currentUser}
        />
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-1 pl-[26px] w-full">
      {merged.map((entry) => (
        <div
          key={
            entry.kind === "activity"
              ? `a-${entry.a.id}`
              : entry.kind === "comment"
              ? `c-${entry.c.id}`
              : `p-${entry.requesterId}-${entry.at}`
          }
          className="flex flex-col items-stretch w-full gap-0"
        >
          <div className="flex items-stretch gap-2 w-full">
            <div className="w-5 flex flex-col self-stretch items-center justify-start">
              {renderLeft(entry)}
              {entry.kind === "activity" && (
                <div className="flex w-5 flex-1 items-center justify-center">
                  <div className="mt-1 -mb-1 w-px h-full bg-gray-300 dark:bg-gray-700" />
                </div>
              )}
            </div>
            {renderRight(entry)}
          </div>
          <div className="flex w-5 items-center justify-center">
            <div className="mt-1 w-px h-2 bg-gray-300 dark:bg-gray-700" />
          </div>
        </div>
      ))}

      {/* Assignment Request panels are now interleaved in the timeline via merged entries */}

      {/* Reviewer panel at the bottom, above new comment composer */}
      <IssueReviewPanel
        issueId={issueId}
        issueState={issueState ?? null}
        issueLevel={issueLevel ?? null}
        meId={currentUser?.id ?? null}
        canEdit={canEdit}
        onFocusNewComment={() =>
          setNewCommentFocusSignal((x) => (x == null ? 1 : x + 1))
        }
        onActivityChanged={async () => {
          const fresh = await listIssueActivityAction(issueId, 200);
          setItems(fresh);
        }}
      />

      {/* New root comment composer */}
      <div
        className="-ml-3 border rounded-lg border-gray-200 dark:border-gray-800 flex flex-col h-fit"
        id="new-comment-composer"
      >
        <div className="h-fit px-1">
          <MilkdownEditor
            key={`${newCommentKey}-${currentUser ? "logged-in" : "logged-out"}`}
            onContentChange={setNewCommentContent}
            initialContent=""
            placeholder={
              currentUser
                ? "Leave a comment..."
                : "Sign in to join the discussion"
            }
            focusSignal={newCommentFocusSignal}
            isReadonly={!currentUser}
          />
        </div>
        <div className="flex justify-end p-2">
          {currentUser ? (
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
          ) : (
            <Tooltip.Provider delayDuration={150} skipDelayDuration={300}>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <div className="inline-block">
                    <Button disabled shape="square" size="sm" className="!p-1">
                      <ArrowUpIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    side="top"
                    sideOffset={8}
                    align="end"
                    className="tooltip-surface"
                  >
                    Sign in to join the discussion
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>
          )}
        </div>
      </div>
    </div>
  );
}
