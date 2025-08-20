"use client";

import { CopanyContributor, Copany } from "@/types/database.types";
import Image from "next/image";
import { contributorsManager } from "@/utils/cache/managers/ContributorsManager";
import { useEffect, useState } from "react";

interface ContributorAvatarStackProps {
  copany: Copany;
  className?: string;
}

export default function ContributorAvatarStack({
  copany,
  className = "",
}: ContributorAvatarStackProps) {
  const [contributors, setContributors] = useState<CopanyContributor[]>([]);

  useEffect(() => {
    const loadContributors = async () => {
      const data = await contributorsManager.getContributors(copany.id);
      setContributors(data);
    };
    loadContributors();
  }, [copany.id]);

  // Subscribe to cache updates for contributors so avatars stay fresh
  useEffect(() => {
    const onCacheUpdated = (e: Event) => {
      try {
        const detail = (e as CustomEvent).detail as {
          manager: string;
          key: string;
          data: unknown;
        };
        if (!detail) return;
        if (
          detail.manager === "ContributorsManager" &&
          String(detail.key) === String(copany.id)
        ) {
          setContributors(
            Array.isArray(detail.data)
              ? (detail.data as CopanyContributor[])
              : []
          );
        }
      } catch (_) {}
    };
    if (typeof window !== "undefined") {
      window.addEventListener("cache:updated", onCacheUpdated as EventListener);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(
          "cache:updated",
          onCacheUpdated as EventListener
        );
      }
    };
  }, [copany.id]);

  // create a list of contributors
  const allContributors = [
    // creator always at the first place
    {
      id: copany.created_by,
      name: copany.created_by,
      avatar_url:
        contributors.find((c) => c.user_id === copany.created_by)?.avatar_url ||
        "",
      isCreator: true,
    },
    // contributors sorted by contribution (excluding creator)
    ...contributors
      .filter((c) => c.user_id !== copany.created_by)
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, 2) // only take the top 2 contributors (including creator)
      .map((c) => ({
        id: c.user_id,
        avatar_url: c.avatar_url,
        isCreator: false,
      })),
  ].filter((c) => c.avatar_url); // only show users with avatar

  return (
    <div className={`flex -space-x-[6px] ${className}`}>
      {allContributors.map((contributor, index) => (
        <div
          key={contributor.id}
          className="relative"
          style={{
            zIndex: allContributors.length - index, // ensure the left avatar is on top
          }}
        >
          <Image
            src={contributor.avatar_url}
            alt={`${contributor.isCreator ? "Creator" : "Contributor"}`}
            width={20}
            height={20}
            className="rounded-full"
          />
        </div>
      ))}
    </div>
  );
}
