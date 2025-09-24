"use client";

import BasicNavigation from "@/components/commons/BasicNavigation";
import { generateCOSLLicense } from "@/utils/coslLicense";

export default function LicensePage() {
  const licenseContent = generateCOSLLicense("Copany");

  return (
    <div className="flex flex-col min-h-screen items-center bg-[#FBF9F5] dark:bg-background-dark gap-4">
      <BasicNavigation />
      <main className="h-min-screen p-6 max-w-screen-lg mx-auto flex flex-col gap-4 pb-20 pure_html">
        <pre className="whitespace-pre-wrap break-words font-mono text-sm p-4 bg-transparent rounded-lg">
          {licenseContent}
        </pre>
      </main>
    </div>
  );
}
