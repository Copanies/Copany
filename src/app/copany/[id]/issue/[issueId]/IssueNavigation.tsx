"use client";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import Button from "@/components/commons/Button";

export default function IssueNavigation() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const handleBack = () => {
    // Build return URL, keep tab and subtab parameters
    const copanyId = params.id;
    const tab = searchParams.get("tab") || "Cooperate";
    const subtab = searchParams.get("subtab") || "Issue";

    const backUrl = `/copany/${copanyId}?tab=${tab}&subtab=${subtab}`;
    router.push(backUrl);
  };

  return (
    <div className="max-w-screen-lg mx-auto flex flex-row items-center justify-between p-3">
      <Button variant="primary" size="md" shape="square" onClick={handleBack}>
        <ChevronLeftIcon className="w-3 h-3 text-gray-900 dark:text-gray-100" />
      </Button>
    </div>
  );
}
