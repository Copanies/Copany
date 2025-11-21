"use client";

import { useState, useRef } from "react";
import Button from "@/components/commons/Button";
import Modal from "@/components/commons/Modal";
import AppleAppStoreConnectIcon from "@/assets/apple_app_store_connect_logo.png";
import Image from "next/image";
import { PlusIcon } from "@heroicons/react/24/outline";

interface Credentials {
  privateKey: string;
  keyId: string;
  issuerId: string;
  vendorNumber: string;
  appSKU: string;
}

interface FinanceReportResponse {
  success: boolean;
  reports?: unknown[];
  errors?: Array<{
    reportType: string;
    regionCode: string;
    reportDate: string;
    error: string;
  }>;
  summary?: {
    total: number;
    success: number;
    failed: number;
  };
  chartData?: unknown[];
  error?: string;
}

interface ConnectToAppStoreConnectProps {
  copanyId: string;
  onSuccess?: () => void;
  showIcon?: boolean;
  buttonText?: string;
}

export default function ConnectToAppStoreConnect({
  copanyId,
  onSuccess,
  showIcon = true,
  buttonText,
}: ConnectToAppStoreConnectProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleFetchReports = async (credentials: Credentials) => {
    console.log("[DEBUG] handleFetchReports called with credentials:", {
      keyId: credentials.keyId,
      issuerId: credentials.issuerId,
      vendorNumber: credentials.vendorNumber,
      appSKU: credentials.appSKU,
      privateKeyLength: credentials.privateKey?.length || 0,
    });

    setIsLoading(true);
    setIsModalOpen(false);

    try {
      console.log("[DEBUG] Sending request to /api/app-store-connect");
      const response = await fetch("/api/app-store-connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...credentials,
          copanyId,
        }),
      });

      console.log(
        "[DEBUG] Response status:",
        response.status,
        response.statusText
      );
      const data: FinanceReportResponse = await response.json();
      console.log("[DEBUG] Response data:", {
        success: data.success,
        reportsCount: data.reports?.length || 0,
        errorsCount: data.errors?.length || 0,
        summary: data.summary,
        chartDataCount: data.chartData?.length || 0,
        error: data.error,
      });

      if (!response.ok || !data.success) {
        console.error("[DEBUG] Request failed:", data.error);
        throw new Error(data.error || "Failed to fetch reports");
      }

      console.log(
        "[DEBUG] Fetch successful, calculating distributions for all months"
      );

      // Calculate distributions for all historical months
      try {
        const distributeResponse = await fetch(
          "/api/calculate-copany-distributions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ copanyId }),
          }
        );

        const distributeData = await distributeResponse.json();

        if (!distributeResponse.ok) {
          console.warn(
            "[DEBUG] Failed to calculate distributions:",
            distributeData.error
          );
          // Don't throw error, just log warning - the App Store Connect connection was successful
        } else {
          console.log("[DEBUG] Distribution calculation completed:", {
            totalMonths: distributeData.totalMonths,
            successfulMonths: distributeData.successfulMonths,
            totalInserted: distributeData.totalInserted,
          });
        }
      } catch (distributeError) {
        console.warn(
          "[DEBUG] Error calculating distributions:",
          distributeError
        );
        // Don't throw error, just log warning - the App Store Connect connection was successful
      }

      console.log("[DEBUG] Calling onSuccess callback");
      // Call onSuccess callback to refresh data
      if (onSuccess) {
        await onSuccess();
      }
      console.log("[DEBUG] State updated successfully");
    } catch (error) {
      console.error("[DEBUG] Error fetching reports:", error);
      throw error;
    } finally {
      setIsLoading(false);
      console.log("[DEBUG] Loading completed");
    }
  };

  return (
    <>
      <Button
        size="md"
        onClick={() => setIsModalOpen(true)}
        disabled={isLoading}
      >
        <div className="flex flex-row items-center gap-2">
          {showIcon && (
            <Image
              src={AppleAppStoreConnectIcon}
              alt="Apple App Store"
              width={20}
              height={20}
            />
          )}
          <span className="text-base text-gray-900 dark:text-gray-100">
            {isLoading
              ? "Connecting..."
              : buttonText || "Connect to App Store Connect"}
          </span>
        </div>
      </Button>
      <CredentialsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onFetch={handleFetchReports}
      />
    </>
  );
}

