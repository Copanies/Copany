"use client";
import { useEffect, useState } from "react";
import { generateRandomCatAvatarClient } from "@/utils/catAvatar";
import { useRouter } from "next/navigation";
import Button from "../commons/Button";
import { ArrowUpRightIcon } from "@heroicons/react/24/outline";
interface MobileCatBannerProps {
  title: string;
  subtitle?: string;
  className?: string;
}

/**
 * Mobile Cat Banner Component - Optimized for small screens
 * Displays a simplified banner with fewer cats and mobile-friendly layout
 */
export default function MobileCatBanner({
  title,
  subtitle,
  className = "",
}: MobileCatBannerProps) {
  const [catAvatars, setCatAvatars] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const router = useRouter();
  useEffect(() => {
    // Generate only 4 cat avatars for mobile (bottom row only)
    const avatars = Array.from({ length: 4 }, () =>
      generateRandomCatAvatarClient(false, true)
    );
    setCatAvatars(avatars);

    // Trigger entrance animation after a short delay
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`relative flex flex-row bg-[#FBF9F5] dark:bg-[#222221] p-6 items-center justify-center overflow-hidden ${className} w-full`}
    >
      {/* Center content */}
      <div className="relative flex flex-col items-center justify-center min-h-[180px]">
        <div
          className={`flex flex-col items-center justify-center px-6 my-auto max-w-screen-lg transition-all duration-700 ease-out ${
            isVisible ? `opacity-100 translate-y-0` : `opacity-0 translate-y-4`
          }`}
          style={{ transitionDelay: "500ms" }}
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 dark:text-white mb-3">
            {title}
          </h1>
          {subtitle && (
            <div className="text-base sm:text-lg text-gray-900 text-center dark:text-white space-y-1">
              {subtitle.split("\n").map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
          )}
          <Button
            variant="ghost"
            size="md"
            className="mt-3 -mb-3"
            onClick={() => {
              router.push("/copany/5");
            }}
          >
            <div className="flex flex-row items-center gap-2">
              <ArrowUpRightIcon className="w-4 h-4" strokeWidth={2} />
              <p className="!text-nowrap font-semiblod">Learn More</p>
            </div>
          </Button>
        </div>

        {/* Bottom cats row */}
        <div className="flex flex-row gap-1 w-fit h-16">
          <div
            key={`bottom-left-${0}`}
            className={`transition-all duration-700 ease-out ${
              isVisible
                ? `opacity-100 translate-y-0 -translate-x-0`
                : `opacity-0 translate-y-20 -translate-x-12`
            }`}
            style={{
              transform: "scaleX(-1)",
              transitionDelay: `${1 * 100}ms`,
            }}
            dangerouslySetInnerHTML={{ __html: catAvatars[0] }}
          />
          <div
            key={`bottom-left-${1}`}
            className={`transition-all duration-700 ease-out ${
              isVisible
                ? `opacity-100 translate-y-2`
                : `opacity-0 translate-y-20`
            }`}
            style={{
              transform: "scaleX(-1)",
              transitionDelay: `${0 * 100}ms`,
            }}
            dangerouslySetInnerHTML={{ __html: catAvatars[1] }}
          />
          <div
            key={`bottom-right-${2}`}
            className={`transition-all duration-700 ease-out ${
              isVisible
                ? `opacity-100 translate-y-2`
                : `opacity-0 translate-y-20`
            }`}
            style={{
              transitionDelay: `${0 * 100}ms`,
            }}
            dangerouslySetInnerHTML={{ __html: catAvatars[2] }}
          />
          <div
            key={`bottom-right-${3}`}
            className={`transition-all duration-700 ease-out ${
              isVisible
                ? `opacity-100 translate-y-0 translate-x-0`
                : `opacity-0 translate-y-20 translate-x-12`
            }`}
            style={{
              transitionDelay: `${1 * 100}ms`,
            }}
            dangerouslySetInnerHTML={{ __html: catAvatars[3] }}
          />
        </div>
      </div>
    </div>
  );
}
