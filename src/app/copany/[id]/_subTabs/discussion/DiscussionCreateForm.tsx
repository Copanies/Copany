"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import MilkdownEditor from "@/components/commons/MilkdownEditor";
import { useCreateDiscussion } from "@/hooks/discussions";
import Button from "@/components/commons/Button";
import { EMPTY_STRING } from "@/utils/constants";
import type { Discussion } from "@/types/database.types";
import DiscussionLabelSelector from "@/app/copany/[id]/_subTabs/discussion/DiscussionLabelSelector";
import { useCopaniesWhereUserIsContributor } from "@/hooks/copany";
import { useCurrentUser } from "@/hooks/currentUser";
import Dropdown from "@/components/commons/Dropdown";
import Image from "next/image";
import { shimmerDataUrlWithTheme } from "@/utils/shimmer";
import { useDarkMode } from "@/utils/useDarkMode";
import { XMarkIcon } from "@heroicons/react/24/outline";

export default function DiscussionCreateForm({
  copanyId,
  onDiscussionCreated,
  onClose,
}: {
  copanyId?: string;
  onDiscussionCreated: (newDiscussion: Discussion) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState<string>(EMPTY_STRING);
  const [description, setDescription] = useState<string>(EMPTY_STRING);
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [selectedCopanyId, setSelectedCopanyId] = useState<string>(
    copanyId || ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  const { data: currentUser } = useCurrentUser();
  const { data: userCopanies = [] } = useCopaniesWhereUserIsContributor(
    currentUser?.id || ""
  );
  const isDarkMode = useDarkMode();

  // Use the selected copany ID for creating discussion
  const effectiveCopanyId = copanyId || selectedCopanyId;
  const createDiscussion = useCreateDiscussion(effectiveCopanyId);

  const editorDivRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const titleTextareaRef = useRef<HTMLTextAreaElement>(null);

  const handleContentChange = useCallback((content: string) => {
    setDescription(content);
  }, []);

  const handleCopanyClear = useCallback(() => {
    setSelectedCopanyId("");
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

    if (isSubmitting || !title.trim() || !effectiveCopanyId) return;

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
            name="discussion-title"
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
          <div className="flex flex-row gap-2 items-center">
            {/* Copany Selector - only show when copanyId is not provided */}
            {!copanyId && (
              <Dropdown
                trigger={
                  <div className="flex items-center gap-2 text-base rounded-md px-2 py-1 bg-gray-100 dark:bg-gray-800">
                    <div className="flex items-center gap-2">
                      {userCopanies.find((c) => c.id === selectedCopanyId)
                        ?.logo_url && (
                        <Image
                          src={
                            userCopanies.find((c) => c.id === selectedCopanyId)
                              ?.logo_url!
                          }
                          alt={
                            userCopanies.find((c) => c.id === selectedCopanyId)
                              ?.name || ""
                          }
                          width={24}
                          height={24}
                          className="w-6 h-6 rounded-md"
                          placeholder="blur"
                          blurDataURL={shimmerDataUrlWithTheme(
                            24,
                            24,
                            isDarkMode
                          )}
                        />
                      )}
                      <span className="truncate text-base shrink-0 w-fit">
                        {userCopanies.find((c) => c.id === selectedCopanyId)
                          ?.name || "Copany"}
                      </span>
                      {selectedCopanyId && !isSubmitting && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopanyClear();
                          }}
                          className="p-0.5 rounded cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              e.stopPropagation();
                              handleCopanyClear();
                            }
                          }}
                        >
                          <XMarkIcon
                            className="w-3 h-3 text-gray-500 dark:text-gray-400"
                            strokeWidth={2}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                }
                options={userCopanies.map((copany, index) => ({
                  value: index,
                  label: (
                    <div className="flex items-center gap-2">
                      {copany.logo_url && (
                        <Image
                          src={copany.logo_url}
                          alt={copany.name}
                          width={20}
                          height={20}
                          className="w-5 h-5 rounded-md"
                          placeholder="blur"
                          blurDataURL={shimmerDataUrlWithTheme(
                            20,
                            20,
                            isDarkMode
                          )}
                        />
                      )}
                      <span>{copany.name}</span>
                    </div>
                  ) as React.ReactNode,
                }))}
                selectedValue={userCopanies.findIndex(
                  (c) => c.id === selectedCopanyId
                )}
                onSelect={(value) => {
                  const selectedCopany = userCopanies[value];
                  if (selectedCopany) {
                    setSelectedCopanyId(selectedCopany.id);
                  }
                }}
                showBackground={false}
                showPadding={false}
                size="lg"
              />
            )}
            {selectedCopanyId && (
              <DiscussionLabelSelector
                copanyId={effectiveCopanyId}
                selectedLabelIds={selectedLabelIds}
                onLabelChange={setSelectedLabelIds}
                readOnly={isSubmitting}
              />
            )}
          </div>
        </div>
        <div className="flex justify-end px-3 py-3 border-t border-gray-200 dark:border-gray-800">
          <Button
            type="submit"
            variant="primary"
            disabled={!title.trim() || isSubmitting || !effectiveCopanyId}
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
