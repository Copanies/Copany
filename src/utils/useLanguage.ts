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

  // Get browser language preferences
  const primaryLanguage = navigator.language;
  
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

  return isChinesePreferred ? "zh" : "en";
}

/**
 * Get initial language from localStorage or browser detection
 * Used for initial state to avoid flash of wrong language
 */
function getInitialLanguage(): SupportedLocale {
  if (typeof window === "undefined") {
    return "en";
  }
  
  // Try to read from localStorage first
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY) as SupportedLocale | null;
  if (stored === "zh" || stored === "en") {
    return stored;
  }
  
  // If no stored preference, detect from browser
  return detectBrowserLanguage();
}

/**
 * Hook to manage language preference
 * Reads from localStorage, falls back to browser language detection
 */
export function useLanguage() {
  const [language, setLanguageState] = useState<SupportedLocale>(getInitialLanguage());
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

