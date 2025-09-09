"use client";

import React, { useState } from "react";
import googleIcon from "@/assets/google_logo.webp";
import githubIconBlack from "@/assets/github_logo.svg";
import githubIconWhite from "@/assets/github_logo_dark.svg";
import Image from "next/image";
import BasicNavigation from "@/components/commons/BasicNavigation";
import { useDarkMode } from "@/utils/useDarkMode";
import {
  signUpWithEmail,
  signInWithGitHub,
  signInWithGoogle,
} from "@/actions/auth.actions";
import { useRouter } from "next/navigation";
import { resendVerificationEmail } from "@/actions/auth.actions";

export default function Signup() {
  const isDarkMode = useDarkMode();
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingConfirm, setPendingConfirm] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error when user starts typing
    if (error) setError("");
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError("请输入姓名");
      return false;
    }
    if (!formData.email.trim()) {
      setError("请输入邮箱地址");
      return false;
    }
    if (!formData.password) {
      setError("请输入密码");
      return false;
    }
    if (formData.password.length < 6) {
      setError("密码长度至少为6位");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("两次输入的密码不一致");
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
      await signUpWithEmail(formData.email, formData.password, formData.name);
      // 注册成功后提示去邮箱确认
      setPendingEmail(formData.email);
      setPendingConfirm(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "注册失败，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!pendingEmail) return;
    setIsLoading(true);
    setError("");
    try {
      await resendVerificationEmail(pendingEmail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "重发失败，请稍后再试");
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
    <div className="flex flex-col min-h-screen items-center bg-[#FBF9F5] dark:bg-background-dark">
      <BasicNavigation />

      <div className="flex flex-col w-full max-w-md items-center justify-center gap-16 pt-8 pb-16 px-6 flex-1">
        <div className="flex flex-col items-center gap-5 py-8 w-full bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
          <div className="flex flex-col items-start gap-5 px-8 w-full">
            <div className="flex flex-col items-start gap-1">
              <h1 className="text-3xl font-normal text-gray-900 dark:text-gray-100">
                Sign up
              </h1>

              <p className="text-sm text-gray-600 dark:text-gray-400">
                Freer creation, fairer rewards.
              </p>
            </div>

            {error && (
              <div className="w-full p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              </div>
            )}

            {pendingConfirm ? (
              <div className="flex flex-col items-start gap-4 w-full">
                <div className="w-full p-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    我们已向 {pendingEmail}{" "}
                    发送确认邮件。请前往邮箱点击确认链接以完成注册。
                  </p>
                </div>
                <div className="flex items-center gap-3 w-full">
                  <button
                    type="button"
                    onClick={handleResendEmail}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? "发送中..." : "重发确认邮件"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingConfirm(false)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    返回修改邮箱
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="flex flex-col items-start gap-4 w-full"
              >
                <div className="flex flex-col items-start gap-2.5 w-full">
                  <div className="flex flex-col items-start gap-2 px-4 py-3 w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700">
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={(e) =>
                        handleInputChange("name", e.target.value)
                      }
                      placeholder="Name"
                      className="w-full text-sm text-gray-700 dark:text-gray-300 bg-transparent border-0 outline-none placeholder:text-gray-500 dark:placeholder:text-gray-400"
                      required
                      aria-label="Name"
                    />
                  </div>
                </div>

                <div className="flex flex-col items-start gap-2.5 w-full">
                  <div className="flex flex-col items-start gap-2 px-4 py-3 w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700">
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={(e) =>
                        handleInputChange("email", e.target.value)
                      }
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

                <div className="flex flex-col items-start gap-2.5 w-full">
                  <div className="flex flex-col items-start gap-2 px-4 py-3 w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700">
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        handleInputChange("confirmPassword", e.target.value)
                      }
                      placeholder="Re-enter password"
                      className="w-full text-sm text-gray-700 dark:text-gray-300 bg-transparent border-0 outline-none placeholder:text-gray-500 dark:placeholder:text-gray-400"
                      required
                      aria-label="Re-enter password"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 w-full rounded-lg border border-gray-900 dark:border-gray-100 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-medium text-sm hover:opacity-90 transition-opacity hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="whitespace-nowrap">
                    {isLoading ? "注册中..." : "Sign up"}
                  </span>
                </button>
              </form>
            )}

            <p className="w-full text-sm text-gray-600 dark:text-gray-400">
              <span>By signing up, you agree to our </span>

              <a
                href="/privacy-policy"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Privacy Policy
              </a>

              <span>, </span>

              <a
                href="/cookies-policy"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Cookie Policy
              </a>

              <span> and </span>

              <a
                href="/terms"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Terms of Use
              </a>

              <span>.</span>
            </p>
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
