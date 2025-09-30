import MainNavigation from "@/components/commons/MainNavigation";
import Footer from "@/components/commons/Footer";
import UserView from "./UserView";

export default async function UserDetailView({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="min-h-screen">
      <MainNavigation />
      <UserView userId={id} />
      <Footer />
    </main>
  );
}
