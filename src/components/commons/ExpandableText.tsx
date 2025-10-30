"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Button from "@/components/commons/Button";

interface ExpandableTextProps {
  text: React.ReactNode | string;
  maxLines?: number;
  expandLabel?: string;
  collapseLabel?: string;
  animationDurationMs?: number;
  animationEasing?: string;
  className?: string;
  contentClassName?: string;
}

/**
 * ExpandableText renders multi-line text with a smooth expand/collapse animation.
 * It does NOT use any gradient mask. The toggle control can be placed as a block
 * under the text (left aligned) or overlay at the bottom-right corner.
 */
export default function ExpandableText({
  text,
  maxLines = 3,
  expandLabel = "Show More",
  collapseLabel = "Show Less",
  animationDurationMs = 200,
  animationEasing = "ease",
  className = "",
  contentClassName = "",
}: ExpandableTextProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [collapsedMaxHeight, setCollapsedMaxHeight] = useState<number>(0);
  const [expandedMaxHeight, setExpandedMaxHeight] = useState<number>(0);

  const transitionStyle = useMemo(
    () => ({
      transition: `max-height ${animationDurationMs}ms ${animationEasing}`,
    }),
    [animationDurationMs, animationEasing]
  );

  const measure = useCallback(() => {
    const contentEl = contentRef.current;
    if (!contentEl) return;

    const computed = window.getComputedStyle(contentEl);
    const lineHeightStr = computed.lineHeight;
    const lineHeight = Number.parseFloat(lineHeightStr) || 24;
    const collapsed = Math.max(0, Math.floor(lineHeight * (maxLines ?? 3)));

    // Temporarily remove max-height to get full scroll height
    const previousMaxHeight = contentEl.style.maxHeight;
    contentEl.style.maxHeight = "none";
    const fullHeight = contentEl.scrollHeight;
    contentEl.style.maxHeight = previousMaxHeight;

    setCollapsedMaxHeight(collapsed);
    setExpandedMaxHeight(fullHeight);
    setIsOverflowing(fullHeight > collapsed + 1);
  }, [maxLines]);

  useEffect(() => {
    measure();
  }, [text, measure]);

  useEffect(() => {
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [measure]);

  const currentMaxHeight = isExpanded ? expandedMaxHeight : collapsedMaxHeight;

  const showToggle = isOverflowing || isExpanded;

  return (
    <div ref={wrapperRef} className={className}>
      <div
        ref={contentRef}
        className={`${contentClassName}`}
        style={{
          overflow: "hidden",
          maxHeight: currentMaxHeight > 0 ? `${currentMaxHeight}px` : undefined,
          ...transitionStyle,
        }}
      >
        {text}
      </div>

      {showToggle && (
        <div className="flex justify-start -mx-2">
          <Button
            type="button"
            aria-expanded={isExpanded}
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded((v) => !v);
            }}
            variant="text"
            size="md"
          >
            {isExpanded ? collapseLabel : expandLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
