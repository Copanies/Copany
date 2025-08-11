"use client";

import { useState, useCallback } from "react";
import { updateIssueAssigneeAction } from "@/actions/issue.actions";
import { CopanyContributor, AssigneeUser } from "@/types/database.types";
import { User } from "@supabase/supabase-js";
import GroupedDropdown from "@/components/commons/GroupedDropdown";
import Image from "next/image";
import { UserIcon as UserIconSolid } from "@heroicons/react/24/solid";

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
  contributors?: CopanyContributor[];
  showText?: boolean;
  disableServerUpdate?: boolean;
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
}: IssueAssigneeSelectorProps) {
  const [currentAssignee, setCurrentAssignee] = useState(initialAssignee);
  const [currentAssigneeUser, setCurrentAssigneeUser] = useState(assigneeUser);

  const handleAssigneeChange = useCallback(
    async (newAssignee: string) => {
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
              name: currentUser.user_metadata?.name || "Unknown",
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
          await updateIssueAssigneeAction(issueId, assigneeValue);
          console.log("Assignee updated successfully:", assigneeValue);
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
    ]
  );

  // Build grouped options
  const groups = (() => {
    const groups = [];

    // Add "Unassigned" option
    groups.push({
      title: null,
      options: [
        {
          value: "unassigned",
          label: renderUnassignedLabel(true),
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
            label: renderUserLabel(
              currentUser.user_metadata?.name || "Unknown",
              currentUser.user_metadata?.avatar_url || null,
              true
            ),
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
            true
          ),
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
        showText
      );
    }

    // If no assigneeUser information, find current user or contributor information
    if (currentUser && currentAssignee === currentUser.id) {
      return renderUserLabel(
        currentUser.user_metadata?.name || "Unknown",
        currentUser.user_metadata?.avatar_url || null,
        showText
      );
    }

    const contributor = contributors?.find(
      (c) => c.user_id === currentAssignee
    );
    if (contributor) {
      return renderUserLabel(
        contributor.name,
        contributor.avatar_url,
        showText
      );
    }

    // If not found, display a default user label
    return renderUserLabel("Unknown User", null, showText);
  })();

  return (
    <GroupedDropdown
      trigger={trigger}
      groups={groups}
      selectedValue={selectedValue}
      onSelect={handleAssigneeChange}
      showBackground={showBackground}
    />
  );
}

export function renderUserLabel(
  name: string,
  avatarUrl: string | null,
  showText: boolean
) {
  return (
    <div className="flex items-center gap-2 -my-[1px]">
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={name}
          width={22}
          height={22}
          className="w-[22px] h-[22px] rounded-full"
        />
      ) : (
        <div className="w-[22px] h-[22px] bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300">
          {name}
        </div>
      )}
      {showText && (
        <span className="text-base text-gray-900 dark:text-gray-100">
          {name}
        </span>
      )}
    </div>
  );
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
  showText: boolean
) {
  return (
    <div className="flex items-center gap-1 -my-[1px]">
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={name}
          width={20}
          height={20}
          className="w-5 h-5 rounded-full"
        />
      ) : (
        <div className="w-5 h-5 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center text-[9px] font-medium text-gray-600 dark:text-gray-300">
          {name}
        </div>
      )}
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
