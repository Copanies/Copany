"use server";

import { getCurrentUser } from "@/actions/auth.actions";
import { generateAndUploadUserAvatar, generateRandomCatAvatar, updateUserAvatarWithSvg, updateUserAvatarWithFile } from "@/services/avatar.service";

/**
 * Generate and upload a new avatar for the current user
 */
export async function generateUserAvatarAction() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("User not authenticated");
  }

  const avatarUrl = await generateAndUploadUserAvatar(user.id);
  if (!avatarUrl) {
    throw new Error("Failed to generate avatar");
  }

  return { success: true, avatar_url: avatarUrl };
}

export async function generateRandomCatAvatarAction() : Promise<string> {
  const avatarSVG = generateRandomCatAvatar();
  return avatarSVG;
}

export async function updateUserAvatarWithSvgAction(userId: string, avatarUrl: string) {
  return await updateUserAvatarWithSvg(userId, avatarUrl);
}

export async function updateUserAvatarWithFileAction(userId: string, file: File) {
  return await updateUserAvatarWithFile(userId, file);
}

