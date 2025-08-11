"use client";

import Image from "next/image";
import { useState } from "react";
import MilkdownView from "@/components/MilkdownView";
import MilkdownEditor from "@/components/MilkdownEditor";
import Button from "@/components/commons/Button";
import Dropdown from "@/components/commons/Dropdown";
import { ArrowTurnUpLeftIcon } from "@heroicons/react/24/outline";
import EllipsisHorizontalIcon from "@heroicons/react/24/outline/EllipsisHorizontalIcon";
import type { IssueComment } from "@/types/database.types";

interface IssueCommentCardProps {
  comment: IssueComment;
  replies: IssueComment[];
  userInfos: Record<
    string,
    { name: string; email: string; avatar_url: string }
  >;
  formatRelativeTime: (iso: string) => string;

  hoveredCommentId: string | null;
  setHoveredCommentId: (id: string | null) => void;

  replyingToCommentId: string | null;
  setReplyingToCommentId: (id: string | null) => void;
  replyContent: string;
  setReplyContent: (content: string) => void;
  onSubmitReply: (parentId: string, content: string) => Promise<void>;

  editingCommentId: string | null;
  setEditingCommentId: (id: string | null) => void;
  editingContent: string;
  setEditingContent: (content: string) => void;
  onSaveEdit: (commentId: string, content: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  isSubmitting: boolean;
}

export default function IssueCommentCard(props: IssueCommentCardProps) {
  const {
    comment,
    replies,
    userInfos,
    formatRelativeTime,
    hoveredCommentId,
    setHoveredCommentId,
    replyingToCommentId,
    setReplyingToCommentId,
    replyContent,
    setReplyContent,
    onSubmitReply,
    editingCommentId,
    setEditingCommentId,
    editingContent,
    setEditingContent,
    onSaveEdit,
    onDelete,
    isSubmitting,
  } = props;

  const author = comment.created_by ? userInfos[comment.created_by]?.name : "";
  const [openMenuCommentId, setOpenMenuCommentId] = useState<string | null>(
    null
  );

  return (
    <div className="flex flex-col gap-0 border border-gray-200 dark:border-gray-800 rounded-lg">
      {/* Root header */}
      <div
        className="flex justify-between items-start px-3 pt-3 group"
        onMouseEnter={(e) => {
          e.stopPropagation();
          setHoveredCommentId(String(comment.id));
        }}
        onMouseLeave={(e) => {
          e.stopPropagation();
          if (openMenuCommentId !== String(comment.id)) {
            setHoveredCommentId(null);
          }
        }}
      >
        <div className="flex items-center space-x-2">
          {comment.created_by && userInfos[comment.created_by]?.avatar_url ? (
            <>
              <Image
                src={userInfos[comment.created_by]!.avatar_url}
                alt={userInfos[comment.created_by]!.name || "User"}
                width={20}
                height={20}
                className="w-5 h-5 rounded-full"
              />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100 text-center">
                {userInfos[comment.created_by]!.name}
              </span>
            </>
          ) : (
            <>
              <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300">
                {author?.[0]?.toUpperCase() || "U"}
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100 text-center">
                {author || "Unknown User"}
              </span>
            </>
          )}
          <div className="text-sm text-gray-500 text-center">
            {formatRelativeTime(comment.created_at)}
          </div>
        </div>
        {/* actions */}
        <div
          className={`flex flex-row gap-2 transition-opacity duration-200 ${
            hoveredCommentId === String(comment.id) ||
            openMenuCommentId === String(comment.id)
              ? "opacity-100"
              : "opacity-0"
          }`}
        >
          <Button
            onClick={() => setReplyingToCommentId(String(comment.id))}
            variant="ghost"
            size="sm"
            shape="square"
            className="!p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <ArrowTurnUpLeftIcon className="w-4 h-4" />
          </Button>
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
              if (open) setHoveredCommentId(String(comment.id));
            }}
          />
        </div>
      </div>
      {/* Root content or editor */}
      {editingCommentId === String(comment.id) ? (
        <div>
          <div className="px-1 -mb-1 -mt-2">
            <MilkdownEditor
              onContentChange={setEditingContent}
              initialContent={comment.content || ""}
              isFullScreen={false}
              placeholder=""
            />
          </div>
          <div className="flex space-x-2 justify-end px-2 pb-3">
            <Button
              onClick={() => {
                setEditingCommentId(null);
                setEditingContent("");
              }}
              className=""
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
              className=""
              size="sm"
            >
              Save
            </Button>
          </div>
        </div>
      ) : (
        <div className="prose prose-sm max-w-none px-1 -mb-1 -mt-2">
          <MilkdownView content={comment.content || ""} />
        </div>
      )}

