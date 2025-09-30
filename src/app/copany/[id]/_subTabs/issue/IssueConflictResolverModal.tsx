"use client";

import { useEffect, useState, useRef } from "react";
import Modal from "@/components/commons/Modal";
import Button from "@/components/commons/Button";
import MilkdownEditor from "@/components/commons/MilkdownEditor";
import { renderUserLabel } from "./IssueAssigneeSelector";
import { useCurrentUser } from "@/hooks/currentUser";
import { formatRelativeTime } from "@/utils/time";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

type UpdaterInfo = {
  id: string;
  name: string;
  avatar_url: string;
  email: string | null;
};

export type ConflictPayload = {
  server: { title: string | null; description: string | null } | null;
  mergedTitle?: string;
  mergedDescription?: string;
  serverVersion?: number;
  updater?: UpdaterInfo | null;
  updatedAt?: string | null;
};

export default function IssueConflictResolverModal({
  isOpen,
  onClose,
  conflict,
  localTitle,
  localDescription,
  onResolve,
}: {
  isOpen: boolean;
  onClose: () => void;
  conflict: ConflictPayload | null;
  localTitle: string;
  localDescription: string;
  onResolve: (choice: {
    title: string;
    description: string;
    versionFromServer?: number;
  }) => void;
}) {
  const serverTitle = conflict?.server?.title ?? "";
  const serverDesc = conflict?.server?.description ?? "";
  const currentUser = useCurrentUser();
  const [leftTitle, setLeftTitle] = useState(localTitle);
  const [leftDesc, setLeftDesc] = useState(localDescription);
  const [rightTitle, setRightTitle] = useState(serverTitle);
  const [rightDesc, setRightDesc] = useState(serverDesc);
  const [reinitKey, setReinitKey] = useState(0);
  // Keep initial content stable for each open, like IssueEditorView does
  const [leftInitial, setLeftInitial] = useState(localDescription);
  const [rightInitial, setRightInitial] = useState(serverDesc);
  const [leftFocusSignal, setLeftFocusSignal] = useState(0);
  const [rightFocusSignal, setRightFocusSignal] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    setLeftTitle(localTitle);
    setLeftDesc(localDescription);
    setRightTitle(serverTitle);
    setRightDesc(serverDesc);
    setLeftInitial(localDescription);
    setRightInitial(serverDesc);
    // Force re-init editor instances when modal opens
    setReinitKey((k) => k + 1);
    setLeftFocusSignal((x) => x + 1);
    setRightFocusSignal((x) => x + 1);
  }, [isOpen, localTitle, localDescription, serverTitle, serverDesc]);

  const updater = conflict?.updater;
  const leftTitleRef = useRef<HTMLTextAreaElement>(null);
  const rightTitleRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize title textareas
  useEffect(() => {
    const el = leftTitleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [leftTitle]);

  useEffect(() => {
    const el = rightTitleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [rightTitle]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      {/* Fixed-height container on small screens to avoid modal scroll */}
      <div className="flex flex-col p-6 gap-4 w-full h-[calc(90vh-8px)] overflow-hidden">
        <div className="flex flex-row text-lg font-semibold pr-4 gap-2">
          <div className="flex flex-row h-[28px] items-center">
            <ExclamationTriangleIcon className="w-5 h-5" strokeWidth={2} />
          </div>
          <span className="">Version conflict — choose which to keep</span>
        </div>

        {/* Content area: stack on small screens, side-by-side on md+ */}
        <div className="w-full flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Left: Local */}
          <div className="w-full flex-1 basis-1/2 md:w-1/2 md:basis-auto pb-4 mb:pb-0 md:pr-5 h-full flex flex-col overflow-hidden border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-800">
            <div className="flex flex-row items-center justify-between mb-5">
              <div className="flex flex-col gap-1">
                <p>Editing now</p>
                {renderUserLabel(
                  currentUser?.data?.user_metadata?.name || "Unknown",
                  currentUser?.data?.user_metadata?.avatar_url || null,
                  true,
                  currentUser?.data?.user_metadata?.email || null
                )}
              </div>

              <Button
                className="h-fit"
                variant="secondary"
                size="sm"
                onClick={() =>
                  onResolve({
                    title: leftTitle,
                    description: leftDesc,
                    versionFromServer: conflict?.serverVersion,
                  })
                }
              >
                Keep My Version
              </Button>
            </div>

            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <textarea
                ref={leftTitleRef}
                className="w-full bg-transparent text-lg font-semibold focus:outline-none focus:ring-0 resize-none overflow-hidden break-words"
                value={leftTitle}
                onChange={(e) =>
                  setLeftTitle(e.target.value.replace(/\r?\n/g, " "))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
                rows={1}
                placeholder="Title"
              />
              <div className="mt-2 flex-1 min-h-0 overflow-auto">
                <MilkdownEditor
                  key={`left-${reinitKey}`}
                  onContentChange={(content) => setLeftDesc(content)}
                  initialContent={leftInitial}
                  isReadonly={false}
                  placeholder="Description"
                  className="w-full -mx-3 -mt-2"
                  focusSignal={leftFocusSignal}
                />
              </div>
            </div>
          </div>

          {/* Right: Server */}
          <div className="w-full flex-1 basis-1/2 md:w-1/2 md:basis-auto mt-4 md:mt-0 md:pl-[21px] md:-ml-[1px] h-full flex flex-col overflow-hidden border-gray-200 dark:border-gray-800 md:border-l">
            <div className="flex flex-row items-center justify-between mb-5">
              <div className="flex flex-col gap-1">
                <span>
                  Updated {formatRelativeTime(conflict?.updatedAt || "")}
                </span>
                {renderUserLabel(
                  updater?.name || "Unknown",
                  updater?.avatar_url || null,
                  true,
                  updater?.email || null
                )}
              </div>
              <Button
                className="h-fit"
                variant="primary"
                size="sm"
                onClick={() =>
                  onResolve({
                    title: rightTitle,
                    description: rightDesc,
                    versionFromServer: conflict?.serverVersion,
                  })
                }
              >
                Keep Server Version
              </Button>
            </div>

            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <textarea
                ref={rightTitleRef}
                className="w-full bg-transparent text-lg font-semibold focus:outline-none focus:ring-0 resize-none overflow-hidden break-words"
                value={rightTitle}
                onChange={(e) =>
                  setRightTitle(e.target.value.replace(/\r?\n/g, " "))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
                rows={1}
                placeholder="Title"
              />
              <div className="mt-2 flex-1 min-h-0 overflow-auto">
                <MilkdownEditor
                  key={`right-${reinitKey}`}
                  onContentChange={(content) => setRightDesc(content)}
                  initialContent={rightInitial}
                  isReadonly={false}
                  placeholder="Description"
                  className="w-full -mx-3 -mt-2"
                  focusSignal={rightFocusSignal}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
