"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Button from "./Button";
import PhotoViewer from "./PhotoViewer";
import { PlusIcon } from "@heroicons/react/24/outline";

export interface ImageUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
  onUpload: (
    file: File
  ) => Promise<{ success: boolean; url?: string; error?: string }>; // upload into a bucket
  onDelete?: (url: string) => Promise<{ success: boolean; error?: string }>; // delete by url (optional)
  accept?: string; // e.g., "image/*"
  maxBytes?: number; // size limit
  helperText?: string; // extra description
  uploadButtonText?: string;
}

export default function ImageUpload({
  value,
  onChange,
  onUpload,
  onDelete,
  accept = "image/*",
  maxBytes = 1 * 1024 * 1024,
  helperText = "PNG, JPG, JPEG, GIF, WebP • Max 1MB",
  uploadButtonText = "Upload Image",
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localUrl, setLocalUrl] = useState<string | null>(value || null);

  useEffect(() => {
    setLocalUrl(value || null);
  }, [value]);

  const previewUrl = useMemo(() => localUrl, [localUrl]);

  async function handleSelectFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    if (file.size > maxBytes) {
      setError(
        `File size cannot exceed ${Math.round(maxBytes / 1024 / 1024)}MB`
      );
      return;
    }
    if (accept && !file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    setIsUploading(true);
    try {
      const res = await onUpload(file);
      if (res.success && res.url) {
        setLocalUrl(res.url);
        onChange(res.url);
      } else {
        setError(res.error || "Upload failed");
      }
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    if (!localUrl) return;
    setError(null);
    if (onDelete) {
      const res = await onDelete(localUrl);
      if (!res.success) {
        setError(res.error || "Delete failed");
        return;
      }
    }
    setLocalUrl(null);
    onChange(null);
  }

  return (
    <div className="flex flex-col gap-2">
      {!previewUrl ? (
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={handleSelectFile}
          />
          <Button
            type="button"
            size="md"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
            className="w-fit"
          >
            <div className="flex flex-row items-center justify-center gap-2">
              <PlusIcon className="w-5 h-5" strokeWidth={1.3} />
              <p>{isUploading ? "Uploading..." : uploadButtonText}</p>
            </div>
          </Button>
          {helperText && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {helperText}
            </p>
          )}
          {error && (
            <div className="text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center  gap-3">
          <PhotoViewer
            src={previewUrl}
            alt="Evidence"
            renderTrigger={(open) => (
              <Image
                src={previewUrl}
                alt="Evidence"
                width={320}
                height={320}
                className="max-w-full max-h-40 w-auto h-auto rounded border border-gray-200 dark:border-gray-700 cursor-zoom-in object-contain"
                onClick={open}
              />
            )}
          />
          <div className="flex flex-col items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept={accept}
              className="hidden"
              onChange={handleSelectFile}
            />
            <Button
              type="button"
              variant="secondary"
              size="md"
              disabled={isUploading}
              onClick={() => inputRef.current?.click()}
              className="w-fit"
            >
              <div className="flex flex-row items-center gap-2">
                <p>{isUploading ? "Uploading..." : "Replace Image"}</p>
              </div>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={handleRemove}
              className="w-fit"
            >
              Remove
            </Button>
            {helperText && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {helperText}
              </p>
            )}
            {error && (
              <div className="text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
