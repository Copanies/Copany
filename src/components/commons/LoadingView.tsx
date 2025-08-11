"use client";

import { useState, useEffect } from "react";

interface LoadingViewProps {
  type?: "page" | "label";
  label?: string;
  delay?: number; // 延迟显示时间，默认1000ms
}

export default function LoadingView({
  type = "page",
  label = "Loading",
  delay = 2000,
}: LoadingViewProps) {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldShow(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  if (!shouldShow) {
    return null;
  }

  return (
    <div
      className={`${
        type === "page" ? "h-screen" : "h-full"
      } flex justify-center items-center transition-opacity duration-300 ease-in-out ${
        shouldShow ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="text-gray-500 dark:text-gray-400">
        {label}
        <span className="inline-block">
          <span className="animate-pulse">.</span>
          <span className="animate-pulse" style={{ animationDelay: "0.2s" }}>
            .
          </span>
          <span className="animate-pulse" style={{ animationDelay: "0.4s" }}>
            .
          </span>
        </span>
      </div>
    </div>
  );
}
