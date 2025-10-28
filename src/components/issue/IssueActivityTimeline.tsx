"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  IssueActivity,
  IssueActivityType,
  IssueState,
  IssuePriority,
  IssueLevel,
  IssueActivityPayload,
} from "@/types/database.types";
import { formatRelativeTime } from "@/utils/time";
import { renderLevelLabel } from "@/components/issue/IssueLevelSelector";
import { renderPriorityLabel } from "@/components/issue/IssuePrioritySelector";
import { renderStateLabel } from "@/components/issue/IssueStateSelector";
import type { IssueComment } from "@/types/database.types";
import MilkdownEditor from "@/components/commons/MilkdownEditor";
import Button from "@/components/commons/Button";
import { ArrowUpIcon } from "@heroicons/react/24/outline";
import IssueCommentCard from "@/components/issue/IssueCommentCard";
import IssueReviewPanel from "@/components/issue/IssueReviewPanel";
import AssignmentRequestPanel from "@/components/issue/AssignmentRequestPanel";
import type { AssignmentRequest } from "@/types/database.types";
import { useQueryClient } from "@tanstack/react-query";
import { useIssueActivity } from "@/hooks/activity";
import {
  useComments,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
} from "@/hooks/comments";
import { useAssignmentRequests } from "@/hooks/assignmentRequests";
import { useCurrentUser } from "@/hooks/currentUser";
import { useUsersInfo } from "@/hooks/userInfo";
import { EMPTY_ARRAY, EMPTY_OBJECT } from "@/utils/constants";
import UserAvatar from "@/components/commons/UserAvatar";

interface IssueActivityTimelineProps {
  issueId: string;
  copanyId: string;
  canEdit: boolean;
  issueState?: number | null;
  issueLevel?: number | null;
}

export default function IssueActivityTimeline({
  issueId,
  copanyId,
  canEdit,
  issueState,
  issueLevel,
}: IssueActivityTimelineProps) {
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

  const queryClient = useQueryClient();
  const isValidIssueId = /^\d+$/.test(String(issueId));

  // React Query hooks
  const { data: activities = EMPTY_ARRAY } = useIssueActivity(issueId, 200);
  const { data: comments = EMPTY_ARRAY } = useComments(issueId);
  const { data: assignmentRequests = EMPTY_ARRAY } =
    useAssignmentRequests(issueId);
  const { data: currentUser } = useCurrentUser();

  // Collect user IDs from activities and comments
  const userIds = useMemo(() => {
    const idSet = new Set<string>();

    // From activities
    for (const activity of activities) {
      if (activity.actor_id) idSet.add(String(activity.actor_id));
      const payload = (activity.payload ??
        EMPTY_OBJECT) as IssueActivityPayload;
      if (payload.from_user_id) idSet.add(String(payload.from_user_id));
      if (payload.to_user_id) idSet.add(String(payload.to_user_id));
      if (payload.reviewer_id) idSet.add(String(payload.reviewer_id));
      if (payload.requester_id) idSet.add(String(payload.requester_id));
      if (payload.recipient_id) idSet.add(String(payload.recipient_id));
    }

    // From comments
    for (const comment of comments) {
      if (comment.created_by) idSet.add(String(comment.created_by));
    }

    // Add current user if logged in
    if (currentUser?.id) {
      idSet.add(String(currentUser.id));
    }

    return Array.from(idSet);
  }, [activities, comments, currentUser?.id]);

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
        name: userInfo.name || "",
        email: userInfo.email,
        avatar_url: userInfo.avatar_url || "",
      };
    }
    return map;
  }, [userInfosMap]);

  // Compute requester panels from assignment requests
  const requesterPanels = useMemo(() => {
    if (!isValidIssueId || !assignmentRequests.length) return [];

    const byRequester = new Map<string, AssignmentRequest[]>();
    for (const request of assignmentRequests) {
      const key = String(request.requester_id);
      const arr = byRequester.get(key) ?? [];
      arr.push(request);
      byRequester.set(key, arr);
    }

    const panels: { requesterId: string; at: string }[] = [];
    for (const [requesterId, list] of byRequester.entries()) {
      const sorted = list
        .slice()
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

      // Without status, any remaining rows are pending; if any exist, create a panel
      if (sorted.length === 0) continue;
      const at = sorted[0].created_at;
      panels.push({ requesterId, at });
    }

    return panels;
  }, [assignmentRequests, isValidIssueId]);

  // Comment mutations
  const createCommentMutation = useCreateComment(issueId);
  const updateCommentMutation = useUpdateComment(issueId);
  const deleteCommentMutation = useDeleteComment(issueId);

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
    const p = (item.payload ?? EMPTY_OBJECT) as IssueActivityPayload;
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
    ...activities.map((a) => ({
      kind: "activity" as const,
      at: a.created_at,
      a,
    })),
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
      if (item.actor_id)
        return (
          <UserAvatar
            name={userInfos[item.actor_id]?.name || ""}
            avatarUrl={userInfos[item.actor_id]?.avatar_url || null}
            email={userInfos[item.actor_id]?.email}
            size="sm"
            showTooltip={true}
          />
        );
      return null;
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
            copanyId={copanyId}
            requesterId={entry.requesterId}
            meId={currentUser?.id ?? null}
            canEdit={canEdit}
            onFocusNewComment={() =>
              setNewCommentFocusSignal((x) => (x == null ? 1 : x + 1))
            }
            onActivityChanged={async () => {
              // Invalidate related queries to refresh data
              await Promise.all([
                queryClient.invalidateQueries({
                  queryKey: ["issueActivity", issueId],
                }),
                queryClient.invalidateQueries({
                  queryKey: ["assignmentRequests", "issue", issueId],
                }),
              ]);
            }}
          />
        </div>
      );
    }
    const c = entry.c;
    const replies = getRepliesForRoot(String(c.id));

    // Handlers using React Query mutations
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
          isSubmitting={
            createCommentMutation.isPending ||
            updateCommentMutation.isPending ||
            deleteCommentMutation.isPending
          }
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
        copanyId={copanyId}
        issueId={issueId}
        issueState={issueState ?? null}
        issueLevel={issueLevel ?? null}
        meId={currentUser?.id ?? null}
        canEdit={canEdit}
        onFocusNewComment={() =>
          setNewCommentFocusSignal((x) => (x == null ? 1 : x + 1))
        }
        onActivityChanged={async () => {
          // Invalidate issue activity to refresh data
          await queryClient.invalidateQueries({
            queryKey: ["issueActivity", issueId],
          });
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
