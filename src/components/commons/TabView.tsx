"use client";
import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface TabViewProps {
  tabs: { label: string; icon?: React.ReactNode; content: React.ReactNode }[];
  urlParamName?: string; // Optional URL parameter name
}

export default function TabView({ tabs, urlParamName = "tab" }: TabViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get initial tab from URL, if not found use the first tab
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

  // Update URL parameters
  const updateUrlParam = (tabLabel: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(urlParamName, tabLabel);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleTabClick = (tabLabel: string) => {
    setActiveTab(tabLabel);
    updateUrlParam(tabLabel);
  };

  // Use useMemo to cache tab contents
  const tabContents = useMemo(() => {
    return tabs.map((tab) => (
      <div
        key={tab.label}
        className="mt-4 mx-5"
        style={{ display: activeTab === tab.label ? "block" : "none" }}
      >
        {tab.content}
      </div>
    ));
  }, [tabs, activeTab]);

  return (
    <div className="flex w-full min-w-0 flex-col h-full min-h-screen">
      <div className="mx-5 border-b border-gray-200 dark:border-gray-700">
        <div className="flex w-full min-w-0 gap-2 flex-row overflow-x-auto scrollbar-hide whitespace-nowrap">
          {tabs.map((tab) => (
            <button
              key={tab.label}
              className={`${
                activeTab === tab.label
                  ? "cursor-pointer mx-2 pb-2 flex-shrink-0 border-b-2 border-secondary"
                  : "cursor-pointer mx-2 pb-[10px] flex-shrink-0"
              }`}
              onClick={() => handleTabClick(tab.label)}
            >
              <div className="flex flex-row gap-2 items-center">
                {tab.icon && <div className="w-4 h-4">{tab.icon}</div>}
                <span className="text-base">{tab.label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
      {tabContents}
    </div>
  );
}
