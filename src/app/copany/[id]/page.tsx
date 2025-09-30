import { Suspense } from "react";
import MainNavigation from "@/components/commons/MainNavigation";
import Footer from "@/components/commons/Footer";
import CopanyView from "./CopanyView";
import LoadingView from "@/components/commons/LoadingView";

export default async function CopanyDetailView({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="min-h-screen">
      <MainNavigation />
      <Suspense fallback={<LoadingView type="page" />}>
        <div className="min-h-screen">
          <CopanyView copanyId={id} />
        </div>
      </Suspense>
      <Footer />
    </main>
  );
}
