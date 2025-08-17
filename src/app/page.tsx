import CopanyListView from "@/app/subviews/CopanyListView";
import { CopanyService } from "@/services/copany.service";
import MainNavigation from "@/components/MainNavigation";

/**
 * Home page - Responsible for data fetching and page layout
 */
export default async function Home() {
  // Use service layer to fetch data
  const copanies = await CopanyService.getCopanies();

  return (
    <main className="h-min-screen">
      <MainNavigation />
      <div className="p-6 max-w-screen-lg mx-auto flex flex-col">
        <div className="flex flex-col gap-4 pt-2">
          <CopanyListView copanies={copanies} />
        </div>
      </div>
    </main>
  );
}
