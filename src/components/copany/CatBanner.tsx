"use client";
import { useEffect, useState } from "react";
import { generateRandomCatAvatarClient } from "@/utils/catAvatar";
import Button from "../commons/Button";
import hand_draw_right_arrow_01 from "@/assets/hand_draw_right_arrow_01.png";
import hand_draw_right_arrow_02 from "@/assets/hand_draw_right_arrow_02.png";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";
interface CatBannerProps {
  title: string;
  subtitle?: string;
  className?: string;
  onBrowseProjects?: () => void;
}

/**
 * Cat Banner Component - Displays a banner with cats looking towards the center text
 */
export default function CatBanner({
  title,
  className = "",
  onBrowseProjects,
}: CatBannerProps) {
  const [catAvatars, setCatAvatars] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const router = useRouter();
  const t = useTranslations("catBanner");
  useEffect(() => {
    // Generate random cat avatars for the border
    const avatars = Array.from({ length: 43 }, () =>
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
      className={`relative flex flex-row bg-[#FBF9F5] dark:bg-[#222221] px-8 items-center justify-center overflow-hidden ${className} w-full`}
    >
      {/* Gradient overlay for visual center focus */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 inset-0 z-5 pointer-events-none w-full h-full min-w-[1024px] flex block dark:hidden"
        style={{
          background: `radial-gradient(circle at center, transparent 0%, transparent 50%, rgba(255, 255, 255, 0.9) 80%, rgba(255, 255, 255, 1) 100%)`,
        }}
      ></div>
      {/* Dark mode gradient overlay */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 inset-0 z-5 pointer-events-none w-full h-full min-w-[1024px] flex dark:block hidden"
        style={{
          background: `radial-gradient(circle at center, transparent 0%, transparent 50%, rgba(10, 10, 10, 0.9) 80%, rgba(10, 10, 10, 1) 100%)`,
        }}
      ></div>
      <div className="relative flex flex-row gap-3 w-fit -mb-8">
        <div className="flex flex-row gap-0">
          {/* Left cats */}
          {[0, 1, 2, 4, 5, 6].map((groupIdx) => (
            <div key={`cat-group-${groupIdx}`} className="flex flex-col gap-3">
              {catAvatars
                .slice(0 + groupIdx * 3, 3 + groupIdx * 3)
                .map((avatar, index) => (
                  <div
                    key={`bottom-${groupIdx}-${index}`}
                    className={`transition-all duration-700 ease-out ${
                      isVisible
                        ? `opacity-100 translate-x-0`
                        : `opacity-0 -translate-x-20`
                    }`}
                    style={{
                      transform: "scaleX(-1)",
                      transitionDelay: `${((6 - groupIdx) * 3 + index) * 50}ms`,
                    }}
                    dangerouslySetInnerHTML={{ __html: avatar }}
                  />
                ))}
            </div>
          ))}
        </div>
        <div className="flex flex-col items-center justify-center min-h-[252px]">
          <div
            className={`flex flex-col items-center justify-center px-4 pt-5 my-auto max-w-screen-lg transition-all duration-700 ease-out ${
              isVisible
                ? `opacity-100 translate-y-0`
                : `opacity-0 translate-y-4`
            }`}
            style={{ transitionDelay: "500ms" }}
          >
            <h1 className="text-4xl font-bold text-center text-gray-900 dark:text-white mb-8">
              {title}
            </h1>
            <div className="flex flex-row items-top justify-start gap-4">
              <div className="flex flex-col items-center justify-center mb-auto">
                <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {t("findProject.title")}
                </p>
                <p className="text-gray-900 dark:text-white text-center max-w-60">
                  {t("findProject.description")}
                </p>
              </div>
              <Image
                src={hand_draw_right_arrow_01}
                alt="hand_draw_right_arrow_01"
                className="h-5 w-auto mt-1"
              />

              <div className="flex flex-col items-center justify-center mb-auto">
                <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {t("collaborate.title")}
                </p>
                <p className="text-gray-900 dark:text-white text-center max-w-60">
                  {t("collaborate.description")}
                </p>
              </div>
              <Image
                src={hand_draw_right_arrow_02}
                alt="hand_draw_right_arrow_02"
                className="h-5 w-auto mt-1"
              />
              <div className="flex flex-col items-center justify-center mb-auto">
                <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {t("distributeRevenue.title")}
                </p>
                <p className="text-gray-900 dark:text-white text-center max-w-60">
                  {t("distributeRevenue.description")}
                </p>
              </div>
            </div>
            <div className="flex flex-row items-center gap-2">
              <Button
                variant="ghost"
                size="md"
                className="mt-4 -mb-6"
                onClick={() => {
                  if (onBrowseProjects) {
                    onBrowseProjects();
                  } else {
                    // Fallback: scroll to copany grid if no callback provided
                    const element = document.getElementById("copany-grid");
                    if (element) {
                      const headerHeight = 52; // MainNavigation height
                      const paddingTop = 20;
                      const elementPosition =
                        element.getBoundingClientRect().top;
                      const offsetPosition =
                        elementPosition +
                        window.pageYOffset -
                        headerHeight -
                        paddingTop;

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
                    {t("buttons.browse")}
                  </p>
                </div>
              </Button>

              <Button
                variant="ghost"
                size="md"
                className="mt-4 -mb-6"
                onClick={() => {
                  router.push("/copany/5?tab=about");
                }}
              >
                <div className="flex flex-row items-center gap-2">
                  <p className="!text-nowrap font-semibold">
                    {t("buttons.learnMore")}
                  </p>
                </div>
              </Button>

              <Button
                variant="ghost"
                size="md"
                className="mt-4 -mb-6"
                onClick={() => {
                  router.push("/new");
                }}
              >
                <div className="flex flex-row items-center gap-2">
                  <p className="!text-nowrap font-semibold">
                    {t("buttons.startProject")}
                  </p>
                </div>
              </Button>
            </div>
          </div>
          {/* Bottom cats */}
          <div className="flex flex-row gap-0 w-fit">
            {catAvatars.slice(35, 39).map((avatar, index) => (
              <div
                key={`bottom-${index}`}
                className={`transition-all duration-700 ease-out ${
                  isVisible
                    ? `opacity-100 translate-y-0`
                    : `opacity-0 translate-y-20`
                }`}
                style={{
                  transform: "scaleX(-1)",
                  transitionDelay: `${index * 100}ms`,
                }}
                dangerouslySetInnerHTML={{ __html: avatar }}
              />
            ))}
            {catAvatars.slice(39, 43).map((avatar, index) => (
              <div
                key={`bottom-${index}`}
                className={`transition-all duration-700 ease-out ${
                  isVisible
                    ? `opacity-100 translate-y-0`
                    : `opacity-0 translate-y-20`
                }`}
                style={{
                  transitionDelay: `${index * 100}ms`,
                }}
                dangerouslySetInnerHTML={{ __html: avatar }}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-row gap-0">
          {/* Right cats */}
          {[7, 8, 9, 10, 11, 12].map((groupIdx) => (
            <div key={`cat-group-${groupIdx}`} className="flex flex-col gap-3">
              {catAvatars
                .slice(0 + groupIdx * 3, 3 + groupIdx * 3)
                .map((avatar, index) => (
                  <div
                    key={`bottom-${groupIdx}-${index}`}
                    className={`transition-all duration-700 ease-out ${
                      isVisible
                        ? `opacity-100 translate-x-0`
                        : `opacity-0 translate-x-20`
                    }`}
                    style={{
                      transform: "",
                      transitionDelay: `${((groupIdx - 6) * 3 + index) * 50}ms`,
                    }}
                    dangerouslySetInnerHTML={{ __html: avatar }}
                  />
                ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
