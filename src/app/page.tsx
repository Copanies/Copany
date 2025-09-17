"use client";
import { useEffect, useState } from "react";
import CopanyGridView from "@/components/copany/CopanyGridView";
import MainNavigation from "@/components/commons/MainNavigation";
import { useCopanies } from "@/hooks/copany";
import LoadingView from "@/components/commons/LoadingView";
import EmptyPlaceholderView from "@/components/commons/EmptyPlaceholderView";
import { PlusIcon, SquaresPlusIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  return (
    <main className="h-min-screen">
      <MainNavigation />
      <div className="px-6 max-w-screen-lg mx-auto flex flex-col">
        <div className="flex flex-col gap-4">
          {safeIsLoading ? (
            <LoadingView type="page" />
          ) : copanies && copanies.length > 0 ? (
            homeView()
          ) : (
            <div className="flex flex-col items-center p-6">
              <EmptyPlaceholderView
                icon={<SquaresPlusIcon className="w-16 h-16 text-gray-500" />}
                title="No copanies yet"
                description="Create a new copany to get started."
                buttonIcon={<PlusIcon className="w-4 h-4" />}
                buttonTitle="New copany"
                buttonAction={() => {
                  router.push(`/new`);
                }}
              />
            </div>
          )}
        </div>
      </div>
    </main>
  );

  function homeView() {
    return (
      <div className="flex flex-col">
        <div>
          <div className="flex flex-col items-center justify-center p-8 gap-3">
            <p className="text-3xl font-normal text-center">
              Freer creation, fairer rewards.
            </p>
          </div>
          <CopanyGridView copanies={copanies || []} />
        </div>
      </div>
    );
  }
}
