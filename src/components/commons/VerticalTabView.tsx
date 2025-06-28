"use client";
import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface VerticalTabViewProps {
  tabs: { label: string; content: React.ReactNode }[];
  urlParamName?: string; // 可选的 URL 参数名称
}

export default function VerticalTabView({
  tabs,
  urlParamName = "subtab",
}: VerticalTabViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 从 URL 获取初始 tab，如果没有则使用第一个 tab
  const getInitialTab = () => {
    const urlTab = searchParams.get(urlParamName);
    const validTab = tabs.find((tab) => tab.label === urlTab);
    return validTab ? validTab.label : tabs[0].label;
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());

  // 当 URL 参数变化时更新 activeTab
  useEffect(() => {
    const urlTab = searchParams.get(urlParamName);
    if (urlTab && tabs.find((tab) => tab.label === urlTab)) {
      setActiveTab(urlTab);
    }
  }, [searchParams, urlParamName, tabs]);

  // 更新 URL 参数
  const updateUrlParam = (tabLabel: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(urlParamName, tabLabel);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleTabClick = (tabLabel: string) => {
    setActiveTab(tabLabel);
    updateUrlParam(tabLabel);
  };

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
            onClick={() => handleTabClick(tab.label)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1">{tabContents}</div>
    </div>
  );
}
