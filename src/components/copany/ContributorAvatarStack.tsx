"use client";

import { Copany } from "@/types/database.types";
import Image from "next/image";
import { useContributors } from "@/hooks/contributors";
import { useMemo } from "react";
import { EMPTY_ARRAY, EMPTY_STRING } from "@/utils/constants";

interface ContributorAvatarStackProps {
  copany: Copany;
  className?: string;
  size?: "md" | "lg";
}

export default function ContributorAvatarStack({
  copany,
  size = "md",
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

  const sizeClasses = {
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const width = {
    md: 20,
    lg: 24,
  };
  const height = {
    md: 20,
    lg: 24,
  };

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
            width={width[size]}
            height={height[size]}
            className={`rounded-full ${sizeClasses[size]}`}
          />
        </div>
      ))}
    </div>
  );
}
