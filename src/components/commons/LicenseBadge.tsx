"use client";

import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import CoslLicenseTip from "@/components/CoslLicenseTip";
import MobileTooltip from "./MobileTooltip";

export default function LicenseBadge({
  license,
  isOwner = false,
}: {
  license: string;
  isOwner?: boolean;
}) {
  // Handle display text
  const displayText = license === "NOASSERTION" ? "Other" : license;

  // Choose different colors for different license types
  let gradientClass = "bg-gradient-to-b from-[#007ec6] to-[#0366a3]"; // Default blue gradient

  if (license === "COSL") {
    gradientClass = "bg-gradient-to-b from-[#2ecc71] to-[#27ae60]"; // Green gradient
  } else if (license === "NOASSERTION") {
    gradientClass = "bg-gradient-to-b from-[#95a5a6] to-[#7f8c8d]"; // Light gray gradient
  }

  return (
    <div className="relative inline-flex items-center text-sm font-medium">
      <div className="inline-flex items-center overflow-hidden">
        <span className="px-2 py-[2px] rounded-l-sm text-white [text-shadow:_0_1px_0_rgb(0_0_0_/_20%)] bg-gradient-to-b from-gray-600 to-gray-700">
          license
        </span>
        <span
          className={`px-2 py-[2px] rounded-r-sm text-white [text-shadow:_0_1px_0_rgb(0_0_0_/_20%)] ${gradientClass}`}
        >
          {displayText}
        </span>
      </div>
      {license !== "COSL" && (
        <MobileTooltip
          content={<CoslLicenseTip isOwner={isOwner} />}
          side="bottom"
          sideOffset={8}
          className="tooltip-surface w-[420px] !max-w-[92vw] !p-4"
          delayDuration={150}
          skipDelayDuration={300}
        >
          <div className="ml-2 inline-flex items-center hover:cursor-pointer p-1 bg-gray-100 dark:bg-gray-800 rounded-md">
            <ExclamationTriangleIcon
              className="w-4 h-4 text-yellow-600"
              strokeWidth={2}
            />
          </div>
        </MobileTooltip>
      )}
    </div>
  );
}
