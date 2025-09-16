import MainNavigation from "@/components/MainNavigation";
import UserView from "./UserView";

export default async function UserDetailView({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="h-min-screen">
      <MainNavigation />
      <UserView userId={id} />
    </main>
  );
}
