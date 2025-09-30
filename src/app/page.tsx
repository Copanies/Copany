"use client";
import { useEffect, useState } from "react";
import CopanyGridView from "@/components/copany/CopanyGridView";
import MainNavigation from "@/components/commons/MainNavigation";
import CatBanner from "@/components/copany/CatBanner";
import MobileCatBanner from "@/components/copany/MobileCatBanner";
import Footer from "@/components/commons/Footer";
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
    <main className="min-h-screen">
      <MainNavigation />
      <div className="flex flex-col">
        {safeIsLoading ? <LoadingView type="page" /> : homeView()}
      </div>
    </main>
  );

  function homeView() {
    return (
      <div>
        {/* Desktop CatBanner */}
        <div className="hidden sm:block">
          <CatBanner
            title="Together, we are free."
            subtitle={`Anyone can start a project
              Earn points through collaboration
              Rewards are shared according to points`}
            className="mb-8"
          />
        </div>
        {/* Mobile CatBanner */}
        <div className="block sm:hidden">
          <MobileCatBanner
            title="Together, we are free."
            subtitle={`Anyone can start a project
              Earn points through collaboration
              Rewards are shared according to points`}
            className="mb-8"
          />
        </div>
        <div className="px-6 flex flex-col w-full min-h-screen">
          <CopanyGridView copanies={copanies || []} />
        </div>
        <Footer />
      </div>
    );
  }
}
