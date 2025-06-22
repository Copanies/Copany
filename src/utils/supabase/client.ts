import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  // 调试日志：检查环境变量
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log("=== Supabase 浏览器端客户端调试信息 ===");
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
  console.log("浏览器环境:", typeof window !== "undefined" ? "是" : "否");
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
    console.log("🔄 正在创建 Supabase 浏览器端客户端...");

    const client = createBrowserClient(supabaseUrl, supabaseAnonKey);

    console.log("✅ Supabase 浏览器端客户端创建成功");
    return client;
  } catch (error) {
    console.error("❌ 创建 Supabase 客户端时出错:", error);
    throw error;
  }
}
