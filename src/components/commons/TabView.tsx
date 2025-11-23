"use client";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface TabViewProps {
  tabs: {
    key?: string; // Optional key for URL and identification (defaults to label if not provided)
    label: string;
    icon?: React.ReactNode;
    content: React.ReactNode;
  }[];
  urlParamName?: string; // Optional URL parameter name
}

export default function TabView({ tabs, urlParamName = "tab" }: TabViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabContainerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Helper function to get tab identifier (key or label)
  const getTabId = useCallback(
    (tab: (typeof tabs)[0]) => tab.key || tab.label,
    []
  );

  // Get initial tab from URL, if not found use the first tab
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

  // Update URL parameters
  const updateUrlParam = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(urlParamName, tabId);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Scroll tab to center
  const scrollTabToCenter = (tabId: string) => {
    const container = tabContainerRef.current;
    const tabElement = tabRefs.current.get(tabId);

    if (!container || !tabElement) return;

    // Check if scrolling is needed (all tabs visible)
    if (container.scrollWidth <= container.clientWidth) {
      return; // No need to scroll if all tabs are visible
    }

    const containerWidth = container.clientWidth;
    const tabLeft = tabElement.offsetLeft;
    const tabWidth = tabElement.offsetWidth;

    // Calculate the scroll position to center the tab
    const targetScroll = tabLeft - containerWidth / 2 + tabWidth / 2;

    // Ensure we don't scroll beyond bounds
    const maxScroll = container.scrollWidth - container.clientWidth;
    const finalScroll = Math.max(0, Math.min(targetScroll, maxScroll));

    container.scrollTo({
      left: finalScroll,
      behavior: "smooth",
    });
  };

  // Scroll to active tab on mount and when activeTab changes
  useEffect(() => {
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      scrollTabToCenter(activeTab);
    });
  }, [activeTab]);

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    updateUrlParam(tabId);
    scrollTabToCenter(tabId);
  };

  // Use useMemo to cache tab contents
  const tabContents = useMemo(() => {
    return tabs.map((tab) => {
      const tabId = getTabId(tab);
      return (
        <div
          key={tabId}
          className="max-w-screen-xl w-full mx-auto mx-5"
          style={{ display: activeTab === tabId ? "block" : "none" }}
        >
          {tab.content}
        </div>
      );
    });
  }, [tabs, activeTab, getTabId]);

  return (
    <div className="flex w-full min-w-0 flex-col h-full min-h-screen">
      <div className="sticky top-[51px] md:top-[52px] z-10 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-background-dark">
        <div
          ref={tabContainerRef}
          className="flex w-full px-5 min-w-0 gap-5 flex-row overflow-x-auto scrollbar-hide whitespace-nowrap"
        >
          {tabs.map((tab) => {
            const tabId = getTabId(tab);
            return (
              <button
                key={tabId}
                ref={(el) => {
                  if (el) {
                    tabRefs.current.set(tabId, el);
                  } else {
                    tabRefs.current.delete(tabId);
                  }
                }}
                className={`${
                  activeTab === tabId
                    ? "cursor-pointer px-0 pt-2 pb-2 flex-shrink-0 border-b-2 border-secondary"
                    : "cursor-pointer px-0 pt-2 pb-[10px] flex-shrink-0"
                }`}
                onClick={() => handleTabClick(tabId)}
              >
                <div className="flex flex-row gap-2 items-center">
                  {tab.icon && <div className="w-4 h-4">{tab.icon}</div>}
                  <span className="text-base">{tab.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      {tabContents}
    </div>
  );
}
