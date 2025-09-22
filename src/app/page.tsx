"use client";
import { useEffect, useState } from "react";
import CopanyGridView from "@/components/copany/CopanyGridView";
import MainNavigation from "@/components/commons/MainNavigation";
import CatBanner from "@/components/commons/CatBanner";
import { useCopanies } from "@/hooks/copany";
import LoadingView from "@/components/commons/LoadingView";

/**
 * Home page - Responsible for data fetching and page layout
 */
export default function Home() {
  const { data: copanies, isLoading } = useCopanies();
  // To prevent inconsistencies between SSR and CSR during initial render, maintain loading state until mounted
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);
  const safeIsLoading = isLoading || !isMounted;
  return (
    <main className="h-min-screen">
      <MainNavigation />
      <div className="flex flex-col">
        {safeIsLoading ? <LoadingView type="page" /> : homeView()}
      </div>
    </main>
  );

  function homeView() {
    return (
      <div className="flex flex-col">
        <div>
          <CatBanner
            title="Together, we are free."
            subtitle={`Anyone can start a project
              Earn points through tasks and collaboration
              Rewards are shared according to points`}
            className="mb-8"
            includeBody={true}
          />
          <div className="px-6 flex flex-col w-full min-h-screen">
            <CopanyGridView copanies={copanies || []} />
          </div>
        </div>
      </div>
    );
  }
}
