"use client";

import React, { useState } from "react";
import Image from "next/image";
import { generateRandomCatAvatarAction } from "@/actions/avatar.actions";

interface AvatarPreviewProps {
  currentAvatarUrl?: string;
  onAvatarGenerated?: (svgContent: string) => void;
}

export default function AvatarPreview({
  currentAvatarUrl,
  onAvatarGenerated,
}: AvatarPreviewProps) {
  const [previewSvg, setPreviewSvg] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGeneratePreview = async () => {
    setIsGenerating(true);
    // Generate a new random cat avatar
    const newSvg = await generateRandomCatAvatarAction();
    setPreviewSvg(newSvg);
    setIsGenerating(false);

    if (onAvatarGenerated) {
      onAvatarGenerated(newSvg);
    }
  };

  const svgToDisplay = previewSvg || currentAvatarUrl;

  return (
    <div className="flex flex-col items-center gap-4 p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
        Random Cat Avatar Preview
      </h3>

      <div className="w-32 h-32 border border-gray-300 dark:border-gray-600 rounded-full overflow-hidden bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
        {svgToDisplay ? (
          typeof svgToDisplay === "string" &&
          svgToDisplay.startsWith("<svg") ? (
            <div
              className="w-full h-full"
              dangerouslySetInnerHTML={{ __html: svgToDisplay }}
            />
          ) : (
            <Image
              src={svgToDisplay}
              alt="User Avatar"
              className="w-full h-full object-cover"
              width={128}
              height={128}
            />
          )
        ) : (
          <div className="text-gray-400 dark:text-gray-500 text-sm text-center">
            No Avatar
          </div>
        )}
      </div>

      <button
        onClick={handleGeneratePreview}
        disabled={isGenerating}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md text-sm font-medium transition-colors disabled:cursor-not-allowed"
      >
        {isGenerating ? "Generating..." : "Generate New Cat Avatar"}
      </button>

      <p className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-xs">
        This shows what random cat avatars look like. Each time you register
        with email, you&apos;ll get a unique colored cat!
      </p>
    </div>
  );
}
