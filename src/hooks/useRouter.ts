"use client";

import { useRouter as useNextRouter } from "next/navigation";
import { useCallback } from "react";
import { progressBarManager } from "@/components/commons/TopProgressBar";

/**
 * Wrapper around next/navigation useRouter that automatically triggers progress bar
 * Use this instead of importing useRouter directly from "next/navigation"
 */
export function useRouter() {
  const router = useNextRouter();

  const push = useCallback(
    (href: string, options?: { scroll?: boolean }) => {
      // Start progress bar immediately when navigation starts
      progressBarManager.start();
      // Dispatch custom event for immediate feedback
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("navigationstart"));
      }
      return router.push(href, options);
    },
    [router]
  );

  const replace = useCallback(
    (href: string, options?: { scroll?: boolean }) => {
      // Start progress bar immediately when navigation starts
      progressBarManager.start();
      // Dispatch custom event for immediate feedback
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("navigationstart"));
      }
      return router.replace(href, options);
    },
    [router]
  );

  const back = useCallback(() => {
    // Start progress bar immediately when navigation starts
    progressBarManager.start();
    // Dispatch custom event for immediate feedback
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("navigationstart"));
    }
    return router.back();
  }, [router]);

  return {
    ...router,
    push,
    replace,
    back,
  };
}

