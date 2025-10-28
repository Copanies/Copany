"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { updateIssueAssigneeAction } from "@/actions/issue.actions";
import { useUpdateIssueAssignee } from "@/hooks/issues";
import {
  CopanyContributorWithUserInfo,
  AssigneeUser,
} from "@/types/database.types";
import { User } from "@supabase/supabase-js";
import GroupedDropdown from "@/components/commons/GroupedDropdown";
import Image from "next/image";
import { shimmerDataUrlWithTheme } from "@/utils/shimmer";
import { useDarkMode } from "@/utils/useDarkMode";
import { UserIcon as UserIconSolid } from "@heroicons/react/24/solid";
import * as Tooltip from "@radix-ui/react-tooltip";
import { requestAssignmentToEditorsAction } from "@/actions/assignmentRequest.actions";
import { HandRaisedIcon } from "@heroicons/react/24/outline";
import { useQueryClient } from "@tanstack/react-query";
import UserAvatar from "@/components/commons/UserAvatar";

interface IssueAssigneeSelectorProps {
  issueId: string;
  initialAssignee: string | null;
  assigneeUser?: AssigneeUser | null;
  showBackground?: boolean;
  onAssigneeChange?: (
    issueId: string,
    newAssignee: string | null,
    assigneeUser: AssigneeUser | null
  ) => void;
  currentUser?: User | null;
  contributors?: CopanyContributorWithUserInfo[];
  showText?: boolean;
  disableServerUpdate?: boolean;
  readOnly?: boolean;
  onRequestAssignment?: () => void; // 当只读并点击 Self 时，触发页面级弹窗
  hasPendingByMe?: boolean; // 外部传入：当前用户是否在该 issue 有进行中的请求
  copanyId?: string;
}

