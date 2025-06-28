"use client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import ChevronDownIcon from "@/app/chevron.down.png";
import ChevronDownIconDark from "@/app/chevron.down.dark.png";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import Button from "@/components/commons/Button";

export default function IssueNavigation() {
  const router = useRouter();

  const { resolvedTheme } = useTheme();
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    setIsDarkMode(resolvedTheme === "dark");
  }, [resolvedTheme]);

  return (
    <div className="max-w-screen-lg mx-auto flex flex-row items-center justify-between p-3">
      <Button
        variant="primary"
        size="md"
        shape="square"
        onClick={() => router.back()}
      >
        <Image
          className="rotate-90"
          src={isDarkMode ? ChevronDownIconDark : ChevronDownIcon}
          alt="chevron down"
          width={12}
          height={12}
        />
      </Button>
    </div>
  );
}
