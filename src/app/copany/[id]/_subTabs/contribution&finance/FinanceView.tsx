"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useCopany } from "@/hooks/copany";
import { useCurrentUser } from "@/hooks/currentUser";
import {
  useTransactions,
  useCreateTransaction,
  useReviewTransaction,
  useDeleteTransaction,
  useAppStoreFinance,
  useRefreshAppStoreFinance,
  useAppStoreConnectStatus,
} from "@/hooks/finance";
import type {
  TransactionReviewStatus,
  TransactionRow,
  TransactionType,
} from "@/types/database.types";
import type { UserInfo } from "@/actions/user.actions";
import { storageService } from "@/services/storage.service";
import Modal from "@/components/commons/Modal";
import Button from "@/components/commons/Button";
import EmptyPlaceholderView from "@/components/commons/EmptyPlaceholderView";
import StatusLabel from "@/components/commons/StatusLabel";
import LoadingView from "@/components/commons/LoadingView";
import {
  BanknotesIcon,
  PlusIcon,
  ReceiptPercentIcon,
} from "@heroicons/react/24/outline";
import { useUsersInfo } from "@/hooks/userInfo";
import Image from "next/image";
import { shimmerDataUrlWithTheme } from "@/utils/shimmer";
import { useDarkMode } from "@/utils/useDarkMode";
import { formatDate, getMonthlyPeriodFrom10th } from "@/utils/time";
import ImageUpload from "@/components/commons/ImageUpload";
import PhotoViewer from "@/components/commons/PhotoViewer";
import AppleAppStoreIcon from "@/assets/apple_app_store_logo.webp";
import ConnectToAppStoreConnect from "@/components/finance/ConnectToAppStoreConnect";

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

const APP_STORE_ACTOR_ID = "__app_store__";
const APP_STORE_ACTOR_NAME = "App Store";
const APP_STORE_STATUS_TEXT = "Auto Confirmed";
const APP_STORE_DESCRIPTION =
  "Automatically synced via App Store Connect API. The actual received amount may differ due to bank transfer fees and exchange rate differences.";

function getMonthEndISOString(yearMonth: string) {
  const [yearStr, monthStr] = yearMonth.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return new Date().toISOString();
  }
  const date = new Date(Date.UTC(year, month, 0, 0, 0, 0));
  return date.toISOString();
}

