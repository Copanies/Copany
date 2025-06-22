import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  // 调试日志：检查环境变量
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log("=== Supabase 服务器端客户端调试信息 ===");
  console.log("NEXT_PUBLIC_SUPABASE_URL 存在:", !!supabaseUrl);
  console.log(
    "NEXT_PUBLIC_SUPABASE_URL 值:",
    supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : "undefined"
  );
  console.log("NEXT_PUBLIC_SUPABASE_ANON_KEY 存在:", !!supabaseAnonKey);
  console.log(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY 值:",
    supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : "undefined"
  );
  console.log("环境变量总数:", Object.keys(process.env).length);
  console.log("NODE_ENV:", process.env.NODE_ENV);
  console.log("=======================================");

  // 检查必需的环境变量
  if (!supabaseUrl) {
    console.error("❌ 错误: NEXT_PUBLIC_SUPABASE_URL 环境变量未设置");
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL 环境变量未设置。请检查你的 .env.local 文件。"
    );
  }

  if (!supabaseAnonKey) {
    console.error("❌ 错误: NEXT_PUBLIC_SUPABASE_ANON_KEY 环境变量未设置");
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY 环境变量未设置。请检查你的 .env.local 文件。"
    );
  }

  try {
    console.log("🔄 正在创建 Supabase 服务器端客户端...");

    const client = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          const allCookies = cookieStore.getAll();
          console.log("📄 获取 cookies 数量:", allCookies.length);
          return allCookies;
        },
        setAll(cookiesToSet) {
          try {
            console.log("🍪 设置 cookies 数量:", cookiesToSet.length);
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch (error) {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
            console.warn(
              "⚠️ 警告: 从服务器组件调用 setAll 方法，这可以忽略",
              error
            );
          }
        },
      },
    });

    console.log("✅ Supabase 服务器端客户端创建成功");
    return client;
  } catch (error) {
    console.error("❌ 创建 Supabase 客户端时出错:", error);
    throw error;
  }
}
