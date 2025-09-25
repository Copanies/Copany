"use client";
import { useEffect, useState } from "react";
import { generateRandomCatAvatarClient } from "@/utils/catAvatar";
interface CatBannerProps {
  title: string;
  subtitle?: string;
  className?: string;
}

/**
 * Cat Banner Component - Displays a banner with cats looking towards the center text
 */
export default function CatBanner({
  title,
  subtitle,
  className = "",
}: CatBannerProps) {
  const [catAvatars, setCatAvatars] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Generate random cat avatars for the border
    const avatars = Array.from({ length: 40 }, () =>
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
      className={`relative flex flex-row bg-[#FBF9F5] dark:bg-[#222221] pt-3 px-8 items-center justify-center overflow-hidden ${className} w-full`}
    >
      {/* Gradient overlay for visual center focus */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 inset-0 z-10 pointer-events-none w-full h-full min-w-[1024px] flex block dark:hidden"
        style={{
          background: `radial-gradient(circle at center, transparent 0%, transparent 30%, rgba(251, 249, 245, 0.9) 80%, rgba(251, 249, 245, 1) 100%)`,
        }}
      ></div>
      {/* Dark mode gradient overlay */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 inset-0 z-10 pointer-events-none w-full h-full min-w-[1024px] flex dark:block hidden"
        style={{
          background: `radial-gradient(circle at center, transparent 0%, transparent 30%, rgba(34, 34, 33, 0.9) 80%, rgba(34, 34, 33, 1) 100%)`,
        }}
      ></div>
      <div className="relative flex flex-row gap-3 w-fit -mb-8">
        <div className="flex flex-row gap-3">
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
            className={`flex flex-col items-center justify-center px-8 my-auto max-w-screen-lg transition-all duration-700 ease-out ${
              isVisible
                ? `opacity-100 translate-y-0`
                : `opacity-0 translate-y-4`
            }`}
            style={{ transitionDelay: "500ms" }}
          >
            <h1 className="text-4xl font-bold text-center text-gray-900 dark:text-white mb-4">
              {title}
            </h1>
            {subtitle && (
              <div className="text-xl text-gray-900 text-center dark:text-white space-y-2">
                {subtitle.split("\n").map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
            )}
          </div>
          {/* Bottom cats */}
          <div className="flex flex-row gap-3 w-fit">
            {catAvatars.slice(35, 37).map((avatar, index) => (
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
            {catAvatars.slice(37, 39).map((avatar, index) => (
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
        <div className="flex flex-row gap-3">
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
