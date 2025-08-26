"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useCopany } from "@/hooks/copany";
import { useCurrentUser } from "@/hooks/currentUser";
import {
  useDistributes,
  useUpdateDistribute,
  useRegenerateDistributes,
} from "@/hooks/finance";
import type { DistributeRow } from "@/types/database.types";
import type { UserInfo } from "@/actions/user.actions";
import { storageService } from "@/services/storage.service";
import EmptyPlaceholderView from "@/components/commons/EmptyPlaceholderView";
import {
  ReceiptPercentIcon,
  ArrowUpRightIcon,
} from "@heroicons/react/24/outline";
import { useUsersInfo } from "@/hooks/userInfo";
import Image from "next/image";
import Button from "@/components/commons/Button";
import Modal from "@/components/commons/Modal";
import StatusLabel from "@/components/commons/StatusLabel";
import LoadingView from "@/components/commons/LoadingView";
import { getMonthlyPeriod } from "@/utils/time";
import ImageUpload from "@/components/commons/ImageUpload";
import PhotoViewer from "@/components/commons/PhotoViewer";
import { useRouter } from "next/navigation";

// Helper function to format amount with sign
function formatAmount(amount: number, currency: string): string {
  const absAmount = Math.abs(amount);
  return `${currency} ${absAmount.toFixed(2)}`;
}

