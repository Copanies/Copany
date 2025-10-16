"use client";
import CopanyGridView from "@/components/copany/CopanyGridView";
import { useCopaniesWhereUserIsContributor } from "@/hooks/copany";
import LoadingView from "@/components/commons/LoadingView";
import EmptyPlaceholderView from "@/components/commons/EmptyPlaceholderView";
import { ArrowUpRightIcon, SquaresPlusIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";

export default function WorkingOnView({ userId }: { userId: string }) {
  const { data: copanies, isLoading } =
    useCopaniesWhereUserIsContributor(userId);
  const router = useRouter();
  if (isLoading) {
    return <LoadingView type="label" />;
  }

  if (copanies && copanies.length === 0) {
    return (
      <EmptyPlaceholderView
        icon={
          <SquaresPlusIcon
            className="w-16 h-16 text-gray-500 dark:text-gray-400"
            strokeWidth={1}
          />
        }
        title="No copanies found"
        description="You are not a contributor of any copany"
        buttonIcon={<ArrowUpRightIcon className="w-4 h-4" />}
        buttonTitle="View Copanies"
        buttonAction={() => {
          router.push(`/`);
        }}
      />
    );
  }

  return (
    <div className="pt-2">
      <CopanyGridView copanies={copanies || []} />
    </div>
  );
}
