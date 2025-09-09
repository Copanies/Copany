"use client";

import CopanyListView from "@/app/subviews/CopanyListView";
import MainNavigation from "@/components/MainNavigation";
import EmptyPlaceholderView from "@/components/commons/EmptyPlaceholderView";
import LoadingView from "@/components/commons/LoadingView";
import { useCopanies, useMyStarredCopanies } from "@/hooks/copany";
import { ArrowUpRightIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";

export default function StarsPage() {
  const { data: allCopanies, isLoading: loadingAll } = useCopanies();
  const { data: starred, isLoading: loadingIds } = useMyStarredCopanies();
  const ids = starred?.ids || [];
  const list = (allCopanies || []).filter((c) => ids.includes(String(c.id)));
  const isLoading = loadingAll || loadingIds;
  const router = useRouter();
  return (
    <main className="h-min-screen">
      <MainNavigation />
      <div className="p-6 max-w-screen-lg mx-auto flex flex-col">
        <div className="flex flex-col gap-4 pt-2">
          {isLoading ? (
            <LoadingView type="page" />
          ) : list.length > 0 ? (
            <CopanyListView copanies={list} />
          ) : (
            <EmptyPlaceholderView
              icon={<SparklesIcon className="w-16 h-16 text-gray-500" />}
              title="No starred copanies yet"
              description="Star a copany to see it here."
              buttonIcon={<ArrowUpRightIcon className="w-4 h-4" />}
              buttonTitle="View Home Page"
              buttonAction={() => {
                router.push(`/`);
              }}
            />
          )}
        </div>
      </div>
    </main>
  );
}
