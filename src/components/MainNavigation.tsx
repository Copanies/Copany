"use client";
import Image from "next/image";
import logo from "@/app/favicon.ico";
import { useRouter } from "next/navigation";

export default function MainNavigation() {
  const router = useRouter();

  return (
    <div className="flex flex-row items-center justify-between p-3 border-b border-gray-200 dark:border-gray-800">
      <Image
        className="cursor-pointer"
        src={logo}
        alt="logo"
        width={32}
        height={32}
        onClick={() => router.push("/")}
      />
      <div className="flex flex-row items-center gap-2"></div>
    </div>
  );
}
