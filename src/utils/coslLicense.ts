import { Copany } from "@/types/database.types";

/**
 * Generate COSL license content for a copany
 */
export function generateCOSLLicense(copany: Copany): string {
  const currentYear = new Date().getFullYear();
  const copanyName = copany.name;
  
  return `Copany Open Source License (COSL) v0.1

Copyright (c) ${currentYear} ${copanyName}

Permission is hereby granted, free of charge, to any person obtaining a copy of this project and associated materials (the "Project"), to use, modify, distribute, and create derivative works for any purpose, including commercial, provided that:

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

THE PROJECT IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED. AUTHORS AND CONTRIBUTORS SHALL NOT BE LIABLE FOR ANY CLAIM OR DAMAGES ARISING FROM USE OF THE PROJECT.

For the latest version and more information, visit:
https://github.com/Copanies/Copany/blob/main/LICENSE`;
}
