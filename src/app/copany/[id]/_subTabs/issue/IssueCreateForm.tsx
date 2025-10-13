"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import MilkdownEditor from "@/components/commons/MilkdownEditor";

import { useCreateIssue } from "@/hooks/issues";
import {
  IssueWithAssignee,
  IssueLevel,
  IssuePriority,
  IssueState,
  CopanyContributorWithUserInfo,
  AssigneeUser,
} from "@/types/database.types";
import IssueStateSelector from "@/app/copany/[id]/_subTabs/issue/IssueStateSelector";
import IssuePrioritySelector from "@/app/copany/[id]/_subTabs/issue/IssuePrioritySelector";
import IssueAssigneeSelector from "@/app/copany/[id]/_subTabs/issue/IssueAssigneeSelector";
import Button from "@/components/commons/Button";
import IssueLevelSelector from "@/app/copany/[id]/_subTabs/issue/IssueLevelSelector";
import { User } from "@supabase/supabase-js";
import { EMPTY_STRING } from "@/utils/constants";

// Issue form component
export default function IssueCreateForm({
  copanyId,
  onIssueCreated,
  onClose,
  currentUser,
  contributors,
}: {
  copanyId: string;
  onIssueCreated: (newIssue: IssueWithAssignee) => void;
  onClose: () => void;
  currentUser: User | null;
  contributors: CopanyContributorWithUserInfo[];
}) {
  const [title, setTitle] = useState<string>(EMPTY_STRING);
  const [description, setDescription] = useState<string>(EMPTY_STRING);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createIssue = useCreateIssue(copanyId);

  // Add property state management
  const [state, setState] = useState<number>(IssueState.Backlog);
  const [priority, setPriority] = useState<number>(IssuePriority.None);
  const [level, setLevel] = useState<number>(IssueLevel.level_None);
  const [assignee, setAssignee] = useState<string | null>(null);

  const editorDivRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const titleTextareaRef = useRef<HTMLTextAreaElement>(null);

  const handleContentChange = useCallback((content: string) => {
    console.log("content", content);
    setDescription(content);
  }, []);

  const handleStateChange = useCallback(
    (_issueId: string, newState: number) => {
      setState(newState);
    },
    []
  );

  // Auto-resize title textarea to fit content height
  useEffect(() => {
    const el = titleTextareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [title]);

  // Focus title textarea on mount
  useEffect(() => {
    titleTextareaRef.current?.focus();
  }, []);

  const handlePriorityChange = useCallback(
    (_issueId: string, newPriority: number) => {
      setPriority(newPriority);
    },
    []
  );

  const handleLevelChange = useCallback(
    (_issueId: string, newLevel: number) => {
      setLevel(newLevel);
    },
    []
  );

  const handleAssigneeChange = useCallback(
    (
      _issueId: string,
      newAssignee: string | null,
      _assigneeUser: AssigneeUser | null
    ) => {
      setAssignee(newAssignee);
    },
    []
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      const newIssue = await createIssue.mutateAsync({
        copany_id: copanyId,
        title: title,
        description: description,
        state: state,
        priority: priority,
        level: level,
        assignee: assignee,
      });

      // Reset form
      setTitle(EMPTY_STRING);
      setDescription(EMPTY_STRING);
      setState(IssueState.Backlog);
      setPriority(IssuePriority.None);
      setLevel(IssueLevel.level_None);
      setAssignee(null);

      if (formRef.current) {
        formRef.current.reset();
      }

      // Notify parent component to refresh data and close modal
      onIssueCreated(newIssue);
      onClose();
    } catch (error) {
      console.error("Error creating issue:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-1">
        <div className="px-3 py-3">
          <textarea
            ref={titleTextareaRef}
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value.replace(/\r?\n/g, " "))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
                // Submit when Cmd/Ctrl + Enter
                if (e.metaKey || e.ctrlKey) {
                  if (formRef.current) {
                    formRef.current.requestSubmit();
                  }
                }
              }
            }}
            rows={1}
            className="w-full bg-transparent pl-3 pr-10 py-2 text-gray-900 dark:text-gray-100 focus:border-0 focus:outline-none focus:ring-0 text-xl font-semibold resize-none overflow-hidden break-words"
            disabled={isSubmitting}
            placeholder="Issue title"
          />
          <div ref={editorDivRef}>
            <MilkdownEditor
              onContentChange={handleContentChange}
              className="min-h-[200px]"
            />
          </div>
        </div>
        <div className="flex flex-row flex-wrap gap-x-2 gap-y-2 px-3 py-2">
          <IssueStateSelector
            issueId="temp"
            initialState={state}
            showText={true}
            showBackground={true}
            onStateChange={handleStateChange}
            disableServerUpdate={true}
          />

          <IssuePrioritySelector
            issueId="temp"
            initialPriority={priority}
            showText={true}
            showBackground={true}
            onPriorityChange={handlePriorityChange}
            disableServerUpdate={true}
          />

          <IssueLevelSelector
            issueId="temp"
            initialLevel={level}
            showText={true}
            showBackground={true}
            onLevelChange={handleLevelChange}
            disableServerUpdate={true}
          />

          <IssueAssigneeSelector
            issueId="temp"
            initialAssignee={assignee}
            assigneeUser={null}
            currentUser={currentUser}
            contributors={contributors}
            showBackground={true}
            showText={true}
            onAssigneeChange={handleAssigneeChange}
            disableServerUpdate={true}
          />
        </div>
        <div className="flex justify-end px-3 py-3 border-t border-gray-200 dark:border-gray-800">
          <Button type="submit" variant="primary">
            <div>
              {isSubmitting ? (
                <div className="ftext-gray-500 dark:text-gray-400">
                  Creating Issue
                  <span className="inline-block">
                    <span className="animate-pulse">.</span>
                    <span
                      className="animate-pulse"
                      style={{ animationDelay: "0.2s" }}
                    >
                      .
                    </span>
                    <span
                      className="animate-pulse"
                      style={{ animationDelay: "0.4s" }}
                    >
                      .
                    </span>
                  </span>
                </div>
              ) : (
                "Create Issue"
              )}
            </div>
          </Button>
        </div>
      </form>
    </div>
  );
}
