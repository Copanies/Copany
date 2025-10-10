"use client";
import { useState } from "react";
import type { DistributeRow } from "@/types/database.types";
import type { UserInfo } from "@/actions/user.actions";
import Image from "next/image";
import Button from "@/components/commons/Button";
import StatusLabel from "@/components/commons/StatusLabel";
import { formatDate } from "@/utils/time";
import PhotoViewer from "@/components/commons/PhotoViewer";
import Modal from "@/components/commons/Modal";

function formatAmount(amount: number, currency: string): string {
  const absAmount = Math.abs(amount);
  return `${currency} ${absAmount.toFixed(2)}`;
}

export default function DistributeDetailModal({
  distribute,
  userInfo,
  canConfirm,
  onConfirm,
  onClose,
}: {
  distribute: DistributeRow;
  userInfo?: UserInfo;
  canConfirm: boolean;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const contributorName = userInfo?.name || "Unknown";
  const contributorAvatar = userInfo?.avatar_url || "";

  const handleConfirmClick = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmSubmit = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
      setShowConfirmDialog(false);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancelConfirm = () => {
    setShowConfirmDialog(false);
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Distribute Detail</h2>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 text-base">
          <div className="flex flex-row items-center gap-2">
            <span className="text-gray-600 dark:text-gray-400 w-32">To:</span>
            <div className="flex flex-row items-center gap-1">
              {contributorAvatar ? (
                <Image
                  src={contributorAvatar}
                  alt={contributorName}
                  width={20}
                  height={20}
                  className="w-5 h-5 rounded-full"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 border border-white dark:border-black flex items-center justify-center text-xs text-gray-600 dark:text-gray-300">
                  {contributorName.slice(0, 1).toUpperCase()}
                </div>
              )}
              <span className="">{contributorName}</span>
            </div>
          </div>
          <div className="flex flex-row items-center gap-2">
            <span className="text-gray-600 dark:text-gray-400 w-32">
              Status:
            </span>
            <StatusLabel status={distribute.status} showText={true} />
          </div>
          <div className="flex flex-row items-center gap-2">
            <span className="text-gray-600 dark:text-gray-400 w-32">
              Amount:
            </span>
            <span className="">
              {formatAmount(distribute.amount, distribute.currency)}
            </span>
          </div>
          <div className="flex flex-row items-center gap-2">
            <span className="text-gray-600 dark:text-gray-400 w-32">
              CP Percent:
            </span>
            <span className="">{distribute.contribution_percent}%</span>
          </div>
          <div className="flex flex-row items-center gap-2">
            <span className="text-gray-600 dark:text-gray-400 w-32">
              Distribute date:
            </span>
            <span className="">{formatDate(distribute.created_at)}</span>
          </div>
        </div>
        <div>
          <label className="block text-gray-600 dark:text-gray-400  mb-2">
            Evidence:
          </label>
          {distribute.evidence_url ? (
            <PhotoViewer
              src={distribute.evidence_url}
              alt="Evidence"
              renderTrigger={(open) => (
                <Image
                  src={distribute.evidence_url as string}
                  alt="Evidence"
                  width={320}
                  height={320}
                  className="mx-auto max-h-80 rounded border border-gray-200 dark:border-gray-700 cursor-zoom-in"
                  onClick={open}
                />
              )}
            />
          ) : (
            <div className="text-base text-gray-500">No evidence uploaded.</div>
          )}
        </div>
      </div>

      <div className="flex gap-2 pt-4 justify-end">
        <Button type="button" variant="secondary" size="sm" onClick={onClose}>
          Close
        </Button>
        {canConfirm && (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleConfirmClick}
          >
            Confirm
          </Button>
        )}
      </div>

      {/* Confirmation Dialog */}
      <Modal isOpen={showConfirmDialog} onClose={handleCancelConfirm} size="sm">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Confirm Distribution
          </h3>

          <div className="space-y-4">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg
                    className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                  <p className="font-medium mb-2">
                    Please confirm that you have received the distribution
                    payment.
                  </p>
                  <p className="text-yellow-700 dark:text-yellow-300">
                    This action cannot be undone. Once confirmed, the
                    distribution will be marked as completed and cannot be
                    reversed.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Amount:</span>
                  <span>
                    {formatAmount(distribute.amount, distribute.currency)}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Recipient:</span>
                  <span>{contributorName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Contribution:</span>
                  <span>{distribute.contribution_percent}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4 justify-end">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleCancelConfirm}
              disabled={isConfirming}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleConfirmSubmit}
              disabled={isConfirming}
            >
              {isConfirming ? "Confirming..." : "Confirm Distribution"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
