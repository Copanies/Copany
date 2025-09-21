"use client";

import React, { useState } from "react";
import googleIcon from "@/assets/google_logo.webp";
import githubIconBlack from "@/assets/github_logo.svg";
import githubIconWhite from "@/assets/github_logo_dark.svg";
import figmaIcon from "@/assets/figma_logo.svg";
import Image from "next/image";
import BasicNavigation from "@/components/commons/BasicNavigation";
import { useDarkMode } from "@/utils/useDarkMode";
import {
  signInWithEmail,
  signInWithGitHub,
  signInWithGoogle,
  signInWithFigma,
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

  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isGitHubLoading, setIsGitHubLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isFigmaLoading, setIsFigmaLoading] = useState(false);
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
      setError("Please enter your email address");
      return false;
    }
    if (!formData.password) {
      setError("Please enter your password");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsEmailLoading(true);
    setError("");

    try {
      await signInWithEmail(formData.email, formData.password);
      // 登录成功后跳转到主页
      router.push("/");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Login failed, please try again"
      );
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleGitHubLogin = async () => {
    setIsGitHubLoading(true);
    setError("");

    try {
      await signInWithGitHub();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "GitHub login failed, please try again"
      );
      setIsGitHubLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setError("");

    try {
      await signInWithGoogle();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Google login failed, please try again"
      );
      setIsGoogleLoading(false);
    }
  };

  const handleFigmaLogin = async () => {
    setIsFigmaLoading(true);
    setError("");

    try {
      await signInWithFigma();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Figma login failed, please try again"
      );
      setIsFigmaLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen items-center bg-[#FBF9F5] dark:bg-background-dark">
      <BasicNavigation />

      <div className="flex flex-col w-full max-w-md items-center justify-center gap-16 pt-8 pb-16 flex-1">
        <div className="flex flex-col items-center gap-5 py-8 w-full bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
          <div className="flex flex-col items-start gap-1 w-full px-8 pb-0">
            <h1 className="text-3xl font-normal text-gray-900 dark:text-gray-100">
              Sign in
            </h1>

            <p className="text-sm text-gray-600 dark:text-gray-400">
              Welcome back to Copany
            </p>
          </div>

          <div className="flex flex-col items-center gap-3 px-8 w-full">
            <button
              type="button"
              onClick={handleFigmaLogin}
              disabled={
                isEmailLoading ||
                isGitHubLoading ||
                isGoogleLoading ||
                isFigmaLoading
              }
              className="flex items-center justify-center gap-2 px-3 py-2.5 w-full rounded-lg border border-gray-800 dark:border-gray-200 bg-gray-800 dark:bg-gray-100 text-white dark:text-gray-900 font-medium text-sm hover:opacity-90 transition-opacity hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Image
                className="w-4 h-4"
                alt="Figma Logo"
                src={figmaIcon}
                width={16}
                height={16}
              />

              <span className="whitespace-nowrap">
                {isFigmaLoading ? "Signing in..." : "Login with Figma"}
              </span>
            </button>
            <button
              type="button"
              onClick={handleGitHubLogin}
              disabled={
                isEmailLoading ||
                isGitHubLoading ||
                isGoogleLoading ||
                isFigmaLoading
              }
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
                {isGitHubLoading ? "Signing in..." : "Login with GitHub"}
              </span>
            </button>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={
                isEmailLoading ||
                isGitHubLoading ||
                isGoogleLoading ||
                isFigmaLoading
              }
              className="flex items-center justify-center gap-2 px-3 py-2.5 w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Image
                className="w-4 h-4"
                alt="Google Logo"
                src={googleIcon}
                width={16}
                height={16}
              />

              <span className="whitespace-nowrap">
                {isGoogleLoading ? "Signing in..." : "Login with Google"}
              </span>
            </button>
          </div>

          <div className="flex items-center justify-center gap-3 w-full">
            <div className="text-sm text-gray-600 dark:text-gray-400">or</div>
          </div>

          <div className="flex flex-col items-start gap-5 px-8 w-full">
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
                <div className="flex flex-col items-start gap-2 px-4 py-3 w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
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
                <div className="flex flex-col items-start gap-2 px-4 py-3 w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
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
                disabled={
                  isEmailLoading ||
                  isGitHubLoading ||
                  isGoogleLoading ||
                  isFigmaLoading
                }
                className="flex items-center justify-center gap-2 px-3 py-2.5 w-full rounded-lg border border-gray-900 dark:border-gray-100 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-medium text-sm hover:opacity-90 transition-opacity hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="whitespace-nowrap">
                  {isEmailLoading ? "Signing in..." : "Sign in"}
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
        </div>
      </div>
    </div>
  );
}
