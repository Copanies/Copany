import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

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
    const client = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          const allCookies = cookieStore.getAll();
          return allCookies;
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch (error) {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
            console.warn("⚠️ 服务器组件调用 setAll, 可忽略");
          }
        },
      },
    });

    console.log("✅ Supabase 服务器端客户端创建成功");
    return client;
  } catch (error) {
    console.error("❌ Supabase 服务器端客户端创建失败:", error);
    throw error;
  }
}
