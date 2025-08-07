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
  delay = 1000,
}: LoadingViewProps) {
  const [shouldShow, setShouldShow] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldShow(true);
      // 添加一个小延迟来触发淡入动画
      setTimeout(() => {
        setIsVisible(true);
      }, 50);
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
        isVisible ? "opacity-100" : "opacity-0"
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
