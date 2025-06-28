import MainNavigation from "@/components/MainNavigation";
import IssueNavigation from "./IssueNavigation";
import IssuePageClient from "./IssuePageClient";

export default async function CopanyIssueView({
  params,
}: {
  params: Promise<{ id: string; issueId: string }>;
}) {
  const resolvedParams = await params;

  return (
    <main>
      <MainNavigation />
      <IssueNavigation />
      <IssuePageClient
        copanyId={resolvedParams.id}
        issueId={resolvedParams.issueId}
      />
    </main>
  );
}
