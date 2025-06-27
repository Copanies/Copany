"use client";
import { useState, useMemo } from "react";

export default function VerticalTabView({
  tabs,
}: {
  tabs: { label: string; content: React.ReactNode }[];
}) {
  const [activeTab, setActiveTab] = useState(tabs[0].label);

  // 使用 useMemo 缓存 tabs 内容
  const tabContents = useMemo(() => {
    return tabs.map((tab) => (
      <div
        key={tab.label}
        className="mt-4"
        style={{ display: activeTab === tab.label ? "block" : "none" }}
      >
        {tab.content}
      </div>
    ));
  }, [tabs, activeTab]);

  return (
    <div className="flex w-full flex-row h-full">
      <div className="flex gap-2 flex-col w-30 pr-4 border-r border-[#E7E7E7] dark:border-[#333333]">
        {tabs.map((tab) => (
          <button
            key={tab.label}
            className={`${
              activeTab === tab.label
                ? "cursor-pointer rounded-md bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 px-2 py-0.5"
                : "cursor-pointer rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-900 px-2 py-0.5"
            }`}
            onClick={() => setActiveTab(tab.label)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1">{tabContents}</div>
    </div>
  );
}
