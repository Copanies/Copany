"use client";

import { useState, useEffect } from "react";

const LANGUAGE_STORAGE_KEY = "copany-language-preference";
export type SupportedLocale = "zh" | "en";

/**
 * Detect browser language preference
 */
function detectBrowserLanguage(): SupportedLocale {
  if (typeof window === "undefined" || !navigator) {
    return "en";
  }

  const browserLang = navigator.language.toLowerCase();
  const chineseLanguageCodes = ["zh", "zh-cn", "zh-tw", "zh-hk", "zh-sg", "zh-mo"];

  if (chineseLanguageCodes.some((code) => browserLang.startsWith(code))) {
    return "zh";
  }

  return "en";
}

/**
 * Hook to manage language preference
 * Reads from localStorage, falls back to browser language detection
 */
export function useLanguage() {
  const [language, setLanguageState] = useState<SupportedLocale>("en");
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Read from localStorage on client side
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY) as SupportedLocale | null;
      if (stored === "zh" || stored === "en") {
        setLanguageState(stored);
      } else {
        // If no stored preference, detect from browser
        const detected = detectBrowserLanguage();
        setLanguageState(detected);
        // Save detected language to localStorage
        localStorage.setItem(LANGUAGE_STORAGE_KEY, detected);
      }
      setIsInitialized(true);
    }
  }, []);

  const setLanguage = (locale: SupportedLocale) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, locale);
      setLanguageState(locale);
      // Reload page to apply language change
      window.location.reload();
    }
  };

  return {
    language,
    setLanguage,
    isInitialized,
  };
}

