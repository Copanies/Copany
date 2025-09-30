"use client";

import { useSearchParams, useRouter } from "next/navigation";
import GithubInstalledLoading from "./loading";
import Footer from "@/components/commons/Footer";
import { getCopanyByIdAction } from "@/actions/copany.actions";
import { useEffect } from "react";

export default function GithubInstalled() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    async function processInstallation() {
      const state = searchParams.get("state");

      if (!state) {
        console.log("No valid state found");
        return;
      }

      try {
        const decodedState = atob(decodeURIComponent(state));
        const stateObj = JSON.parse(decodedState);

        console.log(
          "Processing GitHub installation for copany:",
          stateObj.copany_id
        );

        const copanyData = await getCopanyByIdAction(stateObj.copany_id);
        if (!copanyData) {
          console.error("Failed to fetch copany:", stateObj.copany_id);
          return;
        }

        // Redirect after successful installation
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
        const redirectUrl = `${siteUrl}/copany/${copanyData.id}?tab=Settings`;
        console.log("✅ Installation success, redirecting to:", redirectUrl);
        router.replace(redirectUrl);
      } catch (err) {
        console.error("GitHub installation error:", err);
      }
    }

    processInstallation();
  }, [searchParams, router]);

  return <GithubInstalledLoading />;
}
