import { Suspense } from "react";
import MainNavigation from "@/components/commons/MainNavigation";
import CopanyView from "./CopanyView";
import LoadingView from "@/components/commons/LoadingView";

export default async function CopanyDetailView({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="h-min-screen">
      <MainNavigation />
      <Suspense fallback={<LoadingView type="page" />}>
        <CopanyView copanyId={id} />
      </Suspense>
    </main>
  );
}
