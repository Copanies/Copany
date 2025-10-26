import MainNavigation from "@/app/_navigation_bar/MainNavigation";
import Footer from "@/components/commons/Footer";
import DiscussionDetailView from "@/components/discussion/DiscussionDetailView";

export default async function DiscussionView({
  params,
}: {
  params: Promise<{ discussionId: string }>;
}) {
  const resolvedParams = await params;

  return (
    <main className="">
      <MainNavigation />
      cat
      <div className="px-2 min-h-screen">
        <DiscussionDetailView
          discussionId={resolvedParams.discussionId}
          copanyId={null}
        />
      </div>
      <Footer />
    </main>
  );
}
