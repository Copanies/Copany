"use client";

import { Suspense } from "react";
import CopanyGridView from "@/components/copany/CopanyGridView";
import MainNavigation from "@/app/_navigation_bar/MainNavigation";
import Footer from "@/components/commons/Footer";
import EmptyPlaceholderView from "@/components/commons/EmptyPlaceholderView";
import LoadingView from "@/components/commons/LoadingView";
import { useCopanies, useMyStarredCopanies } from "@/hooks/copany";
import { ArrowUpRightIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";

export default function StarsPage() {
  const { data: allCopanies, isLoading: loadingAll } = useCopanies();
  const { data: starred, isLoading: loadingIds } = useMyStarredCopanies();
  const ids = starred?.ids || [];
  const list = (
    allCopanies?.pages.flatMap((page) => page.copanies) || []
  ).filter((c) => ids.includes(String(c.id)));
  const isLoading = loadingAll || loadingIds;
  const router = useRouter();
  return (
    <main className="min-h-screen">
      <MainNavigation />
      <div className="p-6 max-w-screen-lg min-h-screen mx-auto flex flex-col">
        <div className="min-h-screen">
          {isLoading ? (
            <LoadingView type="page" />
          ) : list.length > 0 ? (
            <div className="">
              <Suspense
                fallback={
                  <LoadingView type="label" label="Loading copanies..." />
                }
              >
                <CopanyGridView copanies={list} showNewCopanyCard={false} />
              </Suspense>
            </div>
          ) : (
            <EmptyPlaceholderView
              icon={
                <SparklesIcon
                  className="w-16 h-16 text-gray-500 dark:text-gray-400"
                  strokeWidth={1}
                />
              }
              titleKey="noStarredCopanies"
              descriptionKey="starACopanyToSeeItHere"
              buttonIcon={<ArrowUpRightIcon className="w-4 h-4" />}
              buttonTitleKey="viewHomePage"
              buttonAction={() => {
                router.push(`/`);
              }}
            />
          )}
        </div>
      </div>
      <Footer />
    </main>
  );
}
