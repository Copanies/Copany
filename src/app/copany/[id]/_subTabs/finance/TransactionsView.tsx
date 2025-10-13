"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useCopany } from "@/hooks/copany";
import { useCurrentUser } from "@/hooks/currentUser";
import {
  useTransactions,
  useCreateTransaction,
  useReviewTransaction,
  useDeleteTransaction,
} from "@/hooks/finance";
import type { TransactionRow, TransactionType } from "@/types/database.types";
import type { UserInfo } from "@/actions/user.actions";
import { storageService } from "@/services/storage.service";
import Modal from "@/components/commons/Modal";
import Button from "@/components/commons/Button";
import EmptyPlaceholderView from "@/components/commons/EmptyPlaceholderView";
import StatusLabel from "@/components/commons/StatusLabel";
import LoadingView from "@/components/commons/LoadingView";
import { BanknotesIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useUsersInfo } from "@/hooks/userInfo";
import Image from "next/image";
import { shimmerDataUrl } from "@/utils/shimmer";
import { formatDate, getMonthlyPeriodFrom10th } from "@/utils/time";
import ImageUpload from "@/components/commons/ImageUpload";
import PhotoViewer from "@/components/commons/PhotoViewer";

// Helper function to format amount with sign based on transaction type
function formatAmount(
  amount: number,
  currency: string,
  type: TransactionType
): string {
  const sign = type === "income" ? "+" : "-";
  const absAmount = Math.abs(amount);
  return `${sign}${currency} ${absAmount.toFixed(2)}`;
}

