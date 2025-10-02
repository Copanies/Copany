import MainNavigation from "@/components/commons/MainNavigation";
import Footer from "@/components/commons/Footer";
import DiscussionPageClient from "./DiscussionPageClient";

export default async function CopanyDiscussionView({
  params,
}: {
  params: Promise<{ id: string; discussionId: string }>;
}) {
  const resolvedParams = await params;

  return (
    <main className="">
      <MainNavigation />
      <div className="px-2 min-h-screen">
        <DiscussionPageClient
          copanyId={resolvedParams.id}
          discussionId={resolvedParams.discussionId}
        />
      </div>
      <Footer />
    </main>
  );
}
