"use client";

import { useEffect, useRef } from "react";
import {
  usePathname,
  useSearchParams,
  useSelectedLayoutSegment,
} from "next/navigation";
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
let isProgressBarActive: boolean = false;
let isNavigationComplete: boolean = false;
const MIN_LOAD_TIME = 1000; // Minimum time (ms) before showing progress bar

// Global progress bar manager
export const progressBarManager = {
  start: () => {
    if (typeof window !== "undefined") {
      navigationStartTime = Date.now();
      isProgressBarActive = false;
      isNavigationComplete = false;
      // Clear any existing timer
      if (showProgressTimer) {
        clearTimeout(showProgressTimer);
        showProgressTimer = null;
      }
      // Delay showing progress bar - only show if loading takes longer than MIN_LOAD_TIME
      showProgressTimer = setTimeout(() => {
        // Only start progress bar if navigation is still in progress and not completed
        if (navigationStartTime !== null && !isNavigationComplete) {
          isProgressBarActive = true;
          NProgress.start();
        }
        showProgressTimer = null;
      }, MIN_LOAD_TIME);
    }
  },
  done: () => {
    if (typeof window !== "undefined") {
      // Immediately mark navigation as complete to prevent timer from starting progress bar
      isNavigationComplete = true;
      navigationStartTime = null;

      // Clear the delay timer if navigation completed quickly
      if (showProgressTimer) {
        clearTimeout(showProgressTimer);
        showProgressTimer = null;
      }

      // If progress bar was already started, stop it
      if (isProgressBarActive) {
        NProgress.done();
        isProgressBarActive = false;
      }
    }
  },
  getNavigationStartTime: () => navigationStartTime,
};

export default function TopProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Monitor slot segments to detect parallel route changes (e.g., @issue_slot, @discussion_slot)
  const issueSegment = useSelectedLayoutSegment("issue_slot");
  const discussionSegment = useSelectedLayoutSegment("discussion_slot");
  const isFirstRender = useRef(true);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isNavigatingRef = useRef(false);
  const previousPathnameRef = useRef<string>(pathname);
  const previousIssueSegmentRef = useRef<string | null>(null);
  const previousDiscussionSegmentRef = useRef<string | null>(null);

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
      // Also check if navigation is already in progress via progressBarManager
      if (
        !isNavigatingRef.current &&
        progressBarManager.getNavigationStartTime() === null
      ) {
        isNavigatingRef.current = true;
        progressBarManager.start();
      }

      // Fallback for Discussion router.back() scenario:
      // When router.back() is called from Discussion, popstate fires immediately
      // but React state (pathname/segments) may update with delay.
      // Wait a bit for React state to update (useEffect should handle it),
      // but if navigation is still in progress after delay, call done() as fallback.
      if (progressBarManager.getNavigationStartTime() !== null) {
        setTimeout(() => {
          // Check if navigation is still in progress
          // If React state updated, useEffect should have called done() by now
          // If not, we need to call done() to prevent the 1s timer from firing
          if (progressBarManager.getNavigationStartTime() !== null) {
            progressBarManager.done();
            isNavigatingRef.current = false;
          }
        }, 200);
      }

      // Progress bar will also be completed when pathname or slot segments change in useEffect
      // The useEffect hook monitors both pathname and slot segments (issueSegment, discussionSegment)
      // So it will detect when slots close (segment changes from value to null) and call done()
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
      previousIssueSegmentRef.current = issueSegment;
      previousDiscussionSegmentRef.current = discussionSegment;
      return;
    }

    // Check if pathname changed
    const pathnameChanged = previousPathnameRef.current !== pathname;
    // Check if slot segments changed (for parallel routes)
    const issueSegmentChanged =
      previousIssueSegmentRef.current !== issueSegment;
    const discussionSegmentChanged =
      previousDiscussionSegmentRef.current !== discussionSegment;

    // Update refs
    previousPathnameRef.current = pathname;
    previousIssueSegmentRef.current = issueSegment;
    previousDiscussionSegmentRef.current = discussionSegment;

    // Only trigger progress bar completion if pathname or slot segments changed
    // Tab switching (searchParams change only) should not trigger progress bar
    if (!pathnameChanged && !issueSegmentChanged && !discussionSegmentChanged) {
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
  }, [pathname, searchParams, issueSegment, discussionSegment]);

  return null;
}
