"use client";

import { useState, useRef } from "react";
import jsQR from "jsqr";
import Button from "./Button";

interface QRCodeUploaderProps {
  onScan: (text: string) => void;
  onError?: (error: string) => void;
  buttonText?: string;
  accept?: string;
  disabled?: boolean;
}

export default function QRCodeUploader({
  onScan,
  onError,
  buttonText = "Upload QR code",
  accept = "image/*",
  disabled = false,
}: QRCodeUploaderProps) {
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadImageData = (file: File): Promise<ImageData> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Could not get canvas context"));
            return;
          }
          ctx.drawImage(img, 0, 0);
          resolve(ctx.getImageData(0, 0, img.width, img.height));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
      const imageData = await loadImageData(file);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code && code.data) {
        onScan(code.data);
      } else {
        const errorMsg =
          "No QR code found in the image. Please try another image.";
        if (onError) {
          onError(errorMsg);
        } else {
          alert(errorMsg);
        }
      }
    } catch (error) {
      console.error("Failed to parse QR code:", error);
      const errorMsg = "Failed to parse QR code. Please try again.";
      if (onError) {
        onError(errorMsg);
      } else {
        alert(errorMsg);
      }
    } finally {
      setIsScanning(false);
      e.target.value = ""; // Reset file input
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />
      <Button onClick={handleClick} disabled={disabled || isScanning}>
        {isScanning ? "Scanning..." : buttonText}
      </Button>
    </>
  );
}
