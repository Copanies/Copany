"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { User } from "@supabase/supabase-js";

/**
 * 认证相关的 Server Actions
 */

/**
 * GitHub OAuth 登录 - 使用 PKCE 流程
 */
export async function signInWithGitHub() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: `${
        process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
      }/auth/callback`,
    },
  });

  if (error) {
    console.error("Error signing in:", error);
    throw new Error(`GitHub 登录失败: ${error.message}`);
  }

  if (data.url) {
    redirect(data.url);
  }
}

/**
 * 用户登出
 */
export async function signOut() {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Error signing out:", error);
    throw new Error(`登出失败: ${error.message}`);
  }

  redirect("/");
}

/**
 * 获取当前用户信息
 * 注意：在 SSR 环境中，如果没有认证会话，会返回 null 而不是抛出错误
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      // 如果是认证会话缺失错误，这是正常的（用户未登录）
      if (error.message?.includes("Auth session missing")) {
        return null;
      }
      console.error("Error getting user:", error);
      return null;
    }

    return user;
  } catch (error) {
    // 捕获任何意外的错误，避免崩溃
    console.error("Unexpected error getting user:", error);
    return null;
  }
}