export default function FinanceView({ copanyId }: { copanyId: string }) {
  const { data: copany } = useCopany(copanyId);
  const { data: currentUser } = useCurrentUser();
  const { data: transactions, isLoading: isTransactionsLoading } =
    useTransactions(copanyId);
  const { data: appStoreFinanceData, isLoading: isAppStoreFinanceLoading } =
    useAppStoreFinance(copanyId);
  const refreshAppStoreFinance = useRefreshAppStoreFinance(copanyId);
  const { data: isAppStoreConnected } = useAppStoreConnectStatus(copanyId);
  const createTransaction = useCreateTransaction(copanyId);
  const reviewTransaction = useReviewTransaction(copanyId);
  const deleteTransaction = useDeleteTransaction(copanyId);
  const appStoreChartData = appStoreFinanceData?.chartData;

  const appStoreTransactions = useMemo<TransactionRow[]>(() => {
    if (!copanyId || !appStoreChartData || appStoreChartData.length === 0) {
      return [];
    }

    return appStoreChartData.map((item) => {
      const occurredAt = getMonthEndISOString(item.date);
      const normalizedAmount =
        typeof item.amountUSD === "number" && Number.isFinite(item.amountUSD)
          ? item.amountUSD
          : 0;

      return {
        id: `app-store-${copanyId}-${item.date}`,
        created_at: occurredAt,
        updated_at: occurredAt,
        copany_id: copanyId,
        actor_id: APP_STORE_ACTOR_ID,
        type: "income",
        description: APP_STORE_DESCRIPTION,
        amount: normalizedAmount,
        currency: "USD",
        status: "confirmed",
        occurred_at: occurredAt,
        evidence_url: null,
      };
    });
  }, [appStoreChartData, copanyId]);

  const combinedTransactions = useMemo<TransactionRow[]>(() => {
    return [...(transactions ?? []), ...appStoreTransactions];
  }, [transactions, appStoreTransactions]);

  // Get unique user IDs from transactions for user info
  const transactionUserIds = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];
    return Array.from(new Set(transactions.map((t) => t.actor_id)));
  }, [transactions]);

  // Fetch user info for transaction actors
  const { data: transactionUsersInfo = {} } = useUsersInfo(transactionUserIds);

  // Calculate distribution month based on copany settings
  const distributionMonth = useMemo(() => {
    if (!copany) return null;

    const delayDays = copany.distribution_delay_days ?? 90;
    const now = new Date();
    const distributionDate = new Date(now);
    distributionDate.setUTCDate(distributionDate.getUTCDate() - delayDays);
    const distributionYear = distributionDate.getUTCFullYear();
    const distributionMonthIndex = distributionDate.getUTCMonth();

    return {
      year: distributionYear,
      month: distributionMonthIndex,
      key: `${distributionYear}-${String(distributionMonthIndex + 1).padStart(
        2,
        "0"
      )}`,
    };
  }, [copany]);

  // Group transactions by monthly period
  const groupedTransactions = useMemo(() => {
    if (!combinedTransactions || combinedTransactions.length === 0) return [];

    const groups = new Map<
      string,
      {
        period: { start: Date; end: Date; key: string };
        items: TransactionRow[];
        totalIncome: number;
        totalExpense: number;
        netAmount: number;
        isDistributionMonth: boolean;
      }
    >();

    combinedTransactions.forEach((transaction) => {
      // Group by the actual month of occurred_at, not by the "from 10th" period
      const occurredDate = new Date(transaction.occurred_at);
      const year = occurredDate.getUTCFullYear();
      const month = occurredDate.getUTCMonth();

      const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
      const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      const key = `${months[month]} ${year}`;
      const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

      // Check if this month is the distribution month
      const isDistributionMonth = distributionMonth?.key === monthKey;

      const period = { start, end, key };

      if (!groups.has(key)) {
        groups.set(key, {
          period,
          items: [],
          totalIncome: 0,
          totalExpense: 0,
          netAmount: 0,
          isDistributionMonth: isDistributionMonth || false,
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
  }, [combinedTransactions, distributionMonth]);

  const isOwner = useMemo(() => {
    return !!(copany && currentUser && copany.created_by === currentUser.id);
  }, [copany, currentUser]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [initialTransactionType, setInitialTransactionType] =
    useState<TransactionType>("income");
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

  if (isTransactionsLoading || isAppStoreFinanceLoading) {
    return <LoadingView type="label" />;
  }

  if (!combinedTransactions || combinedTransactions.length === 0) {
    return (
      <div className="p-4 min-w-0">
        <EmptyPlaceholderView
          icon={
            <BanknotesIcon
              className="w-16 h-16 text-gray-500 dark:text-gray-400"
              strokeWidth={1}
            />
          }
          title="Add first transactions"
          description="Transaction log records Copany's income and expenses. Anyone can add a transaction, but it only takes effect after approval by the Copany Owner."
          buttonIcon={<PlusIcon className="w-4 h-4" />}
          buttonTitle="New Transaction"
          buttonAction={() => {
            if (currentUser) {
              setInitialTransactionType("income");
              setIsModalOpen(true);
            }
          }}
          size="lg"
        />
        <TransactionModal
          copanyId={copanyId}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onCreate={handleCreate}
          initialType={initialTransactionType}
        />
      </div>
    );
  }

  return (
    <div className="p-0 w-full min-w-0">
      <div className="flex items-center justify-between px-0 pb-3">
        <div className="text-base font-semibold">
          Income and Expense Records
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="md"
            variant="primary"
            onClick={() => {
              setInitialTransactionType("income");
              setIsModalOpen(true);
            }}
            disabled={!currentUser}
            disableTooltipConent="Sign in to add a transaction"
          >
            <div className="flex flex-row items-center gap-1">
              <span>Income</span>
            </div>
          </Button>
          <Button
            size="md"
            variant="secondary"
            onClick={() => {
              setInitialTransactionType("expense");
              setIsModalOpen(true);
            }}
            disabled={!currentUser}
            disableTooltipConent="Sign in to add a transaction"
          >
            <div className="flex flex-row items-center gap-1">
              <span>Expense</span>
            </div>
          </Button>
          {!isAppStoreConnected && (
            <div className="hidden md:block">
              <ConnectToAppStoreConnect
                copanyId={copanyId}
                onSuccess={async () => {
                  await refreshAppStoreFinance.mutateAsync();
                }}
              />
            </div>
          )}
        </div>
      </div>

      {!isAppStoreConnected && (
        <div className="block md:hidden px-0 pb-3">
          <ConnectToAppStoreConnect
            copanyId={copanyId}
            onSuccess={async () => {
              await refreshAppStoreFinance.mutateAsync();
            }}
          />
        </div>
      )}

      <div className="w-full mx-auto rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {groupedTransactions.map((group) => (
          <div key={group.period.key} className="w-full">
            {/* Period Header */}
            <div className="flex flex-1 px-3 md:px-4 w-full h-11 items-center bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 ">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-900 dark:text-gray-100 truncate">
                    {group.period.key}
                  </span>
                  {group.isDistributionMonth && (
                    <span className="flex items-center gap-1 px-2 py-0.5 text-sm rounded-full bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100 border border-gray-300 dark:border-gray-700">
                      <ReceiptPercentIcon className="w-4 h-4" />
                      <p className="hidden md:block">Distribution Month</p>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="truncat">
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
        initialType={initialTransactionType}
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
  initialType = "income",
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
  initialType?: TransactionType;
}) {
  const [type, setType] = useState<TransactionType>(initialType);
  const [amount, setAmount] = useState<number>();
  const [currency, setCurrency] = useState<string>("USD");
  const [occurredAt, setOccurredAt] = useState<string>(
    new Date().toISOString().slice(0, 16)
  );
  const [description, setDescription] = useState<string>("");
  const [evidenceUrl, setEvidenceUrl] = useState<string | null>(null);

  // Update type when initialType changes and modal opens
  useEffect(() => {
    if (isOpen) {
      setType(initialType);
      // Reset form when modal opens
      setAmount(undefined);
      setDescription("");
      setEvidenceUrl(null);
      setOccurredAt(new Date().toISOString().slice(0, 16));
    }
  }, [isOpen, initialType]);

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
            <p className="font-semibold text-sm">Description</p>
            <input
              className="border px-2 py-1 flex-1 min-w-[200px] rounded-md border-gray-300 dark:border-gray-600"
              placeholder="Description about this transaction..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
  userInfo?: UserInfo;
  currentUserId?: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const isAppStoreTransaction = transaction.actor_id === APP_STORE_ACTOR_ID;
  const actorName = isAppStoreTransaction
    ? APP_STORE_ACTOR_NAME
    : userInfo?.name || "";
  const actorAvatar = isAppStoreTransaction
    ? AppleAppStoreIcon
    : userInfo?.avatar_url || "";
  const avatarClassName = isAppStoreTransaction
    ? "w-5 h-5"
    : "w-5 h-5 rounded-full";
  const isDarkMode = useDarkMode();
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
                className={avatarClassName}
                placeholder="blur"
                blurDataURL={shimmerDataUrlWithTheme(20, 20, isDarkMode)}
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
            <TransactionStatusDisplay
              status={transaction.status}
              isAutoConfirmed={isAppStoreTransaction}
              size="md"
            />
          </div>
          <div className="flex flex-row items-center gap-2">
            <span className="text-gray-600 dark:text-gray-400 w-32">
              Occurred at:
            </span>
            <span className="">{formatDate(transaction.occurred_at)}</span>
          </div>
          {transaction.description && (
            <div className="flex flex-row items-start gap-2">
              <span className="text-gray-600 dark:text-gray-400 w-32 flex-shrink-0">
                Description:
              </span>
              <span className="">{transaction.description}</span>
            </div>
          )}
        </div>
        {transaction.evidence_url && (
          <div>
            <label className="block text-gray-600 dark:text-gray-400  mb-2">
              Evidence:
            </label>
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
                  blurDataURL={shimmerDataUrlWithTheme(320, 320, isDarkMode)}
                />
              )}
            />
          </div>
        )}
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
  const isDarkMode = useDarkMode();
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
          const isAppStoreTransaction = t.actor_id === APP_STORE_ACTOR_ID;
          const actorName = isAppStoreTransaction
            ? APP_STORE_ACTOR_NAME
            : userInfo?.name || "";
          const actorAvatar = isAppStoreTransaction
            ? AppleAppStoreIcon
            : userInfo?.avatar_url || "";
          const avatarClassName = isAppStoreTransaction
            ? "w-5 h-5"
            : "w-5 h-5 rounded-full";
          const isPendingReview = t.status === "in_review" && isOwner;

          return (
            <div
              key={t.id}
              className={`pl-3 md:pl-4 h-11 items-center group min-w-0`}
            >
              <div className="flex gap-3 test-sm h-11 items-center">
                <span className="font-medium text-sm flex-shrink-0 w-36">
                  {formatAmount(t.amount, t.currency, t.type)}
                </span>
                <div className="flex items-center gap-2 flex-shrink-0 w-36">
                  {actorAvatar ? (
                    <Image
                      src={actorAvatar}
                      alt={actorName}
                      width={20}
                      height={20}
                      className={avatarClassName}
                      placeholder="blur"
                      blurDataURL={shimmerDataUrlWithTheme(20, 20, isDarkMode)}
                    />
                  ) : (
                    <div
                      className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 border border-white dark:border-black flex items-center justify-center text-xs text-gray-600 dark:text-gray-300"
                      title={actorName}
                    >
                      {actorName.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <span className="text-gray-900 text-sm dark:text-gray-100 truncate">
                    {actorName}
                  </span>
                </div>
                <span className="flex-shrink-0 text-sm w-36">
                  {formatDate(t.occurred_at)}
                </span>
                <div className="text-gray-700 text-sm dark:text-gray-300 flex-shrink-0 w-36">
                  <TransactionStatusDisplay
                    status={t.status}
                    isAutoConfirmed={isAppStoreTransaction}
                  />
                </div>
                <span className="flex-1 min-w-0 text-sm truncate w-40">
                  {t.description ? t.description : "No description"}
                </span>
                <div
                  className={`sticky rounded-r-lg right-0 h-11 flex items-center justify-start gap-0 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-background-dark`}
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
                        className="!text-sm !border-0"
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

function TransactionStatusDisplay({
  status,
  isAutoConfirmed,
  size = "sm",
}: {
  status: TransactionReviewStatus;
  isAutoConfirmed: boolean;
  size?: "sm" | "md";
}) {
  if (isAutoConfirmed) {
    return (
      <div className="flex flex-row items-center gap-1">
        <StatusLabel status="confirmed" showText={false} size={size} />
        <span
          className={`text-${
            size === "sm" ? "sm" : "base"
          } text-gray-900 dark:text-gray-100`}
        >
          {APP_STORE_STATUS_TEXT}
        </span>
      </div>
    );
  }

  return <StatusLabel status={status} showText={true} size={size} />;
}
