"use client";

import {
  ArrowUpRightIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import Button from "@/components/commons/Button";
import { useRouter } from "next/navigation";

export default function CoslLicenseTip({ isOwner }: { isOwner: boolean }) {
  const router = useRouter();

  return (
   
      <div className="flex flex-row gap-2">
        <div className="flex items-center justify-center h-6">
          <ExclamationTriangleIcon
            className="w-5 h-5 text-yellow-600"
            strokeWidth={2}
          />
        </div>
        <div className="flex-1 flex flex-col gap-1">
          {isOwner ? (
            <>
              <p className="text-base font-semibold">
                Your Copany has not adopted the COSL License.
              </p>
              <p className="text-base">
                This means contributors’ rights to revenue sharing may not be
                guaranteed, which could affect their willingness to participate.
                We recommend adding a LICENSE file in the root directory of your
                repository and declaring COSL.
              </p>
            </>
          ) : (
            <>
              <p className="text-base font-semibold">
                This Copany has not adopted the COSL License.
              </p>
              <p className="text-base">
                Your rights to revenue sharing may not be guaranteed.
              </p>
            </>
          )}
          <div className="flex -ml-2">
            <Button
              variant="ghost"
              size="md"
              className="!w-fit !text-nowrap"
              onClick={() => router.push("/uselicense")}
            >
              <div className="flex flex-row items-center gap-2">
                <ArrowUpRightIcon className="w-4 h-4" strokeWidth={2} />
                <p className="!text-nowrap font-semiblod">
                  {isOwner
                    ? "How to use COSL License"
                    : "What is the COSL License"}
                </p>
              </div>
            </Button>
          </div>
        </div>
      </div>
  );
}
