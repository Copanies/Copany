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
  // Always start with false to ensure server and client render the same initially
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Mark as client-side after mount
    setIsClient(true);
    
    // Set the correct dark mode value after client-side mount
    const currentDarkMode = checkDarkMode();
    setIsDarkMode(currentDarkMode);

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
  }, []);

  // Return false during SSR and initial client render to avoid hydration mismatch
  return isClient ? isDarkMode : false;
}
