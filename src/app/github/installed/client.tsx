"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import GithubInstalledLoading from "./loading";

export default function GithubInstalledClient({
  copanyId,
}: {
  copanyId: string;
}) {
  const router = useRouter();

  useEffect(() => {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
    const redirectUrl = `${siteUrl}/copany/${copanyId}?tab=Settings`;

    console.log("✅ Installation success, redirecting to:", redirectUrl);

    router.replace(redirectUrl);
  }, [copanyId]);

  return <GithubInstalledLoading />;
}
