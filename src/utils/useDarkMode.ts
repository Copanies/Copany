import { useState, useEffect } from "react";

/**
 * Detect if current mode is dark mode
 */
function checkDarkMode(): boolean {
  if (typeof window === "undefined") return false;

  const htmlElement = document.documentElement;
  return (
    htmlElement.classList.contains("dark") ||
    (window.matchMedia("(prefers-color-scheme: dark)").matches &&
      !htmlElement.classList.contains("light"))
  );
}

/**
 * Custom hook for detecting dark mode state
 * Unifies dark mode detection logic across the project
 * Uses lazy initialization to avoid delay issues
 */
export function useDarkMode(): boolean {
  // Use lazy initialization to get the correct value on first render
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Return false during server-side rendering to avoid hydration mismatch
    if (typeof window === "undefined") return false;
    return checkDarkMode();
  });

  useEffect(() => {
    // Immediately sync state after client-side mount to ensure correctness
    const currentDarkMode = checkDarkMode();
    if (currentDarkMode !== isDarkMode) {
      setIsDarkMode(currentDarkMode);
    }

    // Listen for system preference changes
    const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => setIsDarkMode(checkDarkMode());

    darkModeQuery.addEventListener("change", handleChange);

    // Monitor HTML element class changes (manual theme switching)
    const observer = new MutationObserver(handleChange);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // Cleanup function
    return () => {
      darkModeQuery.removeEventListener("change", handleChange);
      observer.disconnect();
    };
  }, [isDarkMode]);

  return isDarkMode;
}
