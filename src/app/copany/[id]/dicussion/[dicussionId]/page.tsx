import MainNavigation from "@/components/commons/MainNavigation";
import DiscussionPageClient from "./DiscussionPageClient";

export default async function CopanyDiscussionView({
  params,
}: {
  params: Promise<{ id: string; dicussionId: string }>;
}) {
  const resolvedParams = await params;

  return (
    <main className="">
      <MainNavigation />
      <div className="px-2">
        <DiscussionPageClient
          copanyId={resolvedParams.id}
          discussionId={resolvedParams.dicussionId}
        />
      </div>
    </main>
  );
}