export default function DistributeView({ copanyId }: { copanyId: string }) {
  const router = useRouter();

  const { data: copany } = useCopany(copanyId);
  const { data: currentUser } = useCurrentUser();
  const { data: distributes, isLoading: isDistributesLoading } =
    useDistributes(copanyId);
  const updateDistribute = useUpdateDistribute(copanyId);
  const regenerate = useRegenerateDistributes(copanyId);

  // Get unique user IDs from distributes for user info
  const distributeUserIds = useMemo(() => {
    if (!distributes || distributes.length === 0) return [];
    return Array.from(new Set(distributes.map((d) => d.to_user)));
  }, [distributes]);

  // Fetch user info for distribute users
  const { data: distributeUsersInfo = {} } = useUsersInfo(distributeUserIds);

  // Group distributes by monthly period
  const groupedDistributes = useMemo(() => {
    if (!distributes || distributes.length === 0) return [];

    const groups = new Map<
      string,
      {
        period: { start: Date; end: Date; key: string };
        items: DistributeRow[];
        totalAmount: number;
      }
    >();

    distributes.forEach((distribute) => {
      const period = getMonthlyPeriod(distribute.created_at);
      const key = period.key;

      if (!groups.has(key)) {
        groups.set(key, {
          period,
          items: [],
          totalAmount: 0,
        });
      }

      const group = groups.get(key)!;
      group.items.push(distribute);
      group.totalAmount += distribute.amount;
    });

    // Sort groups by start date (newest first)
    return Array.from(groups.values()).sort(
      (a, b) => b.period.start.getTime() - a.period.start.getTime()
    );
  }, [distributes]);

  const [_uploadingId, _setUploadingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDistributeId, setSelectedDistributeId] = useState<
    string | null
  >(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewDistribute, setViewDistribute] = useState<DistributeRow | null>(
    null
  );

  const isOwner = useMemo(() => {
    return !!(copany && currentUser && copany.created_by === currentUser.id);
  }, [copany, currentUser]);

  if (isDistributesLoading) {
    return <LoadingView type="label" />;
  }

  if (!distributes || distributes.length === 0) {
    return (
      <div className="p-4">
        <EmptyPlaceholderView
          icon={
            <ReceiptPercentIcon
              className="w-16 h-16 text-gray-500"
              strokeWidth={1}
            />
          }
          title="No distribute records"
          description="Distribute records are automatically generated based on the transaction log and each contributor's share ratio. Records are created on the 1st of every month at 00:00."
          buttonIcon={<ArrowUpRightIcon className="w-4 h-4" />}
          buttonTitle="View Transactions"
          buttonAction={() => {
            router.push(
              `/copany/${copanyId}?tab=Finance&financeTab=Transactions`
            );
          }}
        />
        <div className="flex items-center flex-1 justify-center">
          {isOwner && (
            <Button
              size="md"
              variant="primary"
              onClick={async () => {
                await regenerate.mutateAsync();
              }}
            >
              Calculate - for test
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-0">
      <div className="relative border-b border-gray-200 dark:border-gray-700">
        {groupedDistributes.map((group) => (
          <div key={group.period.key} className="">
            {/* Period Header */}
            <div className="flex h-11 items-center w-full px-3 md:px-4 bg-gray-100 dark:bg-gray-800 border-y border-gray-200 dark:border-gray-700 dark:border-gray-700">
              <div className="flex items-center w-full justify-between">
                <h3 className="test-base font-medium">{group.period.key}</h3>
                <span className="test-base font-medium">
                  {formatAmount(
                    group.totalAmount,
                    group.items[0]?.currency || "USD"
                  )}
                </span>
              </div>
            </div>

            {/* Distribute Items (group-level horizontal scroll) */}
            <DistributeGroupList
              items={group.items}
              distributeUsersInfo={distributeUsersInfo}
              isOwner={isOwner}
              currentUserId={currentUser?.id}
              onOpenTransfer={(id) => {
                setSelectedDistributeId(id);
                setIsModalOpen(true);
              }}
              onOpenView={(d) => {
                setViewDistribute(d);
                setIsViewModalOpen(true);
              }}
            />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 px-0 md:px-4 py-3">
        {isOwner && (
          <Button
            size="md"
            variant="primary"
            className="w-fit"
            onClick={async () => {
              await regenerate.mutateAsync();
            }}
          >
            Calculate - for test
          </Button>
        )}
      </div>

      {/* Distribute Evidence Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedDistributeId(null);
        }}
        size="md"
      >
        <DistributeEvidenceModal
          distribute={
            distributes.find((d) => d.id === selectedDistributeId) || null
          }
          userInfo={
            distributeUsersInfo[
              distributes.find((d) => d.id === selectedDistributeId)?.to_user ||
                ""
            ]
          }
          copanyId={copanyId}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedDistributeId(null);
          }}
          onConfirm={async (evidenceUrl: string | null) => {
            if (selectedDistributeId) {
              await updateDistribute.mutateAsync({
                id: selectedDistributeId,
                changes: {
                  status: "in_review",
                  evidence_url: evidenceUrl,
                },
              });
            }
            setIsModalOpen(false);
            setSelectedDistributeId(null);
          }}
        />
      </Modal>

      {/* Distribute View Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setViewDistribute(null);
        }}
        size="md"
      >
        {viewDistribute && (
          <DistributeDetailModal
            distribute={viewDistribute}
            userInfo={distributeUsersInfo[viewDistribute.to_user]}
            canConfirm={
              (currentUser &&
                currentUser.id === viewDistribute.to_user &&
                viewDistribute.status === "in_review") ||
              false
            }
            onConfirm={async () => {
              await updateDistribute.mutateAsync({
                id: viewDistribute.id,
                changes: { status: "confirmed" },
              });
              setIsViewModalOpen(false);
              setViewDistribute(null);
            }}
            onClose={() => {
              setIsViewModalOpen(false);
              setViewDistribute(null);
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function DistributeEvidenceModal({
  distribute,
  userInfo,
  copanyId,
  onClose,
  onConfirm,
}: {
  distribute: DistributeRow | null;
  userInfo?: UserInfo;
  copanyId: string;
  onClose: () => void;
  onConfirm: (evidenceUrl: string | null) => Promise<void>;
}) {
  const [_file, _setFile] = useState<File | null>(null);
  const [_isUploading, _setIsUploading] = useState(false);
  const [evidenceUrl, setEvidenceUrl] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!distribute) return;

    await onConfirm(evidenceUrl);
  };

  const contributorName = userInfo?.name || "Unknown";
  const contributorAvatar = userInfo?.avatar_url || "";

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
        Distribute
      </h2>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 text-base">
          <div className="flex flex-row items-center gap-2">
            <span className="text-gray-600 dark:text-gray-400">To:</span>
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
            <span className="text-gray-600 dark:text-gray-400">Status:</span>
            <StatusLabel
              status={distribute?.status || "in_progress"}
              showText={true}
            />
          </div>
          <div className="flex flex-row items-center gap-2">
            <span className="text-gray-600 dark:text-gray-400">Amount:</span>
            <span className="">
              {formatAmount(
                distribute?.amount || 0,
                distribute?.currency || "USD"
              )}
            </span>
          </div>
          <div className="flex flex-row items-center gap-2">
            <span className="text-gray-600 dark:text-gray-400">
              Contribution Percent:
            </span>
            <span className="">{distribute?.contribution_percent || 0}%</span>
          </div>
        </div>
        <label className="block test-base font-semibold mb-2 text-gray-900 dark:text-gray-100">
          Upload evidence (optional)
        </label>
        <ImageUpload
          value={evidenceUrl}
          onChange={(url) => setEvidenceUrl(url)}
          onUpload={async (file) =>
            storageService.uploadFinanceEvidence(file, copanyId, "distribute")
          }
          onDelete={async (url) => {
            const path = storageService.extractFinancePathFromUrl(url);
            if (!path) return { success: false, error: "Invalid URL" };
            return await storageService.deleteFinanceEvidence(path);
          }}
          accept="image/*"
          maxBytes={storageService.getFinanceEvidenceMaxFileSize()}
          helperText="PNG, JPG, JPEG, GIF, WebP • Max 20MB"
          uploadButtonText="Upload Image"
        />
      </div>

      <div className="flex gap-2 pt-4 justify-end">
        <Button type="button" variant="secondary" size="md" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={handleConfirm}
          disabled={_isUploading}
        >
          {_isUploading ? "Uploading..." : "Confirm"}
        </Button>
      </div>
    </div>
  );
}

function DistributeDetailModal({
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
  const contributorName = userInfo?.name || "Unknown";
  const contributorAvatar = userInfo?.avatar_url || "";

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Distribute Detail</h2>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 text-base">
          <div className="flex flex-row items-center gap-2">
            <span className="text-gray-600 dark:text-gray-400">To:</span>
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
            <span className="text-gray-600 dark:text-gray-400">Status:</span>
            <StatusLabel status={distribute.status} showText={true} />
          </div>
          <div className="flex flex-row items-center gap-2">
            <span className="text-gray-600 dark:text-gray-400">Amount:</span>
            <span className="">
              {formatAmount(distribute.amount, distribute.currency)}
            </span>
          </div>
          <div className="flex flex-row items-center gap-2">
            <span className="text-gray-600 dark:text-gray-400">
              Contribution Percent:
            </span>
            <span className="">{distribute.contribution_percent}%</span>
          </div>
        </div>
        <div>
          <label className="block test-base font-semibold mb-2">Evidence</label>
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
          <Button type="button" variant="primary" size="sm" onClick={onConfirm}>
            Confirm
          </Button>
        )}
      </div>
    </div>
  );
}

// Group list with unified action width
function DistributeGroupList({
  items,
  distributeUsersInfo,
  isOwner,
  currentUserId,
  onOpenTransfer,
  onOpenView,
}: {
  items: DistributeRow[];
  distributeUsersInfo: Record<string, UserInfo>;
  isOwner: boolean;
  currentUserId?: string;
  onOpenTransfer: (id: string) => void;
  onOpenView: (item: DistributeRow) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [actionWidth, setActionWidth] = useState<number>(0);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const measure = () => {
      if (!containerRef.current) return;
      const nodes = containerRef.current.querySelectorAll<HTMLDivElement>(
        '[data-role="actions"]'
      );
      let maxW = 0;
      nodes.forEach((n) => {
        maxW = Math.max(maxW, n.scrollWidth);
      });
      setActionWidth(maxW);
    };

    // Initial measure
    measure();

    // Observe action cells size changes
    const ro = new ResizeObserver(() => {
      measure();
    });
    resizeObserverRef.current = ro;
    const nodes = containerRef.current.querySelectorAll<HTMLDivElement>(
      '[data-role="actions"]'
    );
    nodes.forEach((n) => ro.observe(n));

    // Re-measure on window resize
    const onWindowResize = () => measure();
    window.addEventListener("resize", onWindowResize);

    return () => {
      window.removeEventListener("resize", onWindowResize);
      ro.disconnect();
    };
  }, [
    // re-bind observers when the set of rows or permission-affecting props change
    items.length,
    isOwner,
    currentUserId,
  ]);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-max" ref={containerRef}>
        {items.map((d) => {
          const userInfo = distributeUsersInfo[d.to_user];
          const contributorName = userInfo?.name || d.to_user;
          const contributorAvatar = userInfo?.avatar_url || "";
          const canView =
            isOwner || (currentUserId && currentUserId === d.to_user);

          return (
            <div
              key={d.id}
              className="pl-3 md:pl-4 h-11 items-center hover:bg-gray-50 group dark:hover:bg-gray-900 select-none"
            >
              <div className="flex flex-row items-center h-11 gap-3 text-base">
                <div className="flex items-center gap-2 w-36">
                  {contributorAvatar ? (
                    <Image
                      src={contributorAvatar}
                      alt={contributorName}
                      width={20}
                      height={20}
                      className="w-5 h-5 rounded-full"
                    />
                  ) : (
                    <div
                      className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 border border-white dark:border-black flex items-center justify-center text-xs text-gray-600 dark:text-gray-300"
                      title={contributorName}
                    >
                      {contributorName.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <span className="text-gray-900 dark:text-gray-100">
                    {contributorName}
                  </span>
                </div>
                <span className="text-left w-20">
                  {d.contribution_percent}%
                </span>
                <span className="text-left w-36">
                  {formatAmount(d.amount, d.currency)}
                </span>
                <span className="text-left w-36">
                  <StatusLabel status={d.status} showText={true} />
                </span>
                <div className="sticky ml-auto right-0 flex items-center justify-start h-11 bg-white dark:bg-background-dark group group-hover:bg-gray-50 dark:group-hover:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
                  <div
                    data-role="actions"
                    className="flex items-center justify-start gap-0 px-2"
                    style={{
                      width: actionWidth ? `${actionWidth}px` : undefined,
                    }}
                  >
                    {d.status === "in_progress" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="!text-base"
                        onClick={() => onOpenTransfer(d.id)}
                        disabled={!isOwner}
                      >
                        Distribute
                      </Button>
                    )}
                    {(d.status === "in_review" || d.status === "confirmed") && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="!text-base"
                        disabled={!canView}
                        onClick={() => {
                          if (!canView) return;
                          onOpenView(d);
                        }}
                      >
                        View
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
