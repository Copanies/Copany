"use client";
import { Copany } from "@/types/database.types";
import Image from "next/image";
import { useRouter } from "next/navigation";
import AssetLinksSection from "@/components/AssetLinksSection";
import ContributorAvatarStack from "@/components/ContributorAvatarStack";
import LicenseBadge from "@/components/commons/LicenseBadge";
import StarButton from "@/components/StarButton";

interface CopanyGridViewProps {
  copanies: Copany[];
}

/**
 * Copany grid view component - Pure rendering component
 */
export default function CopanyGridView({ copanies }: CopanyGridViewProps) {
  const router = useRouter();
  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-8 pb-10 max-w-[820px] justify-center mx-auto">
      {copanies.map((copany) => (
        <li
          key={copany.id}
          className="cursor-pointer sm:mx-0"
          onClick={() => {
            router.push(`/copany/${copany.id}`);
          }}
        >
          <div className="flex flex-col gap-4 h-full">
            <div className="flex flex-col gap-2">
              {/* Different layouts based on whether cover image exists */}
              <div className="relative flex flex-col items-center justify-center gap-2 p-8 rounded-[20px] overflow-hidden aspect-[1.8]">
                {copany.cover_image_url ? (
                  <>
                    {/* Cover image layout: fill the space, no blur, logo in top-left */}
                    <Image
                      src={copany.cover_image_url}
                      alt="Organization Cover"
                      fill
                      className="object-cover w-full h-full"
                      style={{ objectPosition: "center" }}
                      sizes="100vw"
                      priority
                    />
                    {/* Foreground logo in top-left corner */}
                    {copany.logo_url && (
                      <div className="absolute top-3 left-3 z-10">
                        <Image
                          src={copany.logo_url}
                          alt="Organization Avatar"
                          className="rounded-lg object-contain"
                          width={64}
                          height={64}
                          priority
                        />
                      </div>
                    )}
                  </>
                ) : copany.logo_url ? (
                  <>
                    {/* Logo-only layout: 200% width, blur background */}
                    <div
                      className="absolute left-1/2 top-0 z-0 pointer-events-none select-none"
                      style={{
                        width: "200%",
                        height: "200%",
                        transform: "translateX(-50%) translateY(-25%)",
                        overflow: "hidden",
                      }}
                    >
                      <Image
                        src={copany.logo_url}
                        alt="Organization Background"
                        fill
                        className="object-contain w-full h-full blur-[100px]"
                        style={{ objectPosition: "center", opacity: 0.7 }}
                        sizes="200vw"
                        priority
                      />
                    </div>
                    {/* Foreground logo, centered */}
                    <div className="relative z-10 flex items-center justify-center w-full h-auto max-h-32">
                      <Image
                        src={copany.logo_url}
                        alt="Organization Avatar"
                        className="rounded-lg object-contain"
                        width={128}
                        height={128}
                        priority
                      />
                    </div>
                  </>
                ) : null}
              </div>
              <div className="flex flex-row items-center gap-2">
                <div className="font-semibold text-lg">{copany.name}</div>
                <AssetLinksSection copany={copany} size="sm" />
                {/* {copany.license && (
                  <div className="hidden sm:block">
                    <LicenseBadge
                      license={copany.license}
                      isOwner={copany.created_by === currentUser?.id}
                    />
                  </div>
                )} */}
                <div className="ml-auto flex items-center gap-2">
                  <ContributorAvatarStack copany={copany} size="lg" />
                  <StarButton
                    copanyId={String(copany.id)}
                    size="sm"
                    count={copany.star_count}
                  />
                </div>
              </div>
              <div className="">{copany.description || "No description"}</div>
              {copany.license && (
                <div className="">
                  <LicenseBadge license={copany.license} />
                </div>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
