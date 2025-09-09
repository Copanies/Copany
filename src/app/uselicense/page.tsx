"use client";
import Button from "@/components/commons/Button";
import BasicNavigation from "@/components/commons/BasicNavigation";
import { ClipboardDocumentIcon } from "@heroicons/react/24/outline";

export default function UseLicensePage() {
  const licenseContent = `Copany Open Source License (COSL) v0.1

Copyright (c) [YYYY] [name of copyright owner]

Permission is hereby granted, free of charge, to any person obtaining a copy of this project and associated materials (the “Project”), to use, modify, distribute, and create derivative works for any purpose, including commercial, provided that:

1. Attribution
   All copies or substantial portions must retain copyright notices, author credits, and this license text.

2. Contribution Tracking
   Contributions (e.g. code, design, documentation) must be publicly recorded in a verifiable and reviewable form. All contributions should be assigned Contribution Points (CP), which must be transparently maintained and accessible to all stakeholders.

3. Revenue Sharing
   If this project or any derivative works generate net revenue, the revenue holder shall:

   - Publicly disclose detailed revenue statements within thirty (30) days of receipt;
   - Distribute revenue in proportion to contribution points within thirty (30) days of receipt;
   - Publicly disclose records of revenue distribution;
   - Provide prior notice to the principal contributors before any commercialization or licensing.

4. Downstream License
   All derivative works must remain under COSL or an equivalent license that preserves attribution, contribution tracking, and revenue sharing obligations.

Non-compliance with these terms results in automatic termination of this license.

THE PROJECT IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED. AUTHORS AND CONTRIBUTORS SHALL NOT BE LIABLE FOR ANY CLAIM OR DAMAGES ARISING FROM USE OF THE PROJECT.

For the latest version and more information, visit:
https://github.com/Copanies/Copany/blob/main/LICENSE`;

  const replaceBracketsContent = `Copany Open Source License (COSL) v0.1

Copyright (c) [YYYY] [name of copyright owner]

Permission is hereby granted, free of charge, to any person obtaining a copy of this project and associated materials (the “Project”), to use, modify, distribute, and create derivative works for any purpose, including commercial, provided that:`;

  return (
    <main className="h-min-screen">
      <BasicNavigation />
      <div className="p-6 max-w-screen-lg mx-auto flex flex-col gap-4 pb-20">
        <Button
          variant="secondary"
          size="md"
          className="!w-fit"
          onClick={() => {
            navigator.clipboard.writeText(licenseContent);
          }}
        >
          <div className="flex flex-row items-center gap-2">
            <ClipboardDocumentIcon className="w-4 h-4" strokeWidth={2} />
            <p>Copy Copany Open Source License v0.1</p>
          </div>
        </Button>
        <pre className="whitespace-pre-wrap break-words font-mono text-sm p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
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
        <pre className="whitespace-pre-wrap break-words font-mono text-sm p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          {replaceBracketsContent}
        </pre>
      </div>
    </main>
  );
}
