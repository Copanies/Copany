"use client";
import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import { currentUserManager } from "@/utils/cache";
import { signInWithGitHub, signOut } from "@/actions/auth.actions";
import Image from "next/image";
import Button from "./commons/Button";
import Dropdown from "./commons/Dropdown";

export default function UserLoginView() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // 获取初始用户信息（优先从缓存）
    const getInitialUser = async () => {
      try {
        // 使用缓存管理器获取用户
        const user = await currentUserManager.getCurrentUser();
        console.log("👤 UserLoginView: 初始用户信息:", user);
        setUser(user);
      } catch (err) {
        console.error("❌ UserLoginView: 异常错误:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getInitialUser();

    // 监听认证状态变化
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        // 清除用户缓存
        currentUserManager.clearUser();
        setUser(null);
        setLoading(false);
      } else if (event === "SIGNED_IN" && session?.user) {
        // 设置用户到缓存
        currentUserManager.setUser(session.user);
        setUser(session.user);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      // 立即清除客户端状态和缓存
      setUser(null);
      currentUserManager.clearUser();

      // 然后执行服务器端登出
      await signOut();
    } catch (error) {
      console.error("登出失败:", error);
      // 如果服务器端登出失败，恢复用户状态
      const cachedUser = await currentUserManager.getCurrentUser();
      setUser(cachedUser);
    }
  };

  if (loading) {
    return <div className="p-2 w-8"></div>;
  }

  if (!user) {
    // 未登录状态 - 显示 Login 按钮
    return (
      <form action={signInWithGitHub}>
        <Button type="submit" variant="primary" size="sm">
          Login
        </Button>
      </form>
    );
  }

  // 已登录状态 - 显示用户头像下拉菜单
  const userAvatar = user.user_metadata?.avatar_url ? (
    <Image
      src={user.user_metadata.avatar_url}
      alt={user.user_metadata.name || "User Avatar"}
      className="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600"
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
}
