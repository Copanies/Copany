"use client";
import { useEffect } from "react";
import Image from "next/image";
import logo from "@/app/favicon.ico";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { signInWithGitHub, signOut } from "@/actions/auth.actions";
import Button from "./commons/Button";
import Dropdown from "./commons/Dropdown";
import CreateCopanyButton from "./CreateCopanyButton";
import NotificationBell from "./NotificationBell";
import GithubIcon from "@/assets/github_logo.svg";
import GithubIconDark from "@/assets/github_logo_dark.svg";
import { useDarkMode } from "@/utils/useDarkMode";
import { useCurrentUser } from "@/hooks/currentUser";
import { useQueryClient } from "@tanstack/react-query";

export default function MainNavigation() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user, isLoading: loading } = useCurrentUser();
  const isDarkMode = useDarkMode();

  useEffect(() => {
    const supabase = createClient();

    // 监听认证状态变化
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        // 清除用户缓存
        queryClient.removeQueries({ queryKey: ["currentUser"] });
        queryClient.removeQueries({ queryKey: ["userInfo"] });
      } else if (event === "SIGNED_IN" && session?.user) {
        // 刷新用户查询
        queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const handleLogout = async () => {
    try {
      // 执行服务器端登出
      await signOut();
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };

  const renderUserSection = () => {
    if (loading) {
      return <div className="p-2 w-8"></div>;
    }

    if (!user) {
      // 未登录状态 - 显示 Login 按钮
      return (
        <form action={signInWithGitHub}>
          <Button type="submit" variant="secondary" size="sm">
            <div className="flex items-center gap-2">
              <Image
                src={isDarkMode ? GithubIconDark : GithubIcon}
                alt="GitHub"
                className="w-4 h-4"
                width={16}
                height={16}
              />
              <p>Login with GitHub</p>
            </div>
          </Button>
        </form>
      );
    }

    // 已登录状态 - 显示用户头像下拉菜单
    const userAvatar = user.user_metadata?.avatar_url ? (
      <Image
        src={user.user_metadata.avatar_url}
        alt={user.user_metadata.name || "User Avatar"}
        className="w-8 h-8 rounded-full"
        width={32}
        height={32}
      />
    ) : (
      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-300">
        {user.user_metadata?.name?.[0]?.toUpperCase() || "U"}
      </div>
    );

    // 用户信息头部容器
    const userHeader = (
      <div className="flex items-center space-x-3">
        {user.user_metadata?.avatar_url ? (
          <Image
            src={user.user_metadata.avatar_url}
            alt={user.user_metadata.name || "User Avatar"}
            className="w-10 h-10 rounded-full border border-gray-300 dark:border-gray-600"
            width={40}
            height={40}
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-300">
            {user.user_metadata?.name?.[0]?.toUpperCase() || "U"}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {user.user_metadata?.name || "No name set"}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
            {user.email}
          </p>
        </div>
      </div>
    );

    const dropdownOptions = [
      {
        value: 1,
        label: "Logout",
      },
    ];

    const handleDropdownSelect = (value: number) => {
      switch (value) {
        case 1:
          handleLogout();
          break;
        default:
          break;
      }
    };

    return (
      <Dropdown
        trigger={userAvatar}
        options={dropdownOptions}
        selectedValue={null}
        onSelect={handleDropdownSelect}
        showBackground={false}
        className="cursor-pointer"
        header={userHeader}
        size="lg"
      />
    );
  };

  return (
    <div className="flex flex-row items-center justify-between px-5 py-2 border-b border-gray-200 dark:border-gray-800">
      <Image
        className="cursor-pointer rounded-md"
        src={logo}
        alt="logo"
        width={32}
        height={32}
        onClick={() => router.push("/")}
      />
      <div className="flex flex-row items-center gap-3">
        {user && <CreateCopanyButton />}
        {user && <NotificationBell />}
        {renderUserSection()}
      </div>
    </div>
  );
}
