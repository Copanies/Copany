"use client";

import { useState } from "react";
import type { DistributeRow } from "@/types/database.types";
import type { UserInfo } from "@/actions/user.actions";
import { storageService } from "@/services/storage.service";
import { Square2StackIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import Button from "@/components/commons/Button";
import StatusLabel from "@/components/commons/StatusLabel";
import ImageUpload from "@/components/commons/ImageUpload";
import QRCodePopover from "@/components/commons/QRCodePopover";
import { usePaymentLinks } from "@/hooks/receivePaymentLinks";
import alipayIcon from "@/assets/alipay_logo.svg";
import alipayIconDark from "@/assets/alipay_logo_dark.svg";
import wiseIcon from "@/assets/wise_logo.png";
import { useDarkMode } from "@/utils/useDarkMode";
import Link from "next/link";

function formatAmount(amount: number, currency: string): string {
  const absAmount = Math.abs(amount);
  return `${currency} ${absAmount.toFixed(2)}`;
}

export default function DistributeEvidenceModal({
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
  const isDarkMode = useDarkMode();

  // Get payment links for the distribute.to_user
  const { data: paymentLinks } = usePaymentLinks(distribute?.to_user || "");

  // Extract Alipay and Wise links
  const alipayLink = paymentLinks?.find(
    (link) => link.type === "Alipay"
  )?.decrypted_link;
  const wiseLink = paymentLinks?.find(
    (link) => link.type === "Wise"
  )?.decrypted_link;

  const handleConfirm = async () => {
    if (!distribute) return;

    await onConfirm(evidenceUrl);
  };

  // Check if proofs are provided
  const hasProofs = !!evidenceUrl;
  const canConfirm = hasProofs;

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
            <span className="w-32">To:</span>
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
            <span className="w-32">Status:</span>
            <StatusLabel
              status={distribute?.status || "in_progress"}
              showText={true}
            />
          </div>
          <div className="flex flex-row items-center gap-2">
            <span className="w-32">Amount:</span>
            <span className="">
              {formatAmount(
                distribute?.amount || 0,
                distribute?.currency || "USD"
              )}
            </span>
          </div>
          <div className="flex flex-row items-center gap-2">
            <span className="w-32">CP Percent:</span>
            <span className="">{distribute?.contribution_percent || 0}%</span>
          </div>
          <div className="flex flex-row items-start gap-2">
            <span className="w-32">Payment:</span>
            <div className="flex flex-col items-start gap-3">
              <div className="flex flex-col items-start gap-2">
                <div className="flex flex-row items-center gap-2">
                  <Image
                    src={wiseIcon}
                    alt="Wise Logo"
                    width={66}
                    height={35}
                  />
                  <span className="">Wise Payment Link</span>
                </div>
                {wiseLink ? (
                  <div className="flex items-center gap-2">
                    <Link href={wiseLink} target="_blank">
                      <span className="text-base underline text-blue-500 dark:text-blue-400 max-w-xs truncate">
                        {wiseLink}
                      </span>
                    </Link>
                    <Button
                      className="!p-1"
                      variant="ghost"
                      size="sm"
                      shape="square"
                      onClick={() => {
                        navigator.clipboard.writeText(wiseLink || "");
                      }}
                    >
                      <Square2StackIcon className="w-4 h-4" />
                    </Button>
                    <QRCodePopover value={wiseLink} size={150} />
                  </div>
                ) : (
                  <span className="">Not set</span>
                )}
              </div>
              <div className="flex flex-col items-start gap-2">
                <div className="flex flex-row items-center gap-2">
                  <Image
                    src={isDarkMode ? alipayIconDark : alipayIcon}
                    alt="Alipay Logo"
                    width={83.61}
                    height={35}
                  />
                  <span className="">Alipay QR Code Link</span>
                </div>
                {alipayLink ? (
                  <div className="flex items-center gap-2">
                    <Link href={alipayLink} target="_blank">
                      <span className="text-base underline text-blue-500 dark:text-blue-400 max-w-xs truncate">
                        {alipayLink}
                      </span>
                    </Link>
                    <Button
                      className="!p-1"
                      variant="ghost"
                      size="sm"
                      shape="square"
                      onClick={() => {
                        navigator.clipboard.writeText(alipayLink || "");
                      }}
                    >
                      <Square2StackIcon className="w-4 h-4" />
                    </Button>
                    <QRCodePopover value={alipayLink} size={150} />
                  </div>
                ) : (
                  <span className="">Not set</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-row items-top gap-2">
            <span className="w-32">
              Proofs:
              <span className="text-red-500 ml-1">*</span>
            </span>
            <ImageUpload
              value={evidenceUrl}
              onChange={(url) => setEvidenceUrl(url)}
              onUpload={async (file) =>
                storageService.uploadFinanceEvidence(
                  file,
                  copanyId,
                  "distribute"
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
              uploadButtonText="Upload Transfer Evidence"
            />
          </div>
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
          onClick={handleConfirm}
          disabled={_isUploading || !canConfirm}
        >
          {_isUploading ? "Uploading..." : "Distribute Completed"}
        </Button>
      </div>
    </div>
  );
}
