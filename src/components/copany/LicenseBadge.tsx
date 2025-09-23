"use client";

import { ScaleIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";

interface LicenseBadgeProps {
  license: string | null;
  isDefaultUseCOSL?: boolean;
  size?: "md" | "sm";
  copanyId: string;
}

export default function LicenseBadge({
  license,
  isDefaultUseCOSL = false,
  size = "md",
  copanyId,
}: LicenseBadgeProps) {
  const router = useRouter();

  // Determine the actual license to display
  let displayLicense = license;

  // If no license but COSL is enabled, show COSL
  if (!license && isDefaultUseCOSL) {
    displayLicense = "COSL";
  }

  // If still no license, don't render anything
  if (!displayLicense) {
    return null;
  }

  // Handle display text
  const displayText =
    displayLicense === "NOASSERTION" ? "Other" : displayLicense;

  // Handle click to navigate to license tab
  const handleClick = () => {
    if (copanyId) {
      router.push(`/copany/${copanyId}?tab=LICENSE`);
    }
  };

  // Choose different colors for different license types
  let gradientClass = "bg-gradient-to-b from-[#007ec6] to-[#0366a3]"; // Default blue gradient

  if (displayLicense === "COSL") {
    gradientClass = "bg-gradient-to-b from-[#2ecc71] to-[#27ae60]"; // Green gradient
  } else if (displayLicense === "NOASSERTION") {
    gradientClass = "bg-gradient-to-b from-[#95a5a6] to-[#7f8c8d]"; // Light gray gradient
  }

  if (size === "sm") {
    return (
      <div
        className={`inline-flex items-center gap-1 px-0 py-0 text-sm font-medium hover:cursor-pointer text-gray-700 dark:text-gray-300`}
        onClick={handleClick}
      >
        <ScaleIcon className="w-4 h-4" strokeWidth={2} />
        <span>{displayText}</span>
      </div>
    );
  }

  // Default variant (original badge style)
  return (
    <div className="relative inline-flex items-center text-sm font-medium">
      <div
        className="inline-flex items-center overflow-hidden hover:cursor-pointer"
        onClick={handleClick}
      >
        <span className="px-2 py-[2px] rounded-l-sm text-white [text-shadow:_0_1px_0_rgb(0_0_0_/_20%)] bg-gradient-to-b from-gray-600 to-gray-700">
          license
        </span>
        <span
          className={`px-2 py-[2px] rounded-r-sm text-white [text-shadow:_0_1px_0_rgb(0_0_0_/_20%)] ${gradientClass}`}
        >
          {displayText}
        </span>
      </div>
    </div>
  );
}
