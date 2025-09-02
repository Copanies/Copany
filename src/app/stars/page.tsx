"use client";
import CopanyListView from "@/app/subviews/CopanyListView";
import MainNavigation from "@/components/MainNavigation";
import LoadingView from "@/components/commons/LoadingView";
import { useCopanies, useMyStarredCopanies } from "@/hooks/copany";

export default function StarsPage() {
  const { data: allCopanies, isLoading: loadingAll } = useCopanies();
  const { data: starred, isLoading: loadingIds } = useMyStarredCopanies();
  const ids = starred?.ids || [];
  const list = (allCopanies || []).filter((c) => ids.includes(String(c.id)));
  const isLoading = loadingAll || loadingIds;
  return (
    <main className="h-min-screen">
      <MainNavigation />
      <div className="p-6 max-w-screen-lg mx-auto flex flex-col">
        <div className="flex flex-col gap-4 pt-2">
          {isLoading ? (
            <LoadingView type="page" />
          ) : (
            <CopanyListView copanies={list} />
          )}
        </div>
      </div>
    </main>
  );
}
