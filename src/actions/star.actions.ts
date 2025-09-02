"use server";

import { StarService } from "@/services/star.service";

export async function getStarCountAction(copanyId: string) {
  return StarService.getStarCount(copanyId);
}

export async function hasStarredAction(copanyId: string) {
  return StarService.hasStarred(copanyId);
}

export async function listMyStarredCopanyIdsAction() {
  return StarService.listStarredCopanyIds();
}

export async function starAction(copanyId: string) {
  await StarService.star(copanyId);
  return { success: true } as const;
}

export async function unstarAction(copanyId: string) {
  await StarService.unstar(copanyId);
  return { success: true } as const;
}


