"use client";
import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface VerticalTabViewProps {
  tabs: { label: string; content: React.ReactNode }[];
  urlParamName?: string; // Optional URL parameter name
}

export default function VerticalTabView({
  tabs,
  urlParamName = "subtab",
}: VerticalTabViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get initial tab from URL, use first tab if not found
  const getInitialTab = () => {
    const urlTab = searchParams.get(urlParamName);
    const validTab = tabs.find((tab) => tab.label === urlTab);
    return validTab ? validTab.label : tabs[0].label;
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());

  // Update activeTab when URL parameters change
  useEffect(() => {
    const urlTab = searchParams.get(urlParamName);
    if (urlTab && tabs.find((tab) => tab.label === urlTab)) {
      setActiveTab(urlTab);
    }
  }, [searchParams, urlParamName, tabs]);

  // Update URL parameter
  const updateUrlParam = (tabLabel: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(urlParamName, tabLabel);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleTabClick = (tabLabel: string) => {
    setActiveTab(tabLabel);
    updateUrlParam(tabLabel);
  };

  // Cache tab contents with useMemo
  const tabContents = useMemo(() => {
    return tabs.map((tab) => (
      <div
        key={tab.label}
        className=""
        style={{ display: activeTab === tab.label ? "block" : "none" }}
      >
        {tab.content}
      </div>
    ));
  }, [tabs, activeTab]);

  return (
    <div className="flex w-full flex-row h-full min-h-screen">
      <div className="flex flex-col w-40 shrink-0 pr-4 border-r border-gray-200 dark:border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab.label}
            className={`text-left ${
              activeTab === tab.label
                ? "cursor-pointer px-4 py-2 border-l-2 border-primary"
                : "cursor-pointer px-[18px] py-2 border-l border-gray-200 dark:border-gray-700"
            }`}
            onClick={() => handleTabClick(tab.label)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 min-w-0">{tabContents}</div>
    </div>
  );
}
