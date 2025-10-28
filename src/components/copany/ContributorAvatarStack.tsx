"use client";

import { Copany } from "@/types/database.types";
import { useContributors } from "@/hooks/contributors";
import { useMemo } from "react";
import { EMPTY_ARRAY, EMPTY_STRING } from "@/utils/constants";
import UserAvatar from "@/components/commons/UserAvatar";

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
  const allContributors = useMemo(() => {
    const creatorContributor = contributors.find(
      (c) => c.user_id === copany.created_by
    );

    return [
      // creator always at the first place
      {
        id: copany.created_by,
        name: creatorContributor?.name || EMPTY_STRING,
        avatar_url: creatorContributor?.avatar_url || EMPTY_STRING,
        email: creatorContributor?.email || null,
        isCreator: true,
      },
      // contributors sorted by contribution (excluding creator)
      ...contributors
        .filter((c) => c.user_id !== copany.created_by)
        .sort((a, b) => b.contribution - a.contribution)
        .slice(0, 2) // only take the top 2 contributors (including creator)
        .map((c) => ({
          id: c.user_id,
          name: c.name,
          avatar_url: c.avatar_url,
          email: c.email,
          isCreator: false,
        })),
    ].filter((c) => c.avatar_url);
  }, [contributors, copany.created_by]); // only show users with avatar

  return (
    <div className={`flex -space-x-[6px] ${className}`}>
      {allContributors.map((contributor, index) => (
        <div
          key={contributor.id}
          className="relative flex items-center"
          style={{
            zIndex: allContributors.length - index, // ensure the left avatar is on top
          }}
        >
          <UserAvatar
            userId={contributor.id}
            name={contributor.name || ""}
            avatarUrl={contributor.avatar_url || null}
            email={contributor.email}
            size={size === "md" ? "sm" : "md"}
            showTooltip={true}
          />
        </div>
      ))}
    </div>
  );
}