export default function TransactionsView({ copanyId }: { copanyId: string }) {
  const { data: copany } = useCopany(copanyId);
  const { data: currentUser } = useCurrentUser();
  const { data: transactions, isLoading: isTransactionsLoading } =
    useTransactions(copanyId);
  const createTransaction = useCreateTransaction(copanyId);
  const reviewTransaction = useReviewTransaction(copanyId);
  const deleteTransaction = useDeleteTransaction(copanyId);

  // Get unique user IDs from transactions for user info
  const transactionUserIds = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];
    return Array.from(new Set(transactions.map((t) => t.actor_id)));
  }, [transactions]);

  // Fetch user info for transaction actors
  const { data: transactionUsersInfo = {} } = useUsersInfo(transactionUserIds);

  // Group transactions by monthly period
  const groupedTransactions = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];

    const groups = new Map<
      string,
      {
        period: { start: Date; end: Date; key: string };
        items: TransactionRow[];
        totalIncome: number;
        totalExpense: number;
        netAmount: number;
      }
    >();

    transactions.forEach((transaction) => {
      const period = getMonthlyPeriodFrom10th(transaction.occurred_at);
      const key = period.key;

      if (!groups.has(key)) {
        groups.set(key, {
          period,
          items: [],
          totalIncome: 0,
          totalExpense: 0,
          netAmount: 0,
        });
      }

      const group = groups.get(key)!;
      group.items.push(transaction);

      if (transaction.type === "income") {
        group.totalIncome += transaction.amount;
        group.netAmount += transaction.amount;
      } else {
        group.totalExpense += transaction.amount;
        group.netAmount -= transaction.amount;
      }
    });

    // Sort groups by start date (newest first)
    return Array.from(groups.values()).sort(
      (a, b) => b.period.start.getTime() - a.period.start.getTime()
    );
  }, [transactions]);

  const isOwner = useMemo(() => {
    return !!(copany && currentUser && copany.created_by === currentUser.id);
  }, [copany, currentUser]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewTransaction, setViewTransaction] = useState<TransactionRow | null>(
    null
  );

  async function handleCreate(
    payload: Omit<
      TransactionRow,
      | "id"
      | "created_at"
      | "updated_at"
      | "copany_id"
      | "evidence_url"
      | "actor_id"
    > & { copany_id?: string; evidence_url?: string | null },
    file?: File | null
  ) {
    // Prefer evidence_url from payload (ImageUpload already uploaded)
    let evidence_url: string | null =
      (payload as { evidence_url?: string }).evidence_url || null;
    if (!evidence_url && file) {
      const res = await storageService.uploadFinanceEvidence(
        file,
        copanyId,
        "transaction"
      );
      if (res.success && res.url) evidence_url = res.url;
    }

    const transactionData: Omit<
      TransactionRow,
      "id" | "created_at" | "updated_at"
    > = {
      ...payload,
      copany_id: copanyId,
      evidence_url,
      actor_id: currentUser?.id || "",
    };

    await createTransaction.mutateAsync(transactionData);
  }

  if (isTransactionsLoading) {
    return <LoadingView type="label" />;
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="p-4 min-w-0">
        <EmptyPlaceholderView
          icon={
            <BanknotesIcon
              className="w-16 h-16 text-gray-500"
              strokeWidth={1}
            />
          }
          title="Add first transactions"
          description="Transaction log records Copany’s income and expenses. Anyone can add a transaction, but it only takes effect after approval by the Copany Owner."
          buttonIcon={<PlusIcon className="w-4 h-4" />}
          buttonTitle="New Transaction"
          buttonAction={() => currentUser && setIsModalOpen(true)}
          size="lg"
        />
        <TransactionModal
          copanyId={copanyId}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onCreate={handleCreate}
        />
      </div>
    );
  }

  return (
    <div className="p-0 w-full min-w-0">
      <div className="flex items-center justify-between px-0 md:px-4 pt-2 pb-3">
        {/* <div className="text-base text-gray-600">Transactions</div> */}
        <Button
          size="md"
          onClick={() => setIsModalOpen(true)}
          disabled={!currentUser}
          disableTooltipConent="Sign in to add a transaction"
        >
          <div className="flex flex-row items-center gap-1">
            <span>New Transaction</span>
          </div>
        </Button>
      </div>

      <div className="w-full mx-auto border-b border-gray-200 dark:border-gray-700">
        {groupedTransactions.map((group) => (
          <div key={group.period.key} className="w-full">
            {/* Period Header */}
            <div className="flex flex-1 px-3 md:px-4 w-full h-11 items-center bg-gray-100 dark:bg-gray-800 border-y border-gray-200 dark:border-gray-700 ">
              <div className="flex items-center justify-between w-full">
                <span className="test-base font-medium text-gray-900 dark:text-gray-100 truncate">
                  {group.period.key}
                </span>
                <div className="flex items-center gap-4 test-base">
                  <span className="truncate">
                    {formatAmount(
                      group.netAmount,
                      group.items[0]?.currency || "USD",
                      group.netAmount >= 0 ? "income" : "expense"
                    )}
                  </span>
                </div>
              </div>
            </div>
            <TransactionsGroupList
              items={group.items}
              transactionUsersInfo={transactionUsersInfo}
              isOwner={isOwner}
              currentUserId={currentUser?.id}
              onOpenView={(t) => {
                setViewTransaction(t);
                setIsViewModalOpen(true);
              }}
            />
          </div>
        ))}
      </div>

      <TransactionModal
        copanyId={copanyId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreate}
      />

      {/* Transaction View Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setViewTransaction(null);
        }}
        size="md"
      >
        {viewTransaction && (
          <TransactionDetailModal
            transaction={viewTransaction}
            isOwner={isOwner}
            userInfo={transactionUsersInfo[viewTransaction.actor_id]}
            currentUserId={currentUser?.id}
            onClose={() => {
              setIsViewModalOpen(false);
              setViewTransaction(null);
            }}
            onConfirm={async () => {
              if (!viewTransaction) return;
              await reviewTransaction.mutateAsync({
                id: viewTransaction.id,
                status: "confirmed",
              });
              setIsViewModalOpen(false);
              setViewTransaction(null);
            }}
            onDelete={async () => {
              if (!viewTransaction) return;
              await deleteTransaction.mutateAsync({ id: viewTransaction.id });
              setIsViewModalOpen(false);
              setViewTransaction(null);
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function TransactionModal({
  copanyId,
  isOpen,
  onClose,
  onCreate,
}: {
  copanyId: string;
  isOpen: boolean;
  onClose: () => void;
  onCreate: (
    payload: Omit<
      TransactionRow,
      | "id"
      | "created_at"
      | "updated_at"
      | "copany_id"
      | "evidence_url"
      | "actor_id"
    > & { copany_id?: string; evidence_url?: string | null },
    file?: File | null
  ) => Promise<void>;
}) {
  const [type, setType] = useState<TransactionType>("income");
  const [amount, setAmount] = useState<number>();
  const [currency, setCurrency] = useState<string>("USD");
  const [occurredAt, setOccurredAt] = useState<string>(
    new Date().toISOString().slice(0, 16)
  );
  const [description, setDescription] = useState<string>("");
  const [evidenceUrl, setEvidenceUrl] = useState<string | null>(null);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          New Transaction
        </h2>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <p className="font-semibold text-sm">Type</p>
            <div className="relative">
              <select
                className="border px-2 py-1 pr-8 w-full rounded-md border-gray-300 dark:border-gray-600 appearance-none"
                value={type}
                onChange={(e) => setType(e.target.value as TransactionType)}
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <svg
                  className="w-4 h-4 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <p className="font-semibold text-sm">Description</p>
            <input
              className="border px-2 py-1 flex-1 min-w-[200px] rounded-md border-gray-300 dark:border-gray-600"
              placeholder="Description about this transaction..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <p className="font-semibold text-sm">Amount</p>
            <div className="flex flex-row gap-2">
              <div className="relative">
                <select
                  className="border px-2 py-1 pr-8 w-36 rounded-md border-gray-300 dark:border-gray-600 appearance-none"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option value="USD">USD</option>
                  {/* <option value="CNY">CNY</option>
                  <option value="EUR">EUR</option>
                  <option value="JPY">JPY</option>
                  <option value="GBP">GBP</option>
                  <option value="KRW">KRW</option> */}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <svg
                    className="w-4 h-4 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
              <input
                className="border px-2 py-1 w-28 rounded-md border-gray-300 dark:border-gray-600 flex-1"
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <p className="font-semibold text-sm">Occurred At</p>
            <input
              className="border px-2 py-1 rounded-md border-gray-300 dark:border-gray-600"
              type="datetime-local"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <p className="font-semibold text-sm">Evidence</p>
            <ImageUpload
              value={evidenceUrl}
              onChange={(url) => setEvidenceUrl(url)}
              onUpload={async (file) =>
                storageService.uploadFinanceEvidence(
                  file,
                  copanyId,
                  "transaction"
                )
              }
              onDelete={async (url) => {
                const path = storageService.extractFinancePathFromUrl(url);
                if (!path) return { success: false, error: "Invalid URL" };
                return await storageService.deleteFinanceEvidence(path);
              }}
              accept="image/*"
              maxBytes={storageService.getFinanceEvidenceMaxFileSize()}
              helperText="PNG, JPG, JPEG, GIF, WebP • Max 20MB"
              uploadButtonText="Upload Evidence"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-4 justify-end">
          <Button type="button" variant="secondary" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={async () => {
              await onCreate(
                {
                  type,
                  amount: amount || 0,
                  currency,
                  status: "in_review",
                  occurred_at: new Date(occurredAt).toISOString(),
                  description,
                  evidence_url: evidenceUrl,
                },
                null
              );
              setDescription("");
              setAmount(undefined);
              setEvidenceUrl(null);
              onClose();
            }}
          >
            Create
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function TransactionDetailModal({
  transaction,
  isOwner,
  userInfo,
  currentUserId,
  onClose,
  onConfirm,
  onDelete,
}: {
  transaction: TransactionRow;
  isOwner: boolean;
  userInfo: UserInfo;
  currentUserId?: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const actorName = userInfo?.name || "";
  const actorAvatar = userInfo?.avatar_url || "";
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
        Transaction Detail
      </h2>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 text-base">
          <div className="flex flex-row items-center gap-2">
            <span className="text-gray-600 dark:text-gray-400 w-32">
              Amount:
            </span>
            <span>
              {formatAmount(
                transaction.amount,
                transaction.currency,
                transaction.type
              )}
            </span>
          </div>
          <div className="flex flex-row items-center gap-2">
            <span className="text-gray-600 dark:text-gray-400 w-32">Type:</span>
            <span className="">{transaction.type}</span>
          </div>
          <div className="flex flex-row items-center gap-2">
            <span className="text-gray-600 dark:text-gray-400 w-32">
              Submitter:
            </span>
            {actorAvatar ? (
              <Image
                src={actorAvatar}
                alt={actorName}
                width={20}
                height={20}
                className="w-5 h-5 rounded-full"
                placeholder="blur"
                blurDataURL={shimmerDataUrl(20, 20)}
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 border border-white dark:border-black flex items-center justify-center text-xs text-gray-600 dark:text-gray-300">
                {actorName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <span className="">{actorName}</span>
          </div>
          <div className="flex flex-row items-center gap-2">
            <span className="text-gray-600 dark:text-gray-400 w-32">
              Status:
            </span>
            <StatusLabel status={transaction.status} showText={true} />
          </div>
          {transaction.description && (
            <div className="flex flex-row items-center gap-2">
              <span className="text-gray-600 dark:text-gray-400 w-32">
                Description:
              </span>
              <span className="">{transaction.description}</span>
            </div>
          )}
          <div className="flex flex-row items-center gap-2">
            <span className="text-gray-600 dark:text-gray-400 w-32">
              Occurred at:
            </span>
            <span className="">{formatDate(transaction.occurred_at)}</span>
          </div>
        </div>
        <div>
          <label className="block text-gray-600 dark:text-gray-400  mb-2">
            Evidence:
          </label>
          {transaction.evidence_url ? (
            <PhotoViewer
              src={transaction.evidence_url}
              alt="Evidence"
              renderTrigger={(open) => (
                <Image
                  src={transaction.evidence_url as string}
                  alt="Evidence"
                  width={320}
                  height={320}
                  className="mx-auto max-h-80 rounded border border-gray-200 dark:border-gray-700 cursor-zoom-in"
                  onClick={open}
                  placeholder="blur"
                  blurDataURL={shimmerDataUrl(320, 320)}
                />
              )}
            />
          ) : (
            <div className="text-base text-gray-500">No evidence uploaded.</div>
          )}
        </div>
      </div>

      <div className="flex gap-2 pt-4 justify-end">
        <Button type="button" variant="secondary" size="md" onClick={onClose}>
          Close
        </Button>
        {currentUserId &&
          currentUserId === transaction.actor_id &&
          transaction.status === "in_review" && (
            <Button type="button" variant="danger" size="md" onClick={onDelete}>
              Delete
            </Button>
          )}
        {isOwner && transaction.status === "in_review" && (
          <Button type="button" variant="primary" size="md" onClick={onConfirm}>
            Confirm
          </Button>
        )}
      </div>
    </div>
  );
}

function TransactionsGroupList({
  items,
  transactionUsersInfo,
  isOwner,
  currentUserId,
  onOpenView,
}: {
  items: TransactionRow[];
  transactionUsersInfo: Record<string, UserInfo>;
  isOwner: boolean;
  currentUserId?: string;
  onOpenView: (t: TransactionRow) => void;
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
  }, [items.length, isOwner, currentUserId]);

  return (
    <div className="w-full overflow-x-auto scrollbar-hide">
      <div className="min-w-max" ref={containerRef}>
        {items.map((t) => {
          const userInfo = transactionUsersInfo[t.actor_id];
          const actorName = userInfo?.name || "";
          const actorAvatar = userInfo?.avatar_url || "";
          const isPendingReview = t.status === "in_review" && isOwner;

          return (
            <div
              key={t.id}
              className={`pl-3 md:pl-4 h-11 items-center group min-w-0 ${
                isPendingReview ? "bg-purple-100 dark:bg-purple-900/30" : ""
              }`}
            >
              <div className="flex gap-3 test-base h-11 items-center">
                <span className="font-medium flex-shrink-0 w-36">
                  {formatAmount(t.amount, t.currency, t.type)}
                </span>
                <div className="flex items-center gap-2 flex-shrink-0 w-36">
                  {actorAvatar ? (
                    <Image
                      src={actorAvatar}
                      alt={actorName}
                      width={20}
                      height={20}
                      className="w-5 h-5 rounded-full"
                      placeholder="blur"
                      blurDataURL={shimmerDataUrl(20, 20)}
                    />
                  ) : (
                    <div
                      className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 border border-white dark:border-black flex items-center justify-center text-xs text-gray-600 dark:text-gray-300"
                      title={actorName}
                    >
                      {actorName.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <span className="text-gray-900 dark:text-gray-100 truncate">
                    {actorName}
                  </span>
                </div>
                <span className="flex-shrink-0 w-36">
                  {formatDate(t.occurred_at)}
                </span>
                <span className="text-gray-700 dark:text-gray-300 flex-shrink-0 w-36">
                  <StatusLabel status={t.status} showText={true} />
                </span>
                <span className="flex-1 min-w-0 truncate w-40">
                  {t.description ? t.description : "No description"}
                </span>
                <div
                  className={`sticky right-0 h-11 flex items-center justify-start gap-0 border-l border-gray-200 dark:border-gray-700 ${
                    isPendingReview
                      ? "bg-purple-100 dark:bg-transparent"
                      : "bg-white dark:bg-background-dark"
                  }`}
                >
                  <div
                    data-role="actions"
                    className="flex items-center justify-start gap-0 px-2"
                    style={{
                      width: actionWidth ? `${actionWidth}px` : undefined,
                    }}
                  >
                    {(t.status === "in_review" || t.status === "confirmed") && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="!text-base !border-0"
                        onClick={() => onOpenView(t)}
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
