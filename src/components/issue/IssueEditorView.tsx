"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import MilkdownEditor from "@/components/commons/MilkdownEditor";
import { updateIssueTitleAndDescriptionAction } from "@/actions/issue.actions";
import { IssueWithAssignee } from "@/types/database.types";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import IssueConflictResolverModal, {
  type ConflictPayload,
} from "@/components/issue/IssueConflictResolverModal";

type UpdaterInfo = {
  id: string;
  name: string;
  avatar_url: string;
  email: string | null;
};

type ConflictPayloadFromServer = {
  server: { title: string | null; description: string | null } | null;
  mergedTitle?: string;
  mergedDescription?: string;
  serverVersion?: number;
  updater?: UpdaterInfo | null;
  updatedAt?: string | null;
};

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
  const [editorReinitKey, setEditorReinitKey] = useState<number>(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictPayload, setConflictPayload] =
    useState<ConflictPayload | null>(null);
  const editorDivRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const contentChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();
  // Keep a stable reference to mutate to avoid effect dependency churn
  const mutateRef = useRef<
    (vars: { id: string; title: string; description: string }) => void
  >(() => {});
  const titleTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Versioning & base snapshot for optimistic locking and three-way merge
  const versionRef = useRef<number>(issueData.version ?? 1);
  const baseTitleRef = useRef<string>(issueData.title || "");
  const baseDescriptionRef = useRef<string>(issueData.description || "");

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
          body: JSON.stringify({
            id,
            title,
            description,
            version: versionRef.current,
            baseTitle: baseTitleRef.current,
            baseDescription: baseDescriptionRef.current,
          }),
        });
        if (res.ok) {
          const json = await res.json();
          return json.issue as IssueWithAssignee;
        }
        if (res.status === 409) {
          const json = await res.json();
          const err = new Error("VERSION_CONFLICT") as Error & {
            payload?: unknown;
          };
          err.payload = json;
          throw err;
        }
        throw new Error("API update failed");
      } catch (_error: unknown) {
        // If the API already reported a version conflict, bubble up directly
        if (
          _error &&
          typeof _error === "object" &&
          "message" in _error &&
          _error.message === "VERSION_CONFLICT"
        ) {
          throw _error;
        }
        // Otherwise, fallback to Server Action (non-interactive env safe)
        try {
          return await updateIssueTitleAndDescriptionAction(
            id,
            title,
            description,
            versionRef.current,
            baseTitleRef.current,
            baseDescriptionRef.current
          );
        } catch (e: unknown) {
          if (
            e &&
            typeof e === "object" &&
            "message" in e &&
            e.message === "VERSION_CONFLICT"
          ) {
            throw e; // bubble to onError
          }
          throw _error instanceof Error ? _error : new Error("Update failed");
        }
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
    onError: (err: unknown, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousIssues && issueData.copany_id) {
        queryClient.setQueryData(
          ["issues", String(issueData.copany_id)],
          context.previousIssues
        );
      }
      if (
        err &&
        typeof err === "object" &&
        "message" in err &&
        err.message === "VERSION_CONFLICT" &&
        "payload" in err
      ) {
        const payload = (err as Error & { payload: ConflictPayloadFromServer })
          .payload;
        // Open modal for user to choose
        setConflictPayload({
          server: payload.server ?? null,
          mergedTitle: payload.mergedTitle,
          mergedDescription: payload.mergedDescription,
          serverVersion: payload.serverVersion,
          updater: payload.updater ?? null,
          updatedAt: payload.updatedAt ?? null,
        });
        setConflictModalOpen(true);
        setSaveError(null);
        return;
      }
      setSaveError("保存失败，请稍后重试");
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

      // Refresh version/base snapshots from server truth
      if ((updatedIssue as IssueWithAssignee & { version?: number }).version) {
        versionRef.current = (
          updatedIssue as IssueWithAssignee & { version: number }
        ).version;
      } else {
        versionRef.current = versionRef.current + 1;
      }
      baseTitleRef.current = updatedIssue.title || "";
      baseDescriptionRef.current = updatedIssue.description || "";
      // Ensure local state reflects server data (in case of normalization)
      setTitle(updatedIssue.title || "");
      setEditingContent(updatedIssue.description || "");

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
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (isReadonly) return;
      const newTitle = e.target.value.replace(/\r?\n/g, " ");
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

  // Auto-resize title textarea to fit content height
  useEffect(() => {
    const el = titleTextareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [title]);

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
  }, [title, editingContent, isReadonly, issueData.id, isSaving]);

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
  }, [issueData.id, isSaving]);

  // Focus description editor on mount (without scrolling)
  useEffect(() => {
    setFocusDescSignal((x) => x + 1);
  }, []);

  // Keep initial content in state so we can reset editor after conflict resolve
  const [initialContent, setInitialContent] = useState(
    issueData.description || ""
  );

  // Update isSaving state based on mutation state
  useEffect(() => {
    setIsSaving(updateIssueMutation.isPending);
  }, [updateIssueMutation.isPending]);

  return (
    <div className="w-full">
      <div className="space-y-0">
        {/* Title */}
        <div className="relative">
          <textarea
            ref={titleTextareaRef}
            value={title}
            onChange={handleTitleChange}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
            rows={1}
            className="w-full bg-transparent px-3 py-2 text-gray-900 dark:text-gray-100 focus:border-0 focus:outline-none focus:ring-0 text-2xl font-semibold resize-none overflow-hidden break-words"
            placeholder="Issue title"
            disabled={isReadonly}
          />
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
              key={`issue-main-${editorReinitKey}`}
              onContentChange={handleContentChange}
              initialContent={initialContent}
              isReadonly={isReadonly}
              focusSignal={focusDescSignal}
            />
          </div>
        </div>
      </div>
      {/* Conflict Resolver Modal */}
      <IssueConflictResolverModal
        isOpen={conflictModalOpen}
        onClose={() => setConflictModalOpen(false)}
        conflict={conflictPayload}
        localTitle={titleRef.current}
        localDescription={editingContentRef.current}
        onResolve={({
          title: chosenTitle,
          description: chosenDesc,
          versionFromServer,
        }) => {
          // Update base to current server
          if (conflictPayload?.server) {
            baseTitleRef.current = conflictPayload.server.title || "";
            baseDescriptionRef.current =
              conflictPayload.server.description || "";
          }
          if (typeof versionFromServer === "number") {
            versionRef.current = versionFromServer;
          }

          // Apply chosen to editor
          setTitle(chosenTitle);
          setEditingContent(chosenDesc);
          // Re-init main editor with chosen content so UI reflects immediately
          setInitialContent(chosenDesc);
          setEditorReinitKey((k) => k + 1);
          setFocusDescSignal((x) => x + 1);

          // Immediately save with latest server version
          mutateRef.current({
            id: issueData.id,
            title: chosenTitle,
            description: chosenDesc,
          });

          setConflictModalOpen(false);
        }}
      />
    </div>
  );
}
