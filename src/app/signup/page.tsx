"use client";

import React, { useState } from "react";
import googleIcon from "@/assets/google_logo.webp";
import githubIconBlack from "@/assets/github_logo.svg";
import githubIconWhite from "@/assets/github_logo_dark.svg";
import Image from "next/image";
import copanylogo from "@/assets/copany_logo.svg";
import { useDarkMode } from "@/utils/useDarkMode";

export default function Signup() {
  const isDarkMode = useDarkMode();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log("Form submitted:", formData);
  };

  const handleGitHubLogin = () => {
    // Handle GitHub login
    console.log("GitHub login clicked");
  };

  const handleGoogleLogin = () => {
    // Handle Google login
    console.log("Google login clicked");
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
                Sign up
              </h1>

              <p className="text-sm text-gray-600 dark:text-gray-400">
                Let&apos;s start our own Company
              </p>
            </div>

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
                    onChange={(e) => handleInputChange("name", e.target.value)}
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
                className="flex items-center justify-center gap-2 px-3 py-2.5 w-full rounded-lg border border-gray-900 dark:border-gray-100 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-medium text-sm hover:opacity-90 transition-opacity hover:cursor-pointer"
              >
                <span className="whitespace-nowrap">Sign up</span>
              </button>
            </form>

            <p className="w-full text-sm text-gray-600 dark:text-gray-400">
              <span>By signing up, you agree to our </span>

              <a
                href="#"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Privacy Policy
              </a>

              <span>, </span>

              <a
                href="#"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Cookie Policy
              </a>

              <span> and </span>

              <a
                href="#"
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
              className="flex items-center justify-center gap-2 px-3 py-2.5 w-full rounded-lg border border-gray-800 dark:border-gray-200 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 font-medium text-sm hover:opacity-90 transition-opacity hover:cursor-pointer"
            >
              <Image
                className="w-4 h-4"
                alt="GitHub Logo"
                src={isDarkMode ? githubIconBlack : githubIconWhite}
                width={16}
                height={16}
              />

              <span className="whitespace-nowrap">Login with GitHub</span>
            </button>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="flex items-center justify-center gap-2 px-3 py-2.5 w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors hover:cursor-pointer"
            >
              <Image
                className="w-4 h-4"
                alt="Google Logo"
                src={googleIcon}
                width={16}
                height={16}
              />

              <span className="whitespace-nowrap">Login with Google</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
