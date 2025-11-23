"use client";
import { useEffect, useState } from "react";
import { generateRandomCatAvatarClient } from "@/utils/catAvatar";
import { useRouter } from "next/navigation";
import Button from "../commons/Button";
import { useTranslations } from "next-intl";
interface MobileCatBannerProps {
  title: string;
  className?: string;
  onBrowseProjects?: () => void;
}

/**
 * Mobile Cat Banner Component - Optimized for small screens
 * Displays a simplified banner with fewer cats and mobile-friendly layout
 */
export default function MobileCatBanner({
  title,
  className = "",
  onBrowseProjects,
}: MobileCatBannerProps) {
  const [catAvatars, setCatAvatars] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const router = useRouter();
  const t = useTranslations("mobileCatBanner");
  const tButtons = useTranslations("catBanner.buttons");
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
          <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-3">
            {title}
          </h1>
          <p className="text-base text-gray-900 text-center dark:text-white leading-relaxed max-w-screen mx-4 whitespace-pre-line">
            {t("description")}
          </p>
          <div className="flex flex-row items-center gap-2 flex-wrap justify-center">
            <Button
              variant="ghost"
              size="md"
              className="mt-3 -mb-3"
              onClick={() => {
                if (onBrowseProjects) {
                  onBrowseProjects();
                } else {
                  // Fallback: scroll to copany grid if no callback provided
                  const element = document.getElementById("copany-grid");
                  if (element) {
                    const headerHeight = 52; // MainNavigation height
                    const elementPosition = element.getBoundingClientRect().top;
                    const offsetPosition =
                      elementPosition + window.pageYOffset - headerHeight;

                    window.scrollTo({
                      top: offsetPosition,
                      behavior: "smooth",
                    });
                  }
                }
              }}
            >
              <div className="flex flex-row items-center gap-2">
                <p className="!text-nowrap font-semibold">
                  {tButtons("browse")}
                </p>
              </div>
            </Button>
            <Button
              variant="ghost"
              size="md"
              className="mt-3 -mb-3"
              onClick={() => {
                router.push("/copany/5?tab=about");
              }}
            >
              <div className="flex flex-row items-center gap-2">
                <p className="!text-nowrap font-semibold">
                  {tButtons("learnMore")}
                </p>
              </div>
            </Button>
            <Button
              variant="ghost"
              size="md"
              className="mt-3 -mb-3"
              onClick={() => {
                router.push("/new");
              }}
            >
              <div className="flex flex-row items-center gap-2">
                <p className="!text-nowrap font-semibold">
                  {tButtons("startProject")}
                </p>
              </div>
            </Button>
          </div>
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
