"use client";
import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface SecondaryTabViewViewProps {
  tabs: { label: string; content: React.ReactNode }[];
  urlParamName?: string; // Optional URL parameter name
}

export default function SecondaryTabViewView({
  tabs,
  urlParamName = "subtab",
}: SecondaryTabViewViewProps) {
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
    <div className="flex gap-3 md:gap-0 w-full h-full min-h-screen flex-col md:flex-row">
      <div className="flex flex-row md:flex-col w-full md:w-40 shrink-0 px-0 md:px-0 md:pr-4 md:border-r border-gray-200 dark:border-gray-700 overflow-x-auto md:overflow-visible scrollbar-hide whitespace-nowrap md:whitespace-normal gap-2 md:gap-0 -mt-1 md:mt-0">
        {tabs.map((tab) => (
          <button
            key={tab.label}
            className={`text-left flex-shrink-0 cursor-pointer px-3 py-1 rounded-lg ${
              activeTab === tab.label
                ? " bg-gray-200 dark:bg-gray-700 md:px-4 md:py-2 md:rounded-none md:bg-transparent md:dark:bg-transparent md:border-l-2 md:border-secondary"
                : "bg-gray-100 dark:bg-gray-800 md:pl-[17px] md:pr-4 md:py-2 md:rounded-none md:bg-transparent md:dark:bg-transparent md:border-l md:border-gray-200 dark:md:border-gray-700"
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
