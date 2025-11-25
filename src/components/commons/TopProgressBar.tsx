"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import NProgress from "nprogress";
import "nprogress/nprogress.css";

// Configure NProgress
NProgress.configure({
  showSpinner: false,
  trickleSpeed: 200,
  minimum: 0.08,
  easing: "ease",
  speed: 300,
});

// Global state for progress bar delay mechanism
let showProgressTimer: NodeJS.Timeout | null = null;
let navigationStartTime: number | null = null;
const MIN_LOAD_TIME = 1000; // Minimum time (ms) before showing progress bar

// Global progress bar manager
export const progressBarManager = {
  start: () => {
    if (typeof window !== "undefined") {
      navigationStartTime = Date.now();
      // Clear any existing timer
      if (showProgressTimer) {
        clearTimeout(showProgressTimer);
      }
      // Delay showing progress bar - only show if loading takes longer than MIN_LOAD_TIME
      showProgressTimer = setTimeout(() => {
        NProgress.start();
        showProgressTimer = null;
      }, MIN_LOAD_TIME);
    }
  },
  done: () => {
    if (typeof window !== "undefined") {
      // Clear the delay timer if navigation completed quickly
      if (showProgressTimer) {
        clearTimeout(showProgressTimer);
        showProgressTimer = null;
      }
      // Check if navigation was fast (less than MIN_LOAD_TIME)
      const duration = navigationStartTime
        ? Date.now() - navigationStartTime
        : 0;
      if (duration < MIN_LOAD_TIME) {
        // Navigation completed quickly, don't show progress bar
        NProgress.done();
        navigationStartTime = null;
        return;
      }
      // Navigation took longer, ensure progress bar is completed
      NProgress.done();
      navigationStartTime = null;
    }
  },
  getNavigationStartTime: () => navigationStartTime,
};

export default function TopProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirstRender = useRef(true);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isNavigatingRef = useRef(false);
  const previousPathnameRef = useRef<string>(pathname);

  useEffect(() => {
    // Intercept window.history.pushState and replaceState to catch all navigation
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    // Helper function to extract pathname from URL string
    const getPathname = (url: string): string => {
      if (!url) return window.location.pathname;
      // If it's a relative path starting with /, extract pathname before ?
      if (url.startsWith("/")) {
        const pathPart = url.split("?")[0].split("#")[0];
        return pathPart;
      }
      // If it's a full URL, try to parse it
      try {
        const urlObj = new URL(url, window.location.origin);
        return urlObj.pathname;
      } catch {
        // If parsing fails, extract pathname manually
        const pathPart = url.split("?")[0].split("#")[0];
        return pathPart.startsWith("/") ? pathPart : window.location.pathname;
      }
    };

    window.history.pushState = function (...args) {
      // Check if this is a navigation to a different path (ignore query params)
      const currentPath = window.location.pathname;
      const newUrl = args[2]?.toString() || "";
      const newPath = getPathname(newUrl);
      // Only trigger progress bar if pathname actually changed
      if (newPath && newPath !== currentPath && !isNavigatingRef.current) {
        isNavigatingRef.current = true;
        progressBarManager.start();
      }
      return originalPushState.apply(window.history, args);
    };

    window.history.replaceState = function (...args) {
      // Don't trigger progress bar for replaceState (used for tab switching)
      // replaceState is typically used for URL parameter changes, not path changes
      return originalReplaceState.apply(window.history, args);
    };

    // Listen for Link clicks - delay showing progress bar
    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest("a[href]");
      if (link) {
        const href = link.getAttribute("href");
        // Handle internal links (starting with /) and relative links
        if (
          href &&
          (href.startsWith("/") ||
            (!href.startsWith("http") &&
              !href.startsWith("mailto:") &&
              !href.startsWith("tel:"))) &&
          !href.startsWith("#") &&
          !link.hasAttribute("target") &&
          !link.hasAttribute("download")
        ) {
          isNavigatingRef.current = true;
          progressBarManager.start();
        }
      }
    };

    // Listen for custom navigation events
    const handleNavigationStart = () => {
      isNavigatingRef.current = true;
      progressBarManager.start();
    };

    const handleNavigationEnd = () => {
      isNavigatingRef.current = false;
      if (progressTimerRef.current) {
        clearTimeout(progressTimerRef.current);
      }
      progressTimerRef.current = setTimeout(() => {
        NProgress.done();
      }, 100);
    };

    // Listen for popstate (back/forward button)
    const handlePopState = () => {
      // Only start progress bar if not already navigating (avoid double trigger)
      if (!isNavigatingRef.current) {
        isNavigatingRef.current = true;
        progressBarManager.start();
      }
      // Progress bar will be completed when pathname changes in useEffect
    };

    // Add event listeners
    document.addEventListener("click", handleLinkClick, true);
    window.addEventListener("navigationstart", handleNavigationStart);
    window.addEventListener("navigationend", handleNavigationEnd);
    window.addEventListener("popstate", handlePopState);

    return () => {
      // Restore original functions
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      document.removeEventListener("click", handleLinkClick, true);
      window.removeEventListener("navigationstart", handleNavigationStart);
      window.removeEventListener("navigationend", handleNavigationEnd);
      window.removeEventListener("popstate", handlePopState);
      if (progressTimerRef.current) {
        clearTimeout(progressTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Skip progress bar on first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      isNavigatingRef.current = false;
      previousPathnameRef.current = pathname;
      return;
    }

    // Only trigger progress bar completion if pathname actually changed
    // Tab switching (searchParams change) should not trigger progress bar
    const pathnameChanged = previousPathnameRef.current !== pathname;
    previousPathnameRef.current = pathname;

    if (!pathnameChanged) {
      // Only searchParams changed (tab switching), don't show progress bar
      return;
    }

    // Mark navigation as complete
    isNavigatingRef.current = false;

    // Clear any existing timer
    if (progressTimerRef.current) {
      clearTimeout(progressTimerRef.current);
    }

    // Complete progress bar (will check if it should be shown based on duration)
    progressBarManager.done();

    // Complete progress bar after route change is complete
    // Use requestAnimationFrame to ensure DOM has updated
    const completeProgress = () => {
      progressTimerRef.current = setTimeout(() => {
        NProgress.done();
      }, 100);
    };

    // Use requestAnimationFrame to wait for next frame
    requestAnimationFrame(() => {
      requestAnimationFrame(completeProgress);
    });

    return () => {
      if (progressTimerRef.current) {
        clearTimeout(progressTimerRef.current);
      }
      NProgress.done();
    };
  }, [pathname, searchParams]);

  return null;
}
