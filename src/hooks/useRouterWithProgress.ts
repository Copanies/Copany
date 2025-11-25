"use client";

import { useRouter as useNextIntlRouter } from "@/i18n/routing";
import { useCallback } from "react";
import { progressBarManager } from "@/components/commons/TopProgressBar";

export function useRouterWithProgress() {
  const router = useNextIntlRouter();

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

  return {
    ...router,
    push,
    replace,
  };
}