function CredentialsModal({
  isOpen,
  onClose,
  onFetch,
}: {
  isOpen: boolean;
  onClose: () => void;
  onFetch: (credentials: Credentials) => Promise<void>;
}) {
  const [privateKeyFile, setPrivateKeyFile] = useState<File | null>(null);
  const [privateKeyContent, setPrivateKeyContent] = useState<string>("");
  const [keyId, setKeyId] = useState<string>("");
  const [issuerId, setIssuerId] = useState<string>("");
  const [vendorNumber, setVendorNumber] = useState<string>("");
  const [appSKU, setAppSKU] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extract Key ID from filename (format: AuthKey_<KEYID>.p8)
  const extractKeyIdFromFilename = (filename: string): string | null => {
    const match = filename.match(/AuthKey_(.+)\.p8$/);
    return match ? match[1] : null;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".p8")) {
      setError("Please select a .p8 file");
      return;
    }

    // Extract Key ID from filename
    const extractedKeyId = extractKeyIdFromFilename(file.name);
    if (!extractedKeyId) {
      setError(
        "Unable to extract Key ID from filename. Filename format should be: AuthKey_<KEYID>.p8"
      );
      return;
    }

    setPrivateKeyFile(file);
    setKeyId(extractedKeyId);
    setError(null);

    try {
      const content = await file.text();
      setPrivateKeyContent(content);
    } catch (_err) {
      setError("Failed to read file");
      setPrivateKeyFile(null);
      setPrivateKeyContent("");
      setKeyId("");
    }
  };

  const handleSubmit = async () => {
    setError(null);

    if (!privateKeyContent || !keyId || !issuerId || !vendorNumber || !appSKU) {
      setError("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    try {
      await onFetch({
        privateKey: privateKeyContent,
        keyId,
        issuerId,
        vendorNumber,
        appSKU,
      });
      // Reset form on success
      setPrivateKeyFile(null);
      setPrivateKeyContent("");
      setKeyId("");
      setIssuerId("");
      setVendorNumber("");
      setAppSKU("");
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      onClose();
    } catch (_err) {
      setError(
        _err instanceof Error ? _err.message : "Failed to fetch reports"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="p-6 text-left">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Connect App Store Connect Finance Permissions
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="font-semibold text-sm text-gray-900 dark:text-gray-100">
              P8 Private Key File
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".p8"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => fileInputRef.current?.click()}
              className="w-fit"
            >
              <div className="flex flex-row items-center gap-2">
                <PlusIcon className="w-5 h-5" strokeWidth={1.3} />
                <span>Upload file</span>
              </div>
            </Button>
            {privateKeyFile && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Selected: {privateKeyFile.name}
                {keyId && (
                  <span className="ml-2 text-gray-500">(Key ID: {keyId})</span>
                )}
              </div>
            )}
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Generate a new key via{" "}
              <a
                href="https://appstoreconnect.apple.com/access/integrations/api"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-blue-600 dark:hover:text-blue-400"
              >
                App Store Connect → API Keys
              </a>
              . Inside User & Access, choose Team Keys, click the plus icon, and
              select the Finance role.
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-semibold text-sm text-gray-900 dark:text-gray-100">
              Issuer ID
            </label>
            <input
              type="text"
              value={issuerId}
              onChange={(e) => setIssuerId(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="border px-2 py-1 rounded-md border-gray-300 dark:border-gray-600"
            />
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Locate it in{" "}
              <a
                href="https://appstoreconnect.apple.com/access/integrations/api"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-blue-600 dark:hover:text-blue-400"
              >
                App Store Connect → API Keys
              </a>{" "}
              alongside your P8 key.
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-semibold text-sm text-gray-900 dark:text-gray-100">
              Vendor Number
            </label>
            <input
              type="text"
              value={vendorNumber}
              onChange={(e) => setVendorNumber(e.target.value)}
              placeholder="xxxxxxxx"
              className="border px-2 py-1 rounded-md border-gray-300 dark:border-gray-600"
            />
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Review your vendor numbers at{" "}
              <a
                href="https://appstoreconnect.apple.com/itc/payments_and_financial_reports#/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-blue-600 dark:hover:text-blue-400"
              >
                Payments and Financial Reports
              </a>
              . Add multiple values by separating them with commas.
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-semibold text-sm text-gray-900 dark:text-gray-100">
              SKU
            </label>
            <input
              type="text"
              value={appSKU}
              onChange={(e) => setAppSKU(e.target.value)}
              placeholder="xxxxxxxx"
              className="border px-2 py-1 rounded-md border-gray-300 dark:border-gray-600"
            />
            <div className="text-sm text-gray-500 dark:text-gray-400">
              If revenue is obtained through selling Apps, directly fill in the
              App SKU (find it in{" "}
              <a
                href="https://appstoreconnect.apple.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-blue-600 dark:hover:text-blue-400"
              >
                App Store Connect
              </a>{" "}
              → My Apps → Select App → App Information → General Information);
              if revenue is obtained through Subscriptions, fill in all
              Subscription SKUs (find them in App Store Connect → My Apps →
              Select App → Subscriptions → Select Subscription Product → Product
              ID), separated by commas.
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-4 justify-end">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Connecting..." : "Add"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
