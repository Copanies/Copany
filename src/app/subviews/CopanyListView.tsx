"use client";
import { Copany } from "@/types/database.types";
import Image from "next/image";
import { useRouter } from "next/navigation";
import AssetLinksSection from "@/components/AssetLinksSection";
import ContributorAvatarStack from "@/components/ContributorAvatarStack";
import LicenseBadge from "@/components/commons/LicenseBadge";
import StarButton from "@/components/StarButton";
import { useCurrentUser } from "@/hooks/currentUser";

interface CopanyListViewProps {
  copanies: Copany[];
}

/**
 * Copany list view component - Pure rendering component
 */
export default function CopanyListView({ copanies }: CopanyListViewProps) {
  const router = useRouter();
  const { data: currentUser } = useCurrentUser();
  return (
    <ul className="space-y-6">
      {copanies.map((copany, index) => (
        <li
          key={copany.id}
          className="cursor-pointer"
          onClick={() => {
            router.push(`/copany/${copany.id}`);
          }}
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex flex-row items-center gap-2">
                {copany.logo_url && (
                  <Image
                    src={copany.logo_url}
                    alt={"Organization Avatar"}
                    className="w-8 h-8 rounded-md"
                    width={32}
                    height={32}
                  />
                )}
                <div className="font-semibold text-base">{copany.name}</div>
                <AssetLinksSection copany={copany} size="sm" />
                {copany.license && (
                  <div className="hidden sm:block">
                    <LicenseBadge license={copany.license} />
                  </div>
                )}
                <div className="ml-auto flex items-center gap-2">
                  <ContributorAvatarStack copany={copany} />
                  <StarButton
                    copanyId={String(copany.id)}
                    size="sm"
                    count={copany.star_count}
                  />
                </div>
              </div>
              <div className="">{copany.description || "No description"}</div>
              {copany.license && (
                <div className="block sm:hidden">
                  <LicenseBadge license={copany.license} />
                </div>
              )}
            </div>
            {index !== copanies.length - 1 && (
              <div className="w-full h-px bg-gray-200 dark:bg-gray-800" />
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
