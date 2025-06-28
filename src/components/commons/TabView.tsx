"use client";
import { useState, useMemo } from "react";

export default function TabView({
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
    <div className="flex gap-2 w-full flex-col">
      <div className="flex gap-2 flex-row">
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
      {tabContents}
    </div>
  );
}
