"use client";

import Image from "next/image";
import copanylogo from "@/assets/copany_logo.svg";
import copanylogoDark from "@/assets/copany_logo_dark.svg";
import { useDarkMode } from "@/utils/useDarkMode";
import { useRouter } from "next/navigation";
import { shimmerDataUrlWithTheme } from "@/utils/shimmer";

export default function BasicNavigation() {
  const isDarkMode = useDarkMode();
  const router = useRouter();
  return (
    <header className="sticky top-0 z-10 flex h-16 items-end justify-start px-8 w-full bg-transparent h-[80px]">
      <Image
        className="w-12 h-12 cursor-pointer hover:opacity-80"
        alt="Copany Logo"
        src={isDarkMode ? copanylogoDark : copanylogo}
        width={48}
        height={48}
        placeholder="blur"
        blurDataURL={shimmerDataUrlWithTheme(48, 48, isDarkMode)}
        onClick={() => router.push("/")}
      />
    </header>
  );
}
