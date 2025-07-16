import MainNavigation from "@/components/MainNavigation";
import CopanyDetailClient from "./CopanyDetailClient";

export default async function CopanyDetailView({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="h-min-screen">
      <MainNavigation />
      <CopanyDetailClient copanyId={id} />
    </main>
  );
}
