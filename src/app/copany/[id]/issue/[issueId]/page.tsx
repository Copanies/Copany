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
    <main className="">
      <MainNavigation />
      <div className="px-2">
        <IssueNavigation />
        <IssuePageClient
          copanyId={resolvedParams.id}
          issueId={resolvedParams.issueId}
        />
      </div>
    </main>
  );
}
