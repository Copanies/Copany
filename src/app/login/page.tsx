"use client";

import React, { useState } from "react";
import googleIcon from "@/assets/google_logo.webp";
import githubIconBlack from "@/assets/github_logo.svg";
import githubIconWhite from "@/assets/github_logo_dark.svg";
import Image from "next/image";
import copanylogo from "@/assets/copany_logo.svg";
import { useDarkMode } from "@/utils/useDarkMode";
import {
  signInWithEmail,
  signInWithGitHub,
  signInWithGoogle,
} from "@/actions/auth.actions";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Login() {
  const isDarkMode = useDarkMode();
  const router = useRouter();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error when user starts typing
    if (error) setError("");
  };

  const validateForm = () => {
    if (!formData.email.trim()) {
      setError("请输入邮箱地址");
      return false;
    }
    if (!formData.password) {
      setError("请输入密码");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setError("");

    try {
      await signInWithEmail(formData.email, formData.password);
      // 登录成功后跳转到主页
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGitHubLogin = async () => {
    setIsLoading(true);
    setError("");

    try {
      await signInWithGitHub();
    } catch (err) {
      setError(err instanceof Error ? err.message : "GitHub 登录失败，请重试");
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError("");

    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google 登录失败，请重试");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen items-center bg-gray-50 dark:bg-gray-900">
      <header className="flex h-16 items-center justify-center px-8 py-3 w-full bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <Image
          className="w-9 h-9"
          alt="Copany Logo"
          src={copanylogo}
          width={36}
          height={36}
        />
      </header>

      <div className="flex flex-col w-full max-w-md items-center justify-center gap-16 pt-8 pb-16 px-6 flex-1">
        <div className="flex flex-col items-center gap-5 py-8 w-full bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
          <div className="flex flex-col items-start gap-5 px-8 w-full">
            <div className="flex flex-col items-start gap-1">
              <h1 className="text-3xl font-normal text-gray-900 dark:text-gray-100">
                Sign in
              </h1>

              <p className="text-sm text-gray-600 dark:text-gray-400">
                Welcome back to Copany
              </p>
            </div>

            {error && (
              <div className="w-full p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="flex flex-col items-start gap-4 w-full"
            >
              <div className="flex flex-col items-start gap-2.5 w-full">
                <div className="flex flex-col items-start gap-2 px-4 py-3 w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700">
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="Email"
                    className="w-full text-sm text-gray-700 dark:text-gray-300 bg-transparent border-0 outline-none placeholder:text-gray-500 dark:placeholder:text-gray-400"
                    required
                    aria-label="Email"
                  />
                </div>
              </div>

              <div className="flex flex-col items-start gap-2.5 w-full">
                <div className="flex flex-col items-start gap-2 px-4 py-3 w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700">
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={(e) =>
                      handleInputChange("password", e.target.value)
                    }
                    placeholder="Password"
                    className="w-full text-sm text-gray-700 dark:text-gray-300 bg-transparent border-0 outline-none placeholder:text-gray-500 dark:placeholder:text-gray-400"
                    required
                    aria-label="Password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center justify-center gap-2 px-3 py-2.5 w-full rounded-lg border border-gray-900 dark:border-gray-100 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-medium text-sm hover:opacity-90 transition-opacity hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="whitespace-nowrap">
                  {isLoading ? "登录中..." : "Sign in"}
                </span>
              </button>
            </form>

            <div className="flex items-center justify-center gap-2 w-full">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Don&apos;t have an account?
              </span>
              <Link
                href="/signup"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Sign up
              </Link>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 w-full">
            <div className="text-sm text-gray-600 dark:text-gray-400">or</div>
          </div>

          <div className="flex flex-col items-center gap-3 px-8 w-full">
            <button
              type="button"
              onClick={handleGitHubLogin}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 px-3 py-2.5 w-full rounded-lg border border-gray-800 dark:border-gray-200 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 font-medium text-sm hover:opacity-90 transition-opacity hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Image
                className="w-4 h-4"
                alt="GitHub Logo"
                src={isDarkMode ? githubIconBlack : githubIconWhite}
                width={16}
                height={16}
              />

              <span className="whitespace-nowrap">
                {isLoading ? "登录中..." : "Login with GitHub"}
              </span>
            </button>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 px-3 py-2.5 w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Image
                className="w-4 h-4"
                alt="Google Logo"
                src={googleIcon}
                width={16}
                height={16}
              />

              <span className="whitespace-nowrap">
                {isLoading ? "登录中..." : "Login with Google"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
