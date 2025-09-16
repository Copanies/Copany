"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import MilkdownEditor from "@/components/commons/MilkdownEditor";
import { useUpdateDiscussion } from "@/hooks/discussions";
import Button from "@/components/commons/Button";
import { EMPTY_STRING } from "@/utils/constants";
import type { Discussion } from "@/types/database.types";
import DiscussionLabelSelector from "@/app/copany/[id]/subTabs/discussion/DiscussionLabelSelector";

interface DiscussionEditFormProps {
  copanyId: string;
  discussion: Discussion;
  onDiscussionUpdated: (updatedDiscussion: Discussion) => void;
  onClose: () => void;
}

export default function DiscussionEditForm({
  copanyId,
  discussion,
  onDiscussionUpdated,
  onClose,
}: DiscussionEditFormProps) {
  const [title, setTitle] = useState<string>(discussion.title);
  const [description, setDescription] = useState<string>(
    discussion.description || EMPTY_STRING
  );
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>(
    discussion.labels || []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const updateDiscussion = useUpdateDiscussion(copanyId);

  const editorDivRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const titleTextareaRef = useRef<HTMLTextAreaElement>(null);

  const handleContentChange = useCallback((content: string) => {
    setDescription(content);
  }, []);

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isSubmitting || !title.trim()) return;

    setIsSubmitting(true);

    try {
      const updatedDiscussion = await updateDiscussion.mutateAsync({
        discussionId: discussion.id,
        updates: {
          title: title.trim(),
          description: description || null,
          labels: selectedLabelIds,
        },
      });

      // Notify parent component
      onDiscussionUpdated(updatedDiscussion);
      onClose();
    } catch (error) {
      console.error("Error updating discussion:", error);
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
            placeholder="Discussion title"
          />
          <div ref={editorDivRef}>
            <MilkdownEditor
              initialContent={discussion.description ?? EMPTY_STRING}
              onContentChange={handleContentChange}
              placeholder="Description (optional)"
              className="min-h-[200px]"
            />
          </div>
        </div>
        <div className="px-5 py-2">
          <div className="space-y-2">
            <DiscussionLabelSelector
              copanyId={copanyId}
              selectedLabelIds={selectedLabelIds}
              onLabelChange={setSelectedLabelIds}
              readOnly={isSubmitting}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-3 py-3 border-t border-gray-200 dark:border-gray-800">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!title.trim() || isSubmitting}
          >
            {isSubmitting ? "Updating..." : "Update Discussion"}
          </Button>
        </div>
      </form>
    </div>
  );
}
