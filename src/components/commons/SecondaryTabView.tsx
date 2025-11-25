"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface SecondaryTabViewProps {
  tabs: {
    key?: string; // Optional key for URL and identification (defaults to label if not provided)
    label: string;
    content: React.ReactNode;
  }[];
  urlParamName?: string; // Optional URL parameter name
}

export default function SecondaryTabView({
  tabs,
  urlParamName = "subtab",
}: SecondaryTabViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Helper function to get tab identifier (key or label)
  const getTabId = useCallback(
    (tab: (typeof tabs)[0]) => tab.key || tab.label,
    []
  );

  // Get initial tab from URL, use first tab if not found
  const getInitialTab = () => {
    const urlTab = searchParams.get(urlParamName);
    const validTab = tabs.find(
      (tab) => getTabId(tab) === urlTab || tab.label === urlTab
    );
    return validTab ? getTabId(validTab) : getTabId(tabs[0]);
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());

  // Update activeTab when URL parameters change
  useEffect(() => {
    const urlTab = searchParams.get(urlParamName);
    if (urlTab) {
      const validTab = tabs.find(
        (tab) => getTabId(tab) === urlTab || tab.label === urlTab
      );
      if (validTab) {
        setActiveTab(getTabId(validTab));
      }
    }
  }, [searchParams, urlParamName, tabs, getTabId]);

  // Update URL parameter (use replace to avoid triggering progress bar)
  const updateUrlParam = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(urlParamName, tabId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    updateUrlParam(tabId);
  };

  // Cache tab contents with useMemo
  const tabContents = useMemo(() => {
    return tabs.map((tab) => {
      const tabId = getTabId(tab);
      return (
        <div
          key={tabId}
          className=""
          style={{ display: activeTab === tabId ? "block" : "none" }}
        >
          {tab.content}
        </div>
      );
    });
  }, [tabs, activeTab, getTabId]);

  return (
    <div className="flex flex-col w-full h-fit md:h-full md:min-h-screen rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex flex-row w-full shrink-0 overflow-x-auto scrollbar-hide gap-4 border-b border-gray-200 dark:border-gray-700 px-4 md:px-5 pt-[2px]">
        {tabs.map((tab) => {
          const tabId = getTabId(tab);
          return (
            <button
              key={tabId}
              className={`${
                activeTab === tabId
                  ? "cursor-pointer px-0 pt-2 pb-2 flex-shrink-0 border-b-2 border-secondary"
                  : "cursor-pointer px-0 pt-2 pb-[10px] flex-shrink-0"
              }`}
              onClick={() => handleTabClick(tabId)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div className="flex-1 min-w-0 py-4 px-4 md:px-5">{tabContents}</div>
    </div>
  );
}
