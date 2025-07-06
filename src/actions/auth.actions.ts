"use server";

import { redirect } from "next/navigation";
import { createSupabaseClient } from "@/utils/supabase/server";
import { User } from "@supabase/supabase-js";
import { clearGithubTokenCookie } from "@/services/github.service";

/**
 * 认证相关的 Server Actions
 */

/**
 * GitHub OAuth 登录 - 使用 PKCE 流程
 */
export async function signInWithGitHub() {
  console.log("🚀 开始 GitHub OAuth 登录");

  const supabase = await createSupabaseClient();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  // 检查必需的环境变量
  if (!siteUrl) {
    console.error("❌ NEXT_PUBLIC_SITE_URL 未设置");
    throw new Error(
      "NEXT_PUBLIC_SITE_URL 环境变量未设置。请检查你的 .env.local 文件。"
    );
  }

  console.log("🔍 NEXT_PUBLIC_SITE_URL 设置为:", siteUrl);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: `${siteUrl!}/auth/callback`,
      scopes: "read:user read:org",
    },
  });

  if (error) {
    console.error("❌ GitHub 登录失败:", error.message);
    throw new Error(`GitHub 登录失败: ${error.message}`);
  }

  if (data.url) {
    console.log("↗️ 重定向到 GitHub 授权页面");
    redirect(data.url); // 这里会抛出 NEXT_REDIRECT，这是正常的
  } else {
    console.log("⚠️ 未获取到 GitHub 授权 URL");
    throw new Error("未获取到 GitHub 授权 URL");
  }
}

/**
 * 用户登出
 */
export async function signOut() {
  console.log("🔓 开始用户登出");

  const supabase = await createSupabaseClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("❌ 登出失败:", error.message);
    throw new Error(`登出失败: ${error.message}`);
  }

  // 清除 GitHub access token Cookie
  await clearGithubTokenCookie();

  console.log("✅ 用户登出成功");
  redirect("/"); // 这里会抛出 NEXT_REDIRECT，这是正常的
}

/**
 * 获取当前用户信息
 * 注意：在 SSR 环境中，如果没有认证会话，会返回 null 而不是抛出错误
 */
export async function getCurrentUser(): Promise<User | null> {
  console.log("👤 获取当前用户信息");

  try {
    const supabase = await createSupabaseClient();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      // 如果是认证会话缺失错误，这是正常的（用户未登录）
      if (error.message?.includes("Auth session missing")) {
        console.log("ℹ️ 用户未登录 (会话缺失)");
        return null;
      }
      console.error("❌ 获取用户信息失败:", error.message);
      return null;
    }

    if (user) {
      console.log("✅ 用户已登录:", user.email || user.id);
    } else {
      console.log("ℹ️ 用户未登录");
    }

    return user;
  } catch (error) {
    // 捕获任何意外的错误，避免崩溃
    console.error("❌ 获取用户信息异常:", error);
    return null;
  }
}
