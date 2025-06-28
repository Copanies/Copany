"use client";
import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import { signInWithGitHub, signOut } from "@/actions/auth.actions";
import Image from "next/image";
import Button from "./commons/Button";
import LoadingView from "./commons/LoadingView";

export default function UserLoginView() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // 获取初始用户信息（安全验证）
    const getInitialUser = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error) {
          console.error("❌ UserLoginView: 获取用户信息时出错:", error);
        }

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
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        setLoading(false);
      } else if (event === "SIGNED_IN") {
        // 重新触发用户信息获取
        getInitialUser();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="p-2 w-32">
        <LoadingView type="label" />
      </div>
    );
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
          <Button type="submit" variant="primary" size="sm">
            Sign in with Github
          </Button>
        </form>
      )}

      {user && (
        <div>
          <form action={signOut}>
            <Button type="submit" variant="primary" size="sm" className="mt-2">
              Sign out
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
