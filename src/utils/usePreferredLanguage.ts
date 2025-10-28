"use client";

import { useState, useEffect } from "react";

interface PreferredLanguageResult {
  isChinesePreferred: boolean;
  locale: string;
}

/**
 * Hook to detect user's preferred language from browser settings
 * @returns Object containing whether Chinese is preferred and the detected locale
 */
export function usePreferredLanguage(): PreferredLanguageResult {
  const [result, setResult] = useState<PreferredLanguageResult>({
    isChinesePreferred: false,
    locale: "en",
  });

  useEffect(() => {
    // Check if we're in browser environment
    if (typeof window === "undefined" || !navigator) {
      console.log("[usePreferredLanguage] ⚠️ Not in browser environment, using default values");
      return;
    }

    // Get browser language preferences
    const primaryLanguage = navigator.language;
    const allLanguages = navigator.languages || [primaryLanguage];

    console.log("[usePreferredLanguage] 🌐 Browser language preferences:", {
      primaryLanguage,
      allLanguages,
      userAgent: navigator.userAgent.substring(0, 100) + "...", // Truncate for privacy
    });

    // Check if the primary preferred language is Chinese
    const chineseLanguageCodes = [
      "zh", // Generic Chinese
      "zh-CN", // Simplified Chinese (China)
      "zh-TW", // Traditional Chinese (Taiwan)
      "zh-HK", // Traditional Chinese (Hong Kong)
      "zh-SG", // Simplified Chinese (Singapore)
      "zh-MO", // Traditional Chinese (Macau)
    ];

    // Only check the primary language (navigator.language), not all languages
    const isChinesePreferred = chineseLanguageCodes.some((chineseCode) =>
      primaryLanguage.toLowerCase().startsWith(chineseCode.toLowerCase())
    );

    console.log("[usePreferredLanguage] 🔍 Language detection result:", {
      isChinesePreferred,
      detectedLocale: primaryLanguage,
      matchedChineseCode: chineseLanguageCodes.find((chineseCode) =>
        primaryLanguage.toLowerCase().startsWith(chineseCode.toLowerCase())
      ) || null,
    });

    setResult({
      isChinesePreferred,
      locale: primaryLanguage,
    });

    console.log("[usePreferredLanguage] ✅ Language preference set:", {
      isChinesePreferred,
      locale: primaryLanguage,
    });
  }, []);

  return result;
}
