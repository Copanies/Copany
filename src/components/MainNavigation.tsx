"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import logo from "@/app/favicon.ico";
import { useRouter, usePathname } from "next/navigation";
import { useMemo } from "react";
import { useCopany } from "@/hooks/copany";
import { createClient } from "@/utils/supabase/client";
import { signOut } from "@/actions/auth.actions";
import Button from "./commons/Button";
import Dropdown from "./commons/Dropdown";
import CreateCopanyButton from "./CreateCopanyButton";
import NotificationBell from "./NotificationBell";
import Link from "next/link";
import { useCurrentUser } from "@/hooks/currentUser";
import { useQueryClient } from "@tanstack/react-query";

export default function MainNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { data: user, isLoading: loading } = useCurrentUser();

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
      // 执行服务器端登出
      await signOut();
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
        <div className="flex flex-row gap-4">
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

    const userAvatar = user.user_metadata?.avatar_url ? (
      <Image
        src={user.user_metadata.avatar_url}
        alt={user.user_metadata.name || "User Avatar"}
        className="w-6 md:w-8 h-6 md:h-8 rounded-full"
        width={32}
        height={32}
      />
    ) : (
      <div className="w-6 md:w-8 h-6 md:h-8 rounded-full bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-300">
        {user.user_metadata?.name?.[0]?.toUpperCase() || "U"}
      </div>
    );

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
    <div className="flex flex-row items-center justify-between px-8 py-3 gap-3 border-b border-gray-200 dark:border-gray-800">
      <div className="flex flex-row items-center gap-2 md:gap-4 min-w-60">
        <Image
          className="cursor-pointer rounded-md"
          src={logo}
          alt="logo"
          width={36}
          height={36}
          onClick={() => router.push("/")}
        />

        {copanyId ? (
          <Button
            variant="ghost"
            size="sm"
            className="!px-1"
            onClick={() => router.push(`/copany/${copanyId}`)}
          >
            <div className="text-sm truncate max-w-[40vw] md:max-w-[50vw] font-semibold text-gray-900 dark:text-gray-100">
              {copanyData?.name || ""}
            </div>
          </Button>
        ) : pathname === "/uselicense" ? (
          <span className="text-sm font-semibold">How to use COSL License</span>
        ) : (
          <></>
        )}
      </div>

      {pathname === "/" || pathname === "/stars" ? (
        <div className="flex flex-row gap-8">
          <Link
            href="/"
            className={`relative cursor-pointer mx-2 flex-shrink-0 text-base ${
              pathname === "/" ? "font-semibold" : ""
            }`}
          >
            <span>Home</span>
            {pathname === "/" && (
              <span className="pointer-events-none absolute left-0 right-0 top-10 h-[2px] w-full bg-gray-700 dark:bg-gray-300" />
            )}
          </Link>
          <Link
            href="/stars"
            className={`relative cursor-pointer mx-2 flex-shrink-0 text-base ${
              pathname.startsWith("/stars") ? "font-semibold" : ""
            }`}
          >
            <span>Stars</span>
            {pathname.startsWith("/stars") && (
              <span className="pointer-events-none absolute left-0 right-0 top-10 h-[2px] w-full bg-gray-700 dark:bg-gray-300" />
            )}
          </Link>
        </div>
      ) : (
        <></>
      )}

      <div className="flex flex-row items-center justify-end h-8 gap-2 md:gap-3  min-w-60">
        <div className="hidden md:block">
          {user && <CreateCopanyButton size="md" />}
        </div>
        <div className="block md:hidden">
          {user && <CreateCopanyButton size="sm" />}
        </div>
        {user && <NotificationBell />}
        {renderUserSection()}
      </div>
    </div>
  );
}
