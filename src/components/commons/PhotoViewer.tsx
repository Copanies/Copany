"use client";

import { useCallback, useEffect, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

type PhotoViewerProps = {
  src: string;
  alt?: string;
  className?: string;
  overlayClassName?: string;
  closeButtonAriaLabel?: string;
  renderTrigger?: (open: () => void) => React.ReactNode;
};

/**
 * PhotoViewer renders an inline image as trigger, and opens a fullscreen overlay on click.
 * ESC, clicking backdrop, or the top-right close button will close the overlay.
 */
export default function PhotoViewer({
  src,
  alt = "Image",
  className,
  overlayClassName,
  closeButtonAriaLabel = "Close",
  renderTrigger,
}: PhotoViewerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  return (
    <>
      {renderTrigger ? (
        renderTrigger(open)
      ) : (
        <img
          src={src}
          alt={alt}
          className={className}
          onClick={open}
          role="button"
          aria-label={alt}
        />
      )}

      {isOpen && (
        <div
          className={
            "fixed inset-0 z-[100] flex items-center justify-center p-4 " +
            (overlayClassName || "bg-black/90 backdrop-blur-sm")
          }
          onClick={close}
          aria-modal="true"
          role="dialog"
        >
          <button
            type="button"
            aria-label={closeButtonAriaLabel}
            className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-md border border-white/20 bg-black/40 px-2.5 py-1.5 text-white hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-white/30"
            onClick={(e) => {
              e.stopPropagation();
              close();
            }}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>

          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-full object-contain rounded shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
