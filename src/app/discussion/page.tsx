"use client";

import MainNavigation from "../_navigation_bar/MainNavigation";
import DiscussionView from "./DiscussionView";
import Footer from "@/components/commons/Footer";
import CatBanner from "@/components/copany/CatBanner";
import MobileCatBanner from "@/components/copany/MobileCatBanner";

export default function DiscussionPageView() {
  return (
    <main className="">
      <MainNavigation />
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
      <div className="max-w-[820px] justify-center mx-auto w-full mt-5 px-5 min-h-screen">
        <DiscussionView />
      </div>
      <Footer />
    </main>
  );
}
