"use client";

import { QRCodeSVG } from "qrcode.react";
import { QrCodeIcon } from "@heroicons/react/24/outline";
import * as Tooltip from "@radix-ui/react-tooltip";
import { useIsMobile } from "@/utils/deviceDetection";
import { useState, useEffect } from "react";

interface QRCodePopoverProps {
  value: string;
  size?: number;
  className?: string;
}

export default function QRCodePopover({
  value,
  size = 200,
  className = "",
}: QRCodePopoverProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);

  // Handle click outside for mobile
  useEffect(() => {
    if (!isMobile || !isOpen) return;

    const handleClickOutside = () => {
      setIsOpen(false);
    };

    const timer = setTimeout(() => {
      document.addEventListener("click", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isMobile, isOpen]);

  const content = (
    <div className="flex flex-col items-center gap-2 pt-2">
      <div className="bg-white p-2 rounded">
        <QRCodeSVG value={value} size={size} level="M" />
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-xs break-all">
        {value}
      </div>
    </div>
  );

  return (
    <Tooltip.Provider delayDuration={150} skipDelayDuration={300}>
      <Tooltip.Root open={isOpen} onOpenChange={setIsOpen}>
        <Tooltip.Trigger asChild>
          <div className="cursor-pointer">
            <QrCodeIcon className={`w-4 h-4 ${className}`} />
          </div>
        </Tooltip.Trigger>
        <Tooltip.Portal container={document.body}>
          <Tooltip.Content
            side="top"
            sideOffset={8}
            align="center"
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 max-w-xs z-[60]"
            onPointerDownOutside={(e) => {
              e.preventDefault();
              setIsOpen(false);
            }}
          >
            {content}
            <Tooltip.Arrow className="fill-white dark:fill-gray-800" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
