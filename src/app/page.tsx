import CopanyListView from "@/components/CopanyListView";
import { CopanyService } from "@/services/copany.service";
import UserLoginView from "@/components/UserLoginView";
import CreateCopanyButton from "@/components/CreateCopanyButton";
import MainNavigation from "@/components/MainNavigation";

/**
 * 主页 - 负责数据获取和页面布局
 */
export default async function Home() {
  // 使用服务层获取数据
  const copanies = await CopanyService.getCopanies();

  return (
    <main>
      <MainNavigation />
      <div className="p-8 max-w-screen-lg mx-auto flex flex-col">
        <div>
          <h1 className="text-2xl font-bold mb-4">Welcome to Copany</h1>
        </div>
        <div className="flex flex-col gap-4 pt-2">
          <CopanyListView copanies={copanies} />
        </div>
      </div>
    </main>
  );
}
