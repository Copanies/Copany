"use client";
import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import { signInWithGitHub, signOut } from "@/actions/auth.actions";
import Image from "next/image";

export default function UserLoginView() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // 获取初始会话
    const getInitialSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getInitialSession();

    // 监听认证状态变化
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="p-4">加载中...</div>;
  }

  return (
    <div>
      {user ? (
        <div>
          <div>
            <div>
              {user.user_metadata?.avatar_url ? (
                <Image
                  src={user.user_metadata.avatar_url}
                  alt={user.user_metadata.name || "User Avatar"}
                  className="w-32 h-32 border-1 border-gray-300 dark:border-gray-700"
                  width={100}
                  height={100}
                />
              ) : (
                <span className="rounded-md p-2 bg-gray-200 border-1 border-gray-300">
                  {user.user_metadata?.name?.[0] || "U"}
                </span>
              )}
            </div>
            <div>
              <p>{user.user_metadata?.name || "No name set"}</p>
              <p>{user.email}</p>
            </div>
          </div>

          <div>
            <p>User ID: {user.id}</p>
          </div>
        </div>
      ) : (
        <form action={signInWithGitHub}>
          <button
            type="submit"
            className="cursor-pointer rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 border-1 border-gray-300 px-2"
          >
            Sign in with Github
          </button>
        </form>
      )}

      {user && (
        <div>
          <form action={signOut}>
            <button
              type="submit"
              className="cursor-pointer rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 border-1 border-gray-300 mt-2 px-2"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
