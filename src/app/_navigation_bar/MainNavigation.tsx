"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import copany_logo from "@/assets/copany_logo.svg";
import copany_logo_dark from "@/assets/copany_logo_dark.svg";
import { useRouter, usePathname } from "next/navigation";
import { useMemo } from "react";
import { useCopany } from "@/hooks/copany";
import { createClient } from "@/utils/supabase/client";
import Button from "@/components/commons/Button";
import Dropdown from "@/components/commons/Dropdown";
import NotificationBell from "@/app/_navigation_bar/NotificationBell";
import Link from "next/link";
import { useCurrentUser } from "@/hooks/currentUser";
import { useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "@heroicons/react/24/outline";
import { useDarkMode } from "@/utils/useDarkMode";
import { shimmerDataUrlWithTheme } from "@/utils/shimmer";

export default function MainNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { data: user, isLoading: loading } = useCurrentUser();
  const isDarkMode = useDarkMode();
  const queryClientRef = useRef(queryClient);
  useEffect(() => {
    queryClientRef.current = queryClient;
  }, [queryClient]);

  useEffect(() => {
    const supabase = createClient();

    // 监听认证状态变化
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        // 清除用户缓存
        queryClientRef.current.removeQueries({ queryKey: ["currentUser"] });
        queryClientRef.current.removeQueries({ queryKey: ["userInfo"] });
      } else if (event === "SIGNED_IN" && session?.user) {
        // 刷新用户查询
        queryClientRef.current.invalidateQueries({ queryKey: ["currentUser"] });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []); // 移除 queryClient 依赖，使用 ref 中的最新值

  const handleLogout = async () => {
    try {
      // 使用客户端登出，避免 redirect 问题
      const supabase = createClient();
      await supabase.auth.signOut();

      // 清除用户缓存
      queryClient.removeQueries({ queryKey: ["currentUser"] });
      queryClient.removeQueries({ queryKey: ["userInfo"] });

      // 强制刷新页面以确保状态更新
      window.location.reload();
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };

  // To prevent inconsistencies between SSR and CSR during initial render, maintain loading state until mounted
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const renderUserSection = () => {
    if (!isMounted) {
      return <div className="p-2 w-8"></div>;
    }

    if (loading) {
      return <div className="p-2 w-8"></div>;
    }

    if (!user) {
      return (
        <div className="flex flex-row gap-5">
          <Link
            href="/signup"
            className="relative cursor-pointer flex-shrink-0 text-base"
          >
            <span>Sign up</span>
          </Link>
          <Link
            href="/login"
            className="relative cursor-pointer flex-shrink-0 text-base"
          >
            <span>Log in</span>
          </Link>
        </div>
      );
    }

    const userName =
      user.user_metadata?.user_name ||
      user.user_metadata?.name ||
      user.user_metadata?.full_name ||
      user.email ||
      "";

    const userAvatar = user.user_metadata?.avatar_url ? (
      <Image
        src={user.user_metadata.avatar_url}
        alt={userName}
        className="w-6 md:w-8 h-6 md:h-8 rounded-full"
        width={32}
        height={32}
        placeholder="blur"
        blurDataURL={shimmerDataUrlWithTheme(32, 32, isDarkMode)}
      />
    ) : (
      <div className="w-6 md:w-8 h-6 md:h-8 rounded-full bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-300">
        {userName?.[0]?.toUpperCase() || ""}
      </div>
    );

    const userHeader = (
      <div className="flex items-center space-x-3">
        {user.user_metadata?.avatar_url ? (
          <Image
            src={user.user_metadata.avatar_url}
            alt={userName}
            placeholder="blur"
            blurDataURL={shimmerDataUrlWithTheme(40, 40, isDarkMode)}
            className="w-10 h-10 rounded-full border border-gray-300 dark:border-gray-600"
            width={40}
            height={40}
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-300">
            {userName?.[0]?.toUpperCase() || ""}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
            {userName || "No name set"}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
            {user.email}
          </p>
        </div>
      </div>
    );

    const dropdownOptions = [
      {
        value: 0,
        label: "Profile",
        href: `/user/${user.id}`,
      },
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
        case 0:
          router.push(`/user/${user.id}`);
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
        marginX={0}
        className="cursor-pointer"
        showPadding={false}
        header={userHeader}
        size="lg"
      />
    );
  };

  // Extract copanyId when pathname like /copany/[id] or deeper
  const copanyId = useMemo(() => {
    if (!pathname) return null as string | null;
    const parts = pathname.split("/").filter(Boolean);
    const idx = parts.findIndex((p) => p === "copany");
    if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
    return null as string | null;
  }, [pathname]);

  const { data: copanyData } = useCopany(String(copanyId || ""), {
    enabled: !!copanyId,
  });

  return (
    <div className="relative flex flex-row w-full items-center px-4 sm:px-6 lg:px-8 gap-2 sm:gap-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-transparent h-[60px]">
      {/* Left section - Logo and company name */}
      <div className="flex flex-row items-center gap-2 sm:gap-4 flex-shrink-0 pr-3">
        <Image
          className="cursor-pointer rounded-md hover:opacity-80"
          src={isDarkMode ? copany_logo_dark : copany_logo}
          alt="logo"
          width={36}
          height={36}
          placeholder="blur"
          blurDataURL={shimmerDataUrlWithTheme(36, 36, isDarkMode)}
          onClick={() => router.push("/")}
        />

        {copanyId ? (
          <Button
            variant="ghost"
            size="sm"
            className="!px-1"
            onClick={() => router.push(`/copany/${copanyId}`)}
          >
            <div className="text-base truncate max-w-[30vw] sm:max-w-[40vw] md:max-w-[50vw] font-semibold text-gray-900 dark:text-gray-100">
              {copanyData?.name || ""}
            </div>
          </Button>
        ) : pathname === "/uselicense" ? (
          <span className="text-sm font-semibold hidden sm:inline">
            How to use COSL License
          </span>
        ) : pathname === "/new" ? (
          <span className="text-sm font-semibold hidden sm:inline">
            Create new copany
          </span>
        ) : (
          <></>
        )}
      </div>

      {/* Center section - Navigation links (only on home and stars pages) */}
      {pathname === "/" || pathname === "/stars" ? (
        // absolute left-1/2 transform -translate-x-1/2 flex flex-row gap-4 sm:gap-6 lg:gap-8
        <div className="absolute left-0 ml-18 sm:ml-0 sm:left-1/2 sm:-translate-x-1/2 flex flex-row gap-4 sm:gap-6 lg:gap-8">
          <Link
            href="/"
            className={`relative cursor-pointer flex-shrink-0 text-base hover:opacity-80 ${
              pathname === "/" ? "font-semibold" : ""
            }`}
          >
            <span>Explore</span>
            {pathname === "/" && (
              <span className="pointer-events-none absolute left-0 right-0 top-10 h-[2px] w-full bg-gray-700 dark:bg-gray-300" />
            )}
          </Link>
          <Link
            href="/stars"
            className={`relative cursor-pointer flex-shrink-0 text-base hover:opacity-80 ${
              pathname.startsWith("/stars") ? "font-semibold" : ""
            }`}
          >
            <span>Stars</span>
            {pathname.startsWith("/stars") && (
              <span className="pointer-events-none absolute left-0 right-0 top-10 h-[2px] w-full bg-gray-700 dark:bg-gray-300" />
            )}
          </Link>
        </div>
      ) : null}

      {/* Right section - User actions */}
      <div className="absolute right-4 sm:right-6 lg:right-8 flex flex-row items-center gap-1 sm:gap-2">
        {user && (
          <div className="hidden sm:block">
            {/* {user && <CreateCopanyButton size="lg" />} */}
            <Link
              href="/new"
              className={`relative cursor-pointer flex-shrink-0 text-base`}
            >
              <div className="flex items-center gap-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md p-2">
                <PlusIcon className="w-4 h-4" />
                <span>New copany</span>
              </div>
            </Link>
          </div>
        )}
        {user && (
          <div className="block sm:hidden">
            {/* {user && <CreateCopanyButton size="lg" />} */}
            <Link
              href="/new"
              className={`relative cursor-pointer flex-shrink-0 text-base`}
            >
              <div className="flex items-center gap-1 mr-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md p-2">
                <PlusIcon className="w-5 h-5" />
              </div>
            </Link>
          </div>
        )}
        {user && <NotificationBell />}
        {renderUserSection()}
      </div>
    </div>
  );
}
