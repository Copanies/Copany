import MainNavigation from "@/components/commons/MainNavigation";
import Footer from "@/components/commons/Footer";
import IssuePageClient from "./IssuePageClient";

export default async function CopanyIssueView({
  params,
}: {
  params: Promise<{ id: string; issueId: string }>;
}) {
  const resolvedParams = await params;

  return (
    <main className="">
      <MainNavigation />
      <div className="px-2 min-h-screen">
        <IssuePageClient
          copanyId={resolvedParams.id}
          issueId={resolvedParams.issueId}
        />
      </div>
      <Footer />
    </main>
  );
}
