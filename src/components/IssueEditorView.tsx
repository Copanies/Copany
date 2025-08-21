"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import MilkdownEditor from "@/components/MilkdownEditor";
import { updateIssueTitleAndDescriptionAction } from "@/actions/issue.actions";
import { IssueWithAssignee } from "@/types/database.types";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { useQueryClient, useMutation } from "@tanstack/react-query";

interface IssueEditorViewProps {
  issueData: IssueWithAssignee;
  onTitleChange?: (issueId: string, newTitle: string) => void;
  onDescriptionChange?: (issueId: string, newDescription: string) => void;
  isReadonly?: boolean;
}

export default function IssueEditorView({
  issueData,
  onTitleChange,
  onDescriptionChange,
  isReadonly = false,
}: IssueEditorViewProps) {
  const [title, setTitle] = useState(issueData.title || "");
  const [editingContent, setEditingContent] = useState(
    issueData.description || ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const [focusDescSignal, setFocusDescSignal] = useState<number>(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const editorDivRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const contentChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();
  // Keep a stable reference to mutate to avoid effect dependency churn
  const mutateRef = useRef<
    (vars: { id: string; title: string; description: string }) => void
  >(() => {});

  // React Query mutation for updating issue
  const updateIssueMutation = useMutation({
    mutationFn: async ({
      id,
      title,
      description,
    }: {
      id: string;
      title: string;
      description: string;
    }) => {
      // Prefer API route to avoid full-page refresh caused by Server Actions
      try {
        const res = await fetch("/api/issue/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, title, description }),
        });
        if (res.ok) {
          const json = await res.json();
          return json.issue as IssueWithAssignee;
        }
        throw new Error("API update failed");
      } catch (error) {
        // Fallback to Server Action
        return await updateIssueTitleAndDescriptionAction(
          id,
          title,
          description
        );
      }
    },
    onMutate: async ({ id, title, description }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ["issues", String(issueData.copany_id)],
      });

      // Snapshot the previous value
      const previousIssues = queryClient.getQueryData<IssueWithAssignee[]>([
        "issues",
        String(issueData.copany_id),
      ]);

      // Optimistically update to the new value
      if (previousIssues && issueData.copany_id) {
        queryClient.setQueryData<IssueWithAssignee[]>(
          ["issues", String(issueData.copany_id)],
          (prev) => {
            if (!prev) return prev;
            return prev.map((it) =>
              String(it.id) === String(id) ? { ...it, title, description } : it
            );
          }
        );
      }

      return { previousIssues };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousIssues && issueData.copany_id) {
        queryClient.setQueryData(
          ["issues", String(issueData.copany_id)],
          context.previousIssues
        );
      }
      setSaveError(
        err instanceof Error
          ? err.message
          : "Save failed, please try again later"
      );
    },
    onSuccess: async (updatedIssue) => {
      // Update cache with new data
      if (issueData.copany_id) {
        queryClient.setQueryData<IssueWithAssignee[]>(
          ["issues", String(issueData.copany_id)],
          (prev) => {
            if (!prev) return prev;
            return prev.map((it) =>
              String(it.id) === String(updatedIssue.id) ? updatedIssue : it
            );
          }
        );
      }

      // Invalidate related queries to trigger refresh
      try {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ["issueActivity", issueData.id],
          }),
          // Invalidate issue details if they exist
          queryClient.invalidateQueries({
            queryKey: ["issue", issueData.id],
          }),
        ]);
      } catch (_) {}

      setSaveError(null);
      console.log("✅ Issue updated successfully");
    },
    onSettled: () => {
      setIsSaving(false);
    },
  });

  // Sync latest mutate function to ref
  useEffect(() => {
    mutateRef.current = updateIssueMutation.mutate;
  }, [updateIssueMutation.mutate]);

  // Handle content changes - add debounce processing
  const handleContentChange = useCallback(
    (content: string) => {
      if (isReadonly) return;
      console.log("📝 Content changed, length:", content.length);
      setEditingContent(content);
      setSaveError(null);

      // Clear previous content update timer
      if (contentChangeTimeoutRef.current) {
        clearTimeout(contentChangeTimeoutRef.current);
      }

      // Delay notifying parent component
      contentChangeTimeoutRef.current = setTimeout(() => {
        console.log("🔄 Notifying parent component of content change");
        if (onDescriptionChange) {
          onDescriptionChange(issueData.id, content);
        }
      }, 300);

      // Mark unsaved changes, but don't trigger save immediately
      hasUnsavedChangesRef.current = true;
    },
    [issueData.id, onDescriptionChange, isReadonly]
  );

  // Handle title changes
  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isReadonly) return;
      const newTitle = e.target.value;
      console.log("📝 Title changed:", newTitle);
      setTitle(newTitle);
      setSaveError(null);

      if (onTitleChange) {
        onTitleChange(issueData.id, newTitle);
      }

      // Mark unsaved changes, but don't trigger save immediately
      hasUnsavedChangesRef.current = true;
    },
    [issueData.id, onTitleChange, isReadonly]
  );

  // Use ref to get latest state values
  const titleRef = useRef(title);
  const editingContentRef = useRef(editingContent);
  const isReadonlyRef = useRef(isReadonly);

  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  useEffect(() => {
    editingContentRef.current = editingContent;
  }, [editingContent]);

  // Keep latest isReadonly in a ref to avoid re-registering unmount effect
  useEffect(() => {
    isReadonlyRef.current = isReadonly;
  }, [isReadonly]);

  // Mark if there are unsaved changes
  const hasUnsavedChangesRef = useRef(false);

  // Auto-save logic
  useEffect(() => {
    // Check if there are changes that need saving
    if (isReadonly || !hasUnsavedChangesRef.current || isSaving) {
      return;
    }

    // Clear previous save timer
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    console.log("📝 Changes detected, scheduling auto-save");

    // Set new save timer (execute after 3 seconds)
    saveTimeoutRef.current = setTimeout(async () => {
      if (isReadonly || !hasUnsavedChangesRef.current || isSaving) {
        return;
      }

      console.log("⏰ Auto-save timer triggered");

      const currentTitle = titleRef.current;
      const currentDescription = editingContentRef.current;

      // Use stable mutate ref to avoid retriggering effect due to object identity changes
      mutateRef.current({
        id: issueData.id,
        title: currentTitle,
        description: currentDescription,
      });

      hasUnsavedChangesRef.current = false;
    }, 3000);

    return () => {
      if (saveTimeoutRef.current) {
        console.log("🔄 Clearing auto-save timer");
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [isSaving, title, editingContent, isReadonly, issueData.id]);

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      // If there are unsaved changes, save immediately
      if (!isReadonlyRef.current && hasUnsavedChangesRef.current && !isSaving) {
        console.log("💾 Saving changes before unmount");
        const currentTitle = titleRef.current;
        const currentDescription = editingContentRef.current;

        mutateRef.current({
          id: issueData.id,
          title: currentTitle,
          description: currentDescription,
        });
      }

      // Clean up all timers
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (contentChangeTimeoutRef.current) {
        clearTimeout(contentChangeTimeoutRef.current);
      }
    };
  }, [issueData.id]);

  // Focus description editor on mount (without scrolling)
  useEffect(() => {
    setFocusDescSignal((x) => x + 1);
  }, []);

  // The initial content is only set once when the component is mounted
  const [initialContent] = useState(issueData.description || "");

  // Update isSaving state based on mutation state
  useEffect(() => {
    setIsSaving(updateIssueMutation.isPending);
  }, [updateIssueMutation.isPending]);

  return (
    <div className="w-full">
      <div className="space-y-0">
        {/* Title */}
        <div className="relative">
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            className="w-full bg-transparent px-3 py-2 text-gray-900 dark:text-gray-100 focus:border-0 focus:outline-none focus:ring-0 text-2xl font-semibold"
            placeholder="Issue title"
            disabled={isReadonly}
          />
          {/* Save status indicator */}
          {isSaving && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center text-sm text-gray-500">
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
            </div>
          )}
        </div>

        {/* Error message */}
        {saveError && (
          <div className="flex flex-row items-center px-3 py-2 mx-2 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded">
            <span>Error: {saveError}</span>
          </div>
        )}

        {/* Description */}
        <div>
          <div ref={editorDivRef}>
            <MilkdownEditor
              onContentChange={handleContentChange}
              initialContent={initialContent}
              isReadonly={isReadonly}
              focusSignal={focusDescSignal}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
