import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  // 调试日志：检查环境变量
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // 检查必需的环境变量
  if (!supabaseUrl) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL 未设置");
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL 环境变量未设置。请检查你的 .env.local 文件。"
    );
  }

  if (!supabaseAnonKey) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_ANON_KEY 未设置");
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY 环境变量未设置。请检查你的 .env.local 文件。"
    );
  }

  try {
    const client = createBrowserClient(supabaseUrl, supabaseAnonKey);

    console.log("✅ Supabase 浏览器端客户端创建成功");
    return client;
  } catch (error) {
    console.error("❌ Supabase 浏览器端客户端创建失败:", error);
    throw error;
  }
}
