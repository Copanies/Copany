"use client";

import { CopanyContributor, Copany } from "@/types/database.types";
import Image from "next/image";
import { useContributors } from "@/hooks/contributors";
import { useMemo } from "react";
import { EMPTY_ARRAY, EMPTY_STRING } from "@/utils/constants";

interface ContributorAvatarStackProps {
  copany: Copany;
  className?: string;
}

export default function ContributorAvatarStack({
  copany,
  className = "",
}: ContributorAvatarStackProps) {
  const { data: contributorsData } = useContributors(copany.id);
  const contributors = contributorsData || EMPTY_ARRAY;

  // create a list of contributors
  const allContributors = useMemo(
    () =>
      [
        // creator always at the first place
        {
          id: copany.created_by,
          name: copany.created_by,
          avatar_url:
            contributors.find((c) => c.user_id === copany.created_by)
              ?.avatar_url || EMPTY_STRING,
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
      ].filter((c) => c.avatar_url),
    [contributors, copany.created_by]
  ); // only show users with avatar

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
