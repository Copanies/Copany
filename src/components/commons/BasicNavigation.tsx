"use client";

import Image from "next/image";
import copanylogo from "@/assets/copany_logo.svg";
import copanylogoDark from "@/assets/copany_logo_dark.svg";
import { useDarkMode } from "@/utils/useDarkMode";
import { useRouter } from "next/navigation";

export default function BasicNavigation() {
  const isDarkMode = useDarkMode();
  const router = useRouter();
  return (
    <header className="flex h-16 items-center justify-center px-8 py-3 w-full bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <Image
        className="w-9 h-9 cursor-pointer"
        alt="Copany Logo"
        src={isDarkMode ? copanylogoDark : copanylogo}
        width={36}
        height={36}
        onClick={() => router.push("/")}
      />
    </header>
  );
}
