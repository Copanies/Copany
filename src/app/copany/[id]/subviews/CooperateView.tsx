import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import VerticalTabView from "@/components/commons/VerticalTabView";
import IssuesView from "./IssuesView";
import ProjectsView from "./ProjectsView";
import { EMPTY_ARRAY } from "@/utils/constants";

export default function CooperateView({ copanyId }: { copanyId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlParamName = "subtab";

  const tabs = useMemo(
    () => [
      {
        label: "Issue",
        content: <IssuesView copanyId={copanyId} />,
      },
      {
        label: "Project",
        content: <ProjectsView />,
      },
    ],
    [copanyId]
  );

  // 从 URL 获取初始 tab，如果没有则使用第一个 tab
  const getInitialTab = () => {
    const urlTab = searchParams.get(urlParamName);
    const validTab = tabs.find((tab) => tab.label === urlTab);
    return validTab ? validTab.label : tabs[0]?.label || "Issue";
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

  const handleTabChange = (tabLabel: string) => {
    setActiveTab(tabLabel);
    updateUrlParam(tabLabel);
  };

  const activeContent = tabs.find((tab) => tab.label === activeTab)?.content;

  return (
    <>
      {/* 大屏幕：使用垂直标签 */}
      <div className="hidden md:block">
        <VerticalTabView tabs={tabs} urlParamName={urlParamName} />
      </div>

      {/* 小屏幕：使用下拉菜单 */}
      <div className="md:hidden">
        <div className="mb-4">
          <div className="relative w-[100px]">
            <select
              value={activeTab}
              onChange={(e) => handleTabChange(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer"
            >
              {tabs.map((tab) => (
                <option key={tab.label} value={tab.label}>
                  {tab.label}
                </option>
              ))}
            </select>
            {/* 自定义下拉箭头 */}
            <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </div>
        <div>{activeContent}</div>
      </div>
    </>
  );
}
