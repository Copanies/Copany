"use client";
import CopanyListView from "@/app/subviews/CopanyListView";
import MainNavigation from "@/components/MainNavigation";
import { useCopanies } from "@/hooks/copany";
import LoadingView from "@/components/commons/LoadingView";

/**
 * Home page - Responsible for data fetching and page layout
 */
export default function Home() {
  const { data: copanies, isLoading } = useCopanies();
  return (
    <main className="h-min-screen">
      <MainNavigation />
      <div className="p-6 max-w-screen-lg mx-auto flex flex-col">
        <div className="flex flex-col gap-4 pt-2">
          {isLoading ? (
            <LoadingView type="page" />
          ) : (
            <CopanyListView copanies={copanies || []} />
          )}
        </div>
      </div>
    </main>
  );
}
