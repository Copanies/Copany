"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import MilkdownEditor from "@/components/commons/MilkdownEditor";
import { useCreateDiscussion } from "@/hooks/discussions";
import Button from "@/components/commons/Button";
import { EMPTY_STRING } from "@/utils/constants";
import type { Discussion } from "@/types/database.types";
import DiscussionLabelSelector from "@/app/copany/[id]/_subTabs/discussion/DiscussionLabelSelector";

export default function DiscussionCreateForm({
  copanyId,
  onDiscussionCreated,
  onClose,
}: {
  copanyId: string;
  onDiscussionCreated: (newDiscussion: Discussion) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState<string>(EMPTY_STRING);
  const [description, setDescription] = useState<string>(EMPTY_STRING);
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createDiscussion = useCreateDiscussion(copanyId);

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
      const newDiscussion = await createDiscussion.mutateAsync({
        title: title.trim(),
        description: description || null,
        labels: selectedLabelIds,
      });

      // Reset form
      setTitle(EMPTY_STRING);
      setDescription(EMPTY_STRING);
      setSelectedLabelIds([]);

      if (formRef.current) {
        formRef.current.reset();
      }

      // Notify parent component to refresh data and close modal
      onDiscussionCreated(newDiscussion);
      onClose();
    } catch (error) {
      console.error("Error creating discussion:", error);
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
              onContentChange={handleContentChange}
              placeholder="Add description..."
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
        <div className="flex justify-end px-3 py-3 border-t border-gray-200 dark:border-gray-800">
          <Button
            type="submit"
            variant="primary"
            disabled={!title.trim() || isSubmitting}
          >
            <div>
              {isSubmitting ? (
                <div className="text-gray-500 dark:text-gray-400">
                  Creating Discussion
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
                "Create Discussion"
              )}
            </div>
          </Button>
        </div>
      </form>
    </div>
  );
}
