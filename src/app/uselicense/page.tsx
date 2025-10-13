"use client";
import Button from "@/components/commons/Button";
import BasicNavigation from "@/components/commons/BasicNavigation";
import Footer from "@/components/commons/Footer";
import { ClipboardDocumentIcon } from "@heroicons/react/24/outline";
import { generateCOSLLicense } from "@/utils/coslLicense";

export default function UseLicensePage() {
  const currentYear = new Date().getFullYear();
  const licenseContent = generateCOSLLicense("[name of copyright owner]");

  const replaceBracketsContent = `Copany Open Source License (COSL) v0.1

Copyright (c) ${currentYear} [name of copyright owner] Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy of this project and associated materials (the “Project”), to use, modify, distribute, and create derivative works for any purpose, including commercial, provided that:`;

  return (
    <main className="min-h-screen bg-[#FBF9F5] dark:bg-background-dark">
      <BasicNavigation />
      <div className="p-6 max-w-screen-lg mx-auto flex flex-col gap-4 pb-20">
        <Button
          variant="primary"
          size="md"
          className="!w-fit"
          onClick={() => {
            navigator.clipboard.writeText(licenseContent);
          }}
        >
          <div className="flex flex-row items-center gap-2">
            <ClipboardDocumentIcon className="w-4 h-4" strokeWidth={2} />
            <p>Copy License</p>
          </div>
        </Button>
        <pre className="whitespace-pre-wrap break-words font-mono text-sm p-4 border border-gray-200 dark:border-gray-800 bg-transparent rounded-lg">
          {licenseContent}
        </pre>
        <p className="text-lg font-semibold">
          How to apply the Copany Open Source License to your work
        </p>
        <p className="text-base">
          To apply the Copany Open Source License to your project, create a new
          file named <span className="font-mono">LICENSE</span> in the root
          directory of your code repository. This file should contain the full
          text of the Copany Open Source License, with the fields enclosed in
          brackets <span className="font-mono">“[]”</span> replaced by your own
          identifying information. (Do not include the brackets in your final
          text.)
        </p>
        <pre className="whitespace-pre-wrap break-words font-mono text-sm p-4 border border-gray-200 dark:border-gray-800 bg-transparent rounded-lg">
          {replaceBracketsContent}
        </pre>
      </div>
      <Footer />
    </main>
  );
}
