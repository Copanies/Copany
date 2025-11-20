"use client";

import { useState, useMemo } from "react";
import { useCopany } from "@/hooks/copany";
import { useCurrentUser } from "@/hooks/currentUser";
import Button from "@/components/commons/Button";
import Modal from "@/components/commons/Modal";
import HistoryIssueCreateModal from "./HistoryIssueCreateModal";

interface AddHistoryContributionButtonProps {
  copanyId: string;
  className?: string;
}

export default function AddHistoryContributionButton({
  copanyId,
  className,
}: AddHistoryContributionButtonProps) {
  const { data: copany } = useCopany(copanyId);
  const { data: currentUser } = useCurrentUser();
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Check if current user is owner
  const isOwner = useMemo(() => {
    return !!(copany && currentUser && copany.created_by === currentUser.id);
  }, [copany, currentUser]);

  if (!isOwner) {
    return null;
  }

  return (
    <>
      <Button
        onClick={() => setIsHistoryModalOpen(true)}
        className={className}
        size="sm"
      >
        Add History Contribution
      </Button>

      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        size="lg"
      >
        <HistoryIssueCreateModal
          copanyId={copanyId}
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          onSuccess={() => {
            setIsHistoryModalOpen(false);
            // Contributions will auto-refresh via React Query
          }}
        />
      </Modal>
    </>
  );
}
