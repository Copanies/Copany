"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface TabViewProps {
  tabs: { label: string; icon?: React.ReactNode; content: React.ReactNode }[];
  urlParamName?: string; // Optional URL parameter name
}

export default function TabView({ tabs, urlParamName = "tab" }: TabViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabContainerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

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

  // Scroll tab to center
  const scrollTabToCenter = (tabLabel: string) => {
    const container = tabContainerRef.current;
    const tabElement = tabRefs.current.get(tabLabel);

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

  const handleTabClick = (tabLabel: string) => {
    setActiveTab(tabLabel);
    updateUrlParam(tabLabel);
    scrollTabToCenter(tabLabel);
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
        <div
          ref={tabContainerRef}
          className="flex w-full min-w-0 gap-5 flex-row overflow-x-auto scrollbar-hide whitespace-nowrap"
        >
          {tabs.map((tab) => (
            <button
              key={tab.label}
              ref={(el) => {
                if (el) {
                  tabRefs.current.set(tab.label, el);
                } else {
                  tabRefs.current.delete(tab.label);
                }
              }}
              className={`${
                activeTab === tab.label
                  ? "cursor-pointer px-0 pb-2 flex-shrink-0 border-b-2 border-secondary"
                  : "cursor-pointer px-0 pb-[10px] flex-shrink-0"
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