      {/* Replies */}
      {replies.length > 0 && (
        <div className="border-t pb-0 border-gray-200 dark:border-gray-800">
          <div className="space-y-0 pb-1">
            {replies.map((reply) => {
              const u = reply.created_by
                ? userInfos[reply.created_by]
                : undefined;
              return (
                <div
                  key={reply.id}
                  className="group"
                  onMouseEnter={(e) => {
                    e.stopPropagation();
                    setHoveredCommentId(String(reply.id));
                  }}
                  onMouseLeave={(e) => {
                    e.stopPropagation();
                    if (openMenuCommentId !== String(reply.id)) {
                      setHoveredCommentId(null);
                    }
                  }}
                >
                  <div className="flex justify-between items-start space-x-1 px-3 pt-3">
                    <div className="flex items-center space-x-1 pr-1">
                      <div className="flex items-center space-x-1">
                        {u?.avatar_url ? (
                          <Image
                            src={u.avatar_url}
                            alt={u.name || "User"}
                            width={20}
                            height={20}
                            className="w-5 h-5 rounded-full"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300">
                            {u?.name?.[0]?.toUpperCase() || "U"}
                          </div>
                        )}
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 text-center">
                          {u?.name}
                        </span>
                      </div>
                      {/* reply to label on md+ screens when replying to a sub-reply */}
                      <div className="hidden md:block">
                        {reply.parent_id &&
                          String(reply.parent_id) !== String(comment.id) && (
                            <div className="flex items-center space-x-1">
                              <p className="text-sm font-medium whitespace-nowrap text-gray-500">
                                reply to
                              </p>
                              <div className="text-sm font-medium whitespace-nowrap text-gray-500">
                                @
                                {userInfos[
                                  replies.find(
                                    (r) =>
                                      String(r.id) === String(reply.parent_id)
                                  )?.created_by ?? ""
                                ]?.name || "Unknown User"}
                              </div>
                            </div>
                          )}
                      </div>
                      <div className="flex flex-row gap-1 text-sm text-gray-500">
                        {formatRelativeTime(reply.created_at)}
                      </div>
                    </div>
                    <div
                      className={`flex flex-row gap-2 transition-opacity duration-200 ${
                        hoveredCommentId === String(reply.id) ||
                        openMenuCommentId === String(reply.id)
                          ? "opacity-100"
                          : "opacity-0"
                      }`}
                    >
                      <Button
                        onClick={() => setReplyingToCommentId(String(reply.id))}
                        variant="ghost"
                        size="sm"
                        shape="square"
                        className="!p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        <ArrowTurnUpLeftIcon className="w-4 h-4" />
                      </Button>
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
                            setEditingCommentId(String(reply.id));
                            setEditingContent(reply.content || "");
                          } else if (value === 2) {
                            await onDelete(String(reply.id));
                          }
                        }}
                        showBackground={false}
                        size="md"
                        onOpenChange={(open) => {
                          setOpenMenuCommentId(open ? String(reply.id) : null);
                          if (open) setHoveredCommentId(String(reply.id));
                        }}
                      />
                    </div>
                  </div>

                  {/* reply to label on small screens */}
                  <div className="block md:hidden">
                    {reply.parent_id &&
                      String(reply.parent_id) !== String(comment.id) && (
                        <div className="flex items-center space-x-1 pl-10">
                          <p className="text-sm font-medium whitespace-nowrap text-gray-500">
                            reply to
                          </p>
                          <div className="text-sm font-medium whitespace-nowrap text-gray-500">
                            @
                            {userInfos[
                              replies.find(
                                (r) => String(r.id) === String(reply.parent_id)
                              )?.created_by ?? ""
                            ]?.name || "Unknown User"}
                          </div>
                        </div>
                      )}
                  </div>
                  {editingCommentId === String(reply.id) ? (
                    <div>
                      <div className="pl-8 -mb-1 -mt-2">
                        <MilkdownEditor
                          onContentChange={setEditingContent}
                          initialContent={reply.content || ""}
                          isFullScreen={false}
                          placeholder=""
                        />
                      </div>
                      <div className="flex space-x-2 justify-end px-2 pb-3">
                        <Button
                          onClick={() => {
                            setEditingCommentId(null);
                            setEditingContent("");
                          }}
                          className=""
                          variant="ghost"
                          size="sm"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={async () => {
                            if (!editingContent.trim()) return;
                            await onSaveEdit(String(reply.id), editingContent);
                          }}
                          disabled={isSubmitting}
                          className=""
                          size="sm"
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="prose prose-sm max-w-none pl-8 -mb-1 -mt-2">
                      <MilkdownView content={reply.content || ""} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reply input */}
      {(replyingToCommentId === String(comment.id) ||
        replies
          .map((r) => String(r.id))
          .includes(replyingToCommentId ?? "")) && (
        <div className="border-t border-gray-200 dark:border-gray-800">
          <div className="h-fit">
            <MilkdownEditor
              key={replyingToCommentId || "reply"}
              onContentChange={setReplyContent}
              initialContent=""
              isFullScreen={false}
              placeholder={
                replyingToCommentId === String(comment.id)
                  ? "Write a reply..."
                  : `Reply to @${
                      userInfos[
                        replies.find(
                          (r) => String(r.id) === String(replyingToCommentId)
                        )?.created_by ?? ""
                      ]?.name || "Unknown User"
                    }...`
              }
            />
            <div className="flex space-x-2 justify-end p-2">
              <Button
                onClick={() => {
                  setReplyingToCommentId(null);
                  setReplyContent("");
                }}
                className=""
                variant="ghost"
                size="sm"
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!replyingToCommentId || !replyContent.trim()) return;
                  await onSubmitReply(replyingToCommentId, replyContent);
                }}
                disabled={isSubmitting || !replyContent.trim()}
                className=""
                size="sm"
              >
                Reply
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
