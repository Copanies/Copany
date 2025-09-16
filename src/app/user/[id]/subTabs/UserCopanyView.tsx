"use client";
import CopanyGridView from "@/components/copany/CopanyGridView";
import { useCopaniesWhereUserIsContributor } from "@/hooks/copany";
import LoadingView from "@/components/commons/LoadingView";

export default function UserCopanyView({ userId }: { userId: string }) {
  const { data: copanies, isLoading } =
    useCopaniesWhereUserIsContributor(userId);

  if (isLoading) {
    return <LoadingView type="label" />;
  }

  return (
    <div className="pt-2">
      <CopanyGridView copanies={copanies || []} />
    </div>
  );
}