export default function IssueAssigneeSelector({
  issueId,
  initialAssignee,
  assigneeUser,
  showBackground = false,
  onAssigneeChange,
  currentUser,
  contributors,
  showText = true,
  disableServerUpdate = false,
  readOnly = false,
  onRequestAssignment,
  hasPendingByMe = false,
  copanyId,
}: IssueAssigneeSelectorProps) {
  const [currentAssignee, setCurrentAssignee] = useState(initialAssignee);
  const [currentAssigneeUser, setCurrentAssigneeUser] = useState(assigneeUser);
  const mutation = useUpdateIssueAssignee(copanyId || "");
  const qc = useQueryClient();
  const isDarkMode = useDarkMode();

  // 当 props 变化时同步内部状态，确保外部缓存更新能反映到 UI
  useEffect(() => {
    setCurrentAssignee(initialAssignee);
  }, [initialAssignee]);
  useEffect(() => {
    setCurrentAssigneeUser(assigneeUser || null);
  }, [assigneeUser]);

  // 使用 useRef 稳定 mutation 方法，避免 effect 依赖整个对象
  const mutateRef = useRef(mutation.mutateAsync);
  useEffect(() => {
    mutateRef.current = mutation.mutateAsync;
  }, [mutation.mutateAsync]);

  const handleAssigneeChange = useCallback(
    async (newAssignee: string) => {
      // Read-only: selecting Self triggers an Assignment Request instead of updating
      if (readOnly) {
        try {
          if (currentUser && newAssignee === currentUser.id) {
            if (hasPendingByMe) return;
            if (onRequestAssignment) {
              onRequestAssignment();
            } else {
              await requestAssignmentToEditorsAction(issueId, null);
            }
            // 请求发起成功后，失效相关查询（assignment requests、activity）
            try {
              await Promise.all([
                qc.invalidateQueries({
                  queryKey: ["assignmentRequests", "issue", issueId],
                }),
                qc.invalidateQueries({ queryKey: ["issueActivity", issueId] }),
              ]);
            } catch (_) {}
          }
        } catch (error) {
          console.error("Error requesting assignment:", error);
        }
        return;
      }
      try {
        const assigneeValue = newAssignee === "unassigned" ? null : newAssignee;
        setCurrentAssignee(assigneeValue);

        // Update local assignee user information
        let newAssigneeUser: AssigneeUser | null = null;

        if (assigneeValue) {
          // Find corresponding user information from current user or contributors
          if (currentUser && assigneeValue === currentUser.id) {
            newAssigneeUser = {
              id: currentUser.id,
              name: currentUser.user_metadata?.name || "",
              email: currentUser.email || "",
              avatar_url: currentUser.user_metadata?.avatar_url || "",
            };
          } else {
            const contributor = contributors?.find(
              (c) => c.user_id === assigneeValue
            );
            if (contributor) {
              newAssigneeUser = {
                id: contributor.user_id,
                name: contributor.name,
                email: contributor.email,
                avatar_url: contributor.avatar_url,
              };
            }
          }
        }

        setCurrentAssigneeUser(newAssigneeUser);

        // Immediately call callback to update frontend state, provide instant feedback
        if (onAssigneeChange) {
          onAssigneeChange(issueId, assigneeValue, newAssigneeUser);
        }

        // Only call the update assignee API when not in creation mode
        if (!disableServerUpdate) {
          if (copanyId) {
            await mutateRef.current({ issueId, assignee: assigneeValue });
          } else {
            await updateIssueAssigneeAction(issueId, assigneeValue);
          }
          console.log("Assignee updated successfully:", assigneeValue);

          // 指派变化会产生活动，触发活动流与 Issues 查询失效
          try {
            await Promise.all([
              qc.invalidateQueries({ queryKey: ["issueActivity", issueId] }),
              copanyId
                ? qc.invalidateQueries({ queryKey: ["issues", copanyId] })
                : Promise.resolve(),
            ]);
          } catch (_) {}
        }
      } catch (error) {
        console.error("Error updating assignee:", error);
        // Rollback state on error
        setCurrentAssignee(initialAssignee);
        setCurrentAssigneeUser(assigneeUser);
        // If there's a callback, also need to rollback frontend state
        if (onAssigneeChange) {
          onAssigneeChange(issueId, initialAssignee, assigneeUser || null);
        }
      }
    },
    [
      currentUser,
      contributors,
      onAssigneeChange,
      issueId,
      initialAssignee,
      assigneeUser,
      disableServerUpdate,
      readOnly,
      onRequestAssignment,
      hasPendingByMe,
      copanyId,
      qc,
    ]
  );

  // Build grouped options
  const groups = (() => {
    const groups = [] as Array<{
      title: string | null;
      options: Array<{
        value: string;
        label: React.ReactElement;
        disabled?: boolean;
        tooltip?: string;
      }>;
    }>;

    // Add "Unassigned" option
    groups.push({
      title: null,
      options: [
        {
          value: "unassigned",
          label: renderUnassignedLabel(true),
          disabled: readOnly,
          tooltip: readOnly ? "No permission to edit" : undefined,
        },
      ],
    });

    // First group: Me (current user)
    if (currentUser) {
      groups.push({
        title: "Self",
        options: [
          {
            value: currentUser.id,
            label: (
              <div className="flex items-center gap-1 justify-between w-full">
                {renderUserLabel(
                  currentUser.user_metadata?.name || "",
                  currentUser.user_metadata?.avatar_url || null,
                  true,
                  isDarkMode,
                  currentUser.email || null,
                  readOnly
                )}
                {readOnly ? (
                  <HandRaisedIcon className="w-4 h-4 -rotate-30" />
                ) : null}
              </div>
            ),
            // allow clicking even in read-only to request assignment unless already sent
            disabled: readOnly ? hasPendingByMe : false,
            tooltip: readOnly
              ? hasPendingByMe
                ? "Request already sent"
                : "Request assignment"
              : undefined,
          },
        ],
      });
    }

    // Second group: Contributors (excluding current user)
    const otherContributors =
      contributors?.filter(
        (contributor) => contributor.user_id !== currentUser?.id
      ) || [];

    if (otherContributors.length > 0) {
      groups.push({
        title: "Contributors",
        options: otherContributors.map((contributor) => ({
          value: contributor.user_id,
          label: renderUserLabel(
            contributor.name,
            contributor.avatar_url,
            true,
            isDarkMode,
            contributor.email,
            readOnly
          ),
          disabled: readOnly,
          tooltip: readOnly ? "No permission to edit" : undefined,
        })),
      });
    }

    return groups;
  })();

  // Get the currently selected value
  const selectedValue = (() => {
    if (!currentAssignee) return "unassigned";
    return currentAssignee;
  })();

  // Render trigger display content
  const trigger = (() => {
    if (!currentAssignee) {
      return renderUnassignedLabel(showText);
    }

    // Prioritize currentAssigneeUser information (from IssueWithAssignee)
    if (currentAssigneeUser) {
      return renderUserLabel(
        currentAssigneeUser.name,
        currentAssigneeUser.avatar_url,
        showText,
        isDarkMode,
        currentAssigneeUser.email
      );
    }

    // If no assigneeUser information, find current user or contributor information
    if (currentUser && currentAssignee === currentUser.id) {
      return renderUserLabel(
        currentUser.user_metadata?.name || "",
        currentUser.user_metadata?.avatar_url || null,
        showText,
        isDarkMode,
        currentUser.email || null
      );
    }

    const contributor = contributors?.find(
      (c) => c.user_id === currentAssignee
    );
    if (contributor) {
      return renderUserLabel(
        contributor.name,
        contributor.avatar_url,
        showText,
        isDarkMode,
        contributor.email
      );
    }

    // If not found, display a default user label
    return renderUserLabel("", null, showText, isDarkMode, null);
  })();

  return (
    <GroupedDropdown
      trigger={trigger}
      groups={groups}
      selectedValue={selectedValue}
      onSelect={handleAssigneeChange}
      showBackground={showBackground}
      disabled={false}
    />
  );
}

