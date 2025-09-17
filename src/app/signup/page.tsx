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
import { resendVerificationEmail } from "@/actions/auth.actions";
import Button from "@/components/commons/Button";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

export default function Signup() {
  const isDarkMode = useDarkMode();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isResendLoading, setIsResendLoading] = useState(false);
  const [isGitHubLoading, setIsGitHubLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingConfirm, setPendingConfirm] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
      setError("Please enter your name");
      return false;
    }
    if (!formData.email.trim()) {
      setError("Please enter your email address");
      return false;
    }
    if (!formData.password) {
      setError("Please enter your password");
      return false;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
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
      await signUpWithEmail(formData.email, formData.password, formData.name);
      // 注册成功后提示去邮箱确认
      setPendingEmail(formData.email);
      setPendingConfirm(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Registration failed, please try again"
      );
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!pendingEmail) return;
    setIsResendLoading(true);
    setError("");
    try {
      await resendVerificationEmail(pendingEmail);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to resend, please try again later"
      );
    } finally {
      setIsResendLoading(false);
    }
  };

  const handleGitHubSignup = async () => {
    setIsGitHubLoading(true);
    setError("");

    try {
      await signInWithGitHub();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "GitHub signup failed, please try again"
      );
      setIsGitHubLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsGoogleLoading(true);
    setError("");

    try {
      await signInWithGoogle();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Google signup failed, please try again"
      );
      setIsGoogleLoading(false);
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
                    We have sent a confirmation email to {pendingEmail}. Please
                    check your email and click the confirmation link to complete
                    your registration.
                  </p>
                </div>
                <div className="flex items-center gap-3 w-full">
                  <Button
                    variant="secondary"
                    size="sm"
                    shape="rectangle"
                    onClick={handleResendEmail}
                    disabled={
                      isResendLoading ||
                      isEmailLoading ||
                      isGitHubLoading ||
                      isGoogleLoading
                    }
                    className="!p-2"
                  >
                    {isResendLoading
                      ? "Sending..."
                      : "Resend confirmation email"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    shape="rectangle"
                    onClick={() => setPendingConfirm(false)}
                    className="!p-2"
                  >
                    Back to edit email
                  </Button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="flex flex-col items-start gap-4 w-full"
              >
                <div className="flex flex-col items-start gap-2.5 w-full">
                  <div className="flex flex-col items-start gap-2 px-4 py-3 w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
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
                  <div className="flex flex-col items-start gap-2 px-4 py-3 w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
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
                  <div className="flex items-center gap-2 px-4 py-3 w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={(e) =>
                        handleInputChange("password", e.target.value)
                      }
                      placeholder="Password"
                      className="flex-1 text-sm text-gray-700 dark:text-gray-300 bg-transparent border-0 outline-none placeholder:text-gray-500 dark:placeholder:text-gray-400"
                      required
                      aria-label="Password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="flex items-center justify-center p-0 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors hover:cursor-pointer"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="w-5 h-5" />
                      ) : (
                        <EyeIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col items-start gap-2.5 w-full">
                  <div className="flex items-center gap-2 px-4 py-3 w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        handleInputChange("confirmPassword", e.target.value)
                      }
                      placeholder="Re-enter password"
                      className="flex-1 text-sm text-gray-700 dark:text-gray-300 bg-transparent border-0 outline-none placeholder:text-gray-500 dark:placeholder:text-gray-400"
                      required
                      aria-label="Re-enter password"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="flex items-center justify-center p-0 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors hover:cursor-pointer"
                      aria-label={
                        showConfirmPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeSlashIcon className="w-5 h-5" />
                      ) : (
                        <EyeIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={
                    isEmailLoading ||
                    isResendLoading ||
                    isGitHubLoading ||
                    isGoogleLoading
                  }
                  className="flex items-center justify-center gap-2 px-3 py-2.5 w-full rounded-lg border border-gray-900 dark:border-gray-100 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-medium text-sm hover:opacity-90 transition-opacity hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="whitespace-nowrap">
                    {isEmailLoading ? "Signing up..." : "Sign up"}
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
              onClick={handleGitHubSignup}
              disabled={
                isEmailLoading ||
                isResendLoading ||
                isGitHubLoading ||
                isGoogleLoading
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
                {isGitHubLoading ? "Signing up..." : "Sign up with GitHub"}
              </span>
            </button>

            <button
              type="button"
              onClick={handleGoogleSignup}
              disabled={
                isEmailLoading ||
                isResendLoading ||
                isGitHubLoading ||
                isGoogleLoading
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
                {isGoogleLoading ? "Signing up..." : "Sign up with Google"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
