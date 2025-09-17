import MainNavigation from "@/components/commons/MainNavigation";
import CopanyView from "./CopanyView";

export default async function CopanyDetailView({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="h-min-screen">
      <MainNavigation />
      <CopanyView copanyId={id} />
    </main>
  );
}
