"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Button from "./Button";
import PhotoViewer from "./PhotoViewer";

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
            size="sm"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
          >
            {isUploading ? "Uploading..." : uploadButtonText}
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
                width={160}
                height={160}
                className="max-h-40 rounded border border-gray-200 dark:border-gray-700 cursor-zoom-in"
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
              variant="primary"
              size="sm"
              disabled={isUploading}
              onClick={() => inputRef.current?.click()}
            >
              {isUploading ? "Uploading..." : "Replace Image"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
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
