"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import MilkdownEditor from "@/components/MilkdownEditor";
import { updateIssueAction } from "@/actions/issue.actions";
import { IssueWithAssignee } from "@/types/database.types";
import { issuesManager } from "@/utils/cache";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

interface IssueEditorViewProps {
  issueData: IssueWithAssignee;
  onTitleChange?: (issueId: string, newTitle: string) => void;
  onDescriptionChange?: (issueId: string, newDescription: string) => void;
}

export default function IssueEditorView({
  issueData,
  onTitleChange,
  onDescriptionChange,
}: IssueEditorViewProps) {
  const [title, setTitle] = useState(issueData.title || "");
  const [editingContent, setEditingContent] = useState(
    issueData.description || ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const editorDivRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const contentChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle content changes - add debounce processing
  const handleContentChange = useCallback(
    (content: string) => {
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
    [issueData.id, onDescriptionChange]
  );

  // Handle title changes
  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
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
    [issueData.id, onTitleChange]
  );

  // Use ref to get latest state values
  const titleRef = useRef(title);
  const editingContentRef = useRef(editingContent);

  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  useEffect(() => {
    editingContentRef.current = editingContent;
  }, [editingContent]);

  // Mark if there are unsaved changes
  const hasUnsavedChangesRef = useRef(false);

  // Server save function
  const saveToServerRef = useRef<(() => Promise<void>) | null>(null);

  // Create server save function
  useEffect(() => {
    saveToServerRef.current = async () => {
      if (isSaving) {
        console.log("⏳ Already saving, skipping...");
        return;
      }

      const currentTitle = titleRef.current;
      const currentDescription = editingContentRef.current;

      setIsSaving(true);
      setSaveError(null);

      console.log("🚀 Starting server save...");
      try {
        const updatedIssue = await updateIssueAction({
          id: issueData.id,
          title: currentTitle,
          description: currentDescription,
          state: issueData.state ?? 0,
          priority: issueData.priority ?? null,
          level: issueData.level ?? null,
          assignee: issueData.assignee ?? null,
        });

        if (issueData.copany_id) {
          console.log("💾 Updating cache with new data");
          issuesManager.setIssue(issueData.copany_id, updatedIssue);
        }

        hasUnsavedChangesRef.current = false;
        console.log("✅ Server save completed successfully");
      } catch (error) {
        console.error("❌ Error saving to server:", error);
        hasUnsavedChangesRef.current = true;
        setSaveError(
          error instanceof Error
            ? error.message
            : "Save failed, please try again later"
        );
      } finally {
        setIsSaving(false);
      }
    };
  }, [
    isSaving,
    issueData.id,
    issueData.title,
    issueData.description,
    issueData.state,
    issueData.priority,
    issueData.level,
    issueData.assignee,
    issueData.copany_id,
  ]);

  // Auto-save logic
  useEffect(() => {
    // Check if there are changes that need saving
    if (!hasUnsavedChangesRef.current || isSaving) {
      return;
    }

    // Clear previous save timer
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    console.log("📝 Changes detected, scheduling auto-save");

    // Set new save timer (execute after 3 seconds)
    saveTimeoutRef.current = setTimeout(async () => {
      if (!hasUnsavedChangesRef.current || isSaving) {
        return;
      }

      console.log("⏰ Auto-save timer triggered");

      if (saveToServerRef.current) {
        try {
          await saveToServerRef.current();
          console.log("✅ Auto-save completed successfully");
        } catch (error) {
          console.error("❌ Auto-save failed:", error);
        }
      }
    }, 3000);

    return () => {
      if (saveTimeoutRef.current) {
        console.log("🔄 Clearing auto-save timer");
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [isSaving, title, editingContent]);

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      // If there are unsaved changes, save immediately
      if (hasUnsavedChangesRef.current && saveToServerRef.current) {
        console.log("💾 Saving changes before unmount");
        saveToServerRef.current().catch((error) => {
          console.error("❌ Final save failed:", error);
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
  }, []);

  // The initial content is only set once when the component is mounted
  const [initialContent] = useState(issueData.description || "");

  return (
    <div className="w-full">
      <div className="space-y-2">
        {/* Title */}
        <div className="relative">
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            className="w-full bg-transparent px-3 py-2 text-gray-900 dark:text-gray-100 focus:border-0 focus:outline-none focus:ring-0 text-2xl font-semibold"
            placeholder="Issue title"
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
              isFullScreen={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
