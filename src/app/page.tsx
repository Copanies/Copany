import CopanyListView from "@/app/CopanyListView";
import UserLoginView from "@/app/UserLoginView";

export default async function Home() {
  return (
    <main>
      <div className="p-8">
        <div>
          <p>Welcome to Copany</p>
        </div>
        <div className="flex flex-col gap-8 pt-2">
          <UserLoginView />
          <CopanyListView />
        </div>
      </div>
    </main>
  );
}
