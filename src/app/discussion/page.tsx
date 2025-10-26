"use client";

import MainNavigation from "../_navigation_bar/MainNavigation";
import DiscussionView from "./DiscussionView";
import Footer from "@/components/commons/Footer";

export default function DiscussionPageView() {
  return (
    <main className="min-h-screen">
      <MainNavigation />
      <div className="max-w-[820px] justify-center mx-auto w-full mt-5 px-5">
        <DiscussionView />
      </div>
      <Footer />
    </main>
  );
}
