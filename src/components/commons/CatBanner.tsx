"use client";
import { useEffect, useState } from "react";
import { generateRandomCatAvatarClient } from "@/utils/catAvatar";

interface CatBannerProps {
  title: string;
  subtitle?: string;
  className?: string;
  includeBody?: boolean;
}

/**
 * Cat Banner Component - Displays a banner with cats looking towards the center text
 */
export default function CatBanner({
  title,
  subtitle,
  className = "",
  includeBody = false,
}: CatBannerProps) {
  const [catAvatars, setCatAvatars] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Generate random cat avatars for the border
    const avatars = Array.from({ length: 40 }, () =>
      generateRandomCatAvatarClient(false, includeBody)
    );
    setCatAvatars(avatars);

    // Trigger entrance animation after a short delay
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    return () => clearTimeout(timer);
  }, [includeBody]);

  return (
    <div
      className={`flex flex-row bg-[#FBF9F5] p-8 items-center justify-center overflow-hidden ${className} w-full`}
    >
      {/* Center content */}
      <div className="flex flex-row gap-3 w-fit">
        <div className="flex flex-row gap-3">
          {/* Left cats */}
          {[0, 1, 2, 4, 5, 6].map((groupIdx) => (
            <div key={`cat-group-${groupIdx}`} className="flex flex-col gap-3">
              {catAvatars
                .slice(0 + groupIdx * 3, 3 + groupIdx * 3)
                .map((avatar, index) => (
                  <div
                    key={`bottom-${groupIdx}-${index}`}
                    className={`transition-all duration-700 ease-out hover:scale-105 cursor-pointer cat-shake ${
                      isVisible
                        ? `opacity-100 translate-x-0`
                        : `opacity-0 -translate-x-20`
                    }`}
                    style={{
                      transform: "scaleX(-1)",
                      transitionDelay: `${
                        ((6 - groupIdx) * 3 + index) * 100
                      }ms`,
                    }}
                    dangerouslySetInnerHTML={{ __html: avatar }}
                  />
                ))}
            </div>
          ))}
        </div>
        <div className="flex flex-col items-center justify-center min-h-[252px] w-fit min-w-lg">
          <div
            className={`flex flex-col items-center justify-center my-auto transition-all duration-700 ease-out ${
              isVisible
                ? `opacity-100 translate-y-0`
                : `opacity-0 translate-y-4`
            }`}
            style={{ transitionDelay: "500ms" }}
          >
            <h1 className="text-4xl font-bold text-center text-gray-900 mb-4">
              {title}
            </h1>
            {subtitle && (
              <div className="text-xl text-gray-900 text-center space-y-2">
                {subtitle.split("\n").map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
            )}
          </div>
          {/* Bottom cats */}
          <div className="flex flex-row gap-3 w-fit">
            {catAvatars.slice(31, 33).map((avatar, index) => (
              <div
                key={`bottom-${index}`}
                className={`transition-all duration-700 ease-out hover:scale-105 cursor-pointer cat-shake ${
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
            {catAvatars.slice(32, 34).map((avatar, index) => (
              <div
                key={`bottom-${index}`}
                className={`transition-all duration-700 ease-out hover:scale-105 cursor-pointer cat-shake ${
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
                    className={`transition-all duration-700 ease-out hover:scale-105 cursor-pointer cat-shake ${
                      isVisible
                        ? `opacity-100 translate-x-0`
                        : `opacity-0 translate-x-20`
                    }`}
                    style={{
                      transform: "",
                      transitionDelay: `${
                        ((groupIdx - 6) * 3 + index) * 100
                      }ms`,
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
