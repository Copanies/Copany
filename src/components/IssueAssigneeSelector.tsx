"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
  onAssigneeChange?: (issueId: string, newAssignee: string | null) => void;
  currentUser?: User | null;
  contributors?: CopanyContributor[];
  showText?: boolean;
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
}: IssueAssigneeSelectorProps) {
  const [currentAssignee, setCurrentAssignee] = useState(initialAssignee);
  const [currentAssigneeUser, setCurrentAssigneeUser] = useState(assigneeUser);

  // 当 props 中的 assignee 信息更新时，同步本地状态
  useEffect(() => {
    setCurrentAssignee(initialAssignee);
    setCurrentAssigneeUser(assigneeUser);
  }, [initialAssignee, assigneeUser]);

  const handleAssigneeChange = useCallback(
    async (newAssignee: string) => {
      try {
        const assigneeValue = newAssignee === "unassigned" ? null : newAssignee;
        setCurrentAssignee(assigneeValue);

        // 更新本地的 assignee user 信息
        if (assigneeValue) {
          // 从当前用户或贡献者中找到对应的用户信息
          let newAssigneeUser: AssigneeUser | null = null;

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

          setCurrentAssigneeUser(newAssigneeUser);
        } else {
          setCurrentAssigneeUser(null);
        }

        // 立即调用回调更新前端状态，提供即时反馈
        if (onAssigneeChange) {
          onAssigneeChange(issueId, assigneeValue);
        }

        // 然后调用更新 assignee 接口
        await updateIssueAssigneeAction(issueId, assigneeValue);

        console.log("Assignee updated successfully:", assigneeValue);
      } catch (error) {
        console.error("Error updating assignee:", error);
        // 出错时回滚状态
        setCurrentAssignee(initialAssignee);
        setCurrentAssigneeUser(assigneeUser);
        // 如果有回调，也需要回滚前端状态
        if (onAssigneeChange) {
          onAssigneeChange(issueId, initialAssignee);
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
    ]
  );

  // 构建分组选项 - 使用 useMemo 缓存
  const groups = useMemo(() => {
    const groups = [];

    // 添加 "Unassigned" 选项
    groups.push({
      title: null,
      options: [
        {
          value: "unassigned",
          label: renderUnassignedLabel(true),
        },
      ],
    });

    // 第一个分组：Me (当前用户)
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

    // 第二个分组：Contributors (贡献者，排除当前用户)
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
  }, [currentUser, contributors]);

  // 获取当前选中的值 - 使用 useMemo 缓存
  const selectedValue = useMemo(() => {
    if (!currentAssignee) return "unassigned";
    return currentAssignee;
  }, [currentAssignee]);

  // 渲染触发器显示内容 - 使用 useMemo 缓存
  const trigger = useMemo(() => {
    if (!currentAssignee) {
      return renderUnassignedLabel(showText);
    }

    // 优先使用 currentAssigneeUser 的信息（来自 IssueWithAssignee）
    if (currentAssigneeUser) {
      return renderUserLabel(
        currentAssigneeUser.name,
        currentAssigneeUser.avatar_url,
        showText
      );
    }

    // 如果没有 assigneeUser 信息，则查找当前用户或贡献者信息
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

    // 如果都找不到，显示一个默认的用户标签
    return renderUserLabel("Unknown User", null, showText);
  }, [
    currentAssignee,
    currentAssigneeUser,
    currentUser,
    contributors,
    showText,
  ]);

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

function renderUserLabel(
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
        <span className="text-sm text-gray-900 dark:text-gray-100">{name}</span>
      )}
    </div>
  );
}

function renderUnassignedLabel(showText: boolean) {
  return (
    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-500 -my-[1px]">
      <UserIconSolid className="w-[22px] h-[22px] p-[4px] text-gray-700 dark:text-gray-300 rounded-full border border-gray-300 dark:border-gray-600 border-dashed" />
      {showText && (
        <span className="text-sm text-gray-900 dark:text-gray-100">
          No assignee
        </span>
      )}
    </div>
  );
}
