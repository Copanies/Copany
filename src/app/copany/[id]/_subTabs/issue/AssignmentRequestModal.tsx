"use client";

import { useState } from "react";
import Modal from "@/components/commons/Modal";
import Button from "@/components/commons/Button";
import { HandRaisedIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import { User } from "@supabase/supabase-js";
import { requestAssignmentToEditorsAction } from "@/actions/assignmentRequest.actions";
import { useQueryClient } from "@tanstack/react-query";

interface AssignmentRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  issueId: string;
  copanyId: string;
  currentUser: User | null;
}

export default function AssignmentRequestModal({
  isOpen,
  onClose,
  issueId,
  copanyId,
  currentUser,
}: AssignmentRequestModalProps) {
  const [requestMessage, setRequestMessage] = useState("");
  const queryClient = useQueryClient();

  const handleSend = async () => {
    try {
      await requestAssignmentToEditorsAction(
        issueId,
        requestMessage.trim() ? requestMessage.trim() : null
      );
      onClose();
      setRequestMessage("");

      // Invalidate related queries to refresh data
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["assignmentRequests", "issue", issueId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["issueActivity", issueId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["assignmentRequests", "copany", copanyId],
        }),
      ]);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="p-5">
        <div className="text-lg font-semibold mb-6 text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <div className="flex flex-row items-center gap-0 -ml-2">
            <HandRaisedIcon className="w-5 h-5 -rotate-30 translate-y-0.5 translate-x-1" />
            {currentUser?.user_metadata?.avatar_url ? (
              <Image
                src={currentUser.user_metadata.avatar_url}
                alt={currentUser.user_metadata?.name || ""}
                width={28}
                height={28}
                className="w-5 h-5 rounded-full"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-gray-300 dark:bg-gray-600 border border-gray-300 dark:border-gray-700 flex items-center justify-center text-xs text-gray-700 dark:text-gray-300">
                {(currentUser?.user_metadata?.name || "")
                  .slice(0, 1)
                  .toUpperCase()}
              </div>
            )}
          </div>
          <span>Request to be assigned</span>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold">Message (optional)</label>
          <textarea
            className="w-full min-h-[32px] rounded-md border border-gray-300 dark:border-gray-700 bg-transparent text-gray-900 dark:text-gray-100 px-3 py-2 outline-none"
            placeholder="Leave a message"
            value={requestMessage}
            onChange={(e) => setRequestMessage(e.target.value)}
          />
          <div className="flex flex-row flex-wrap gap-2 mt-1">
            {[
              "I can do this.",
              "I will finish it.",
              "I like this idea.",
              "I want to fix it.",
            ].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setRequestMessage(t)}
                className="px-2 py-1 text-sm rounded-md bg-gray-100 dark:bg-gray-900 hover:cursor-pointer"
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSend}>
            Send
          </Button>
        </div>
      </div>
    </Modal>
  );
}
