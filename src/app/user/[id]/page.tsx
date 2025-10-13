import MainNavigation from "@/app/_navigation_bar/MainNavigation";
import Footer from "@/components/commons/Footer";
import UserView from "./UserView";

export default async function UserDetailView({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main>
      <MainNavigation />
      <div className="min-h-screen">
        <UserView userId={id} />
      </div>
      <Footer />
    </main>
  );
}