export function renderUserLabel(
  name: string,
  avatarUrl: string | null,
  showText: boolean,
  isDarkMode: boolean,
  email?: string | null,
  readOnly?: boolean | null
) {
  const labelContent = (
    <div className="flex items-center gap-2 -my-[1px]">
      <UserAvatar
        name={name}
        avatarUrl={avatarUrl}
        email={readOnly ? undefined : email}
        size="md"
        showTooltip={!readOnly}
      />
      {showText && (
        <span className="text-base text-gray-900 dark:text-gray-100">
          {name}
        </span>
      )}
    </div>
  );

  return labelContent;
}

export function renderUnassignedLabel(showText: boolean) {
  return (
    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-500 -my-[1px]">
      <UserIconSolid className="w-[22px] h-[22px] p-[4px] text-gray-600 dark:text-gray-400 rounded-full border border-gray-300 dark:border-gray-600 border-dashed" />
      {showText && (
        <span className="text-base text-gray-900 dark:text-gray-100">
          No assignee
        </span>
      )}
    </div>
  );
}

// Small version for compact places like Activity timeline (20px avatar)
export function renderUserLabelSm(
  name: string,
  avatarUrl: string | null,
  showText: boolean,
  isDarkMode: boolean,
  email?: string | null
) {
  return (
    <div className="flex items-center gap-1 -my-[1px]">
      <UserAvatar
        name={name}
        avatarUrl={avatarUrl}
        email={email}
        size="sm"
        showTooltip={true}
      />
      {showText && (
        <span className="text-sm text-gray-900 dark:text-gray-100">{name}</span>
      )}
    </div>
  );
}

export function renderUnassignedLabelSm(showText: boolean) {
  return (
    <div className="flex items-center gap-1 text-gray-500 dark:text-gray-500 -my-[1px]">
      <UserIconSolid className="w-5 h-5 p-[2px] text-gray-600 dark:text-gray-400 rounded-full border border-gray-300 dark:border-gray-600 border-dashed" />
      {showText && (
        <span className="text-sm text-gray-900 dark:text-gray-100">
          No assignee
        </span>
      )}
    </div>
  );
}
