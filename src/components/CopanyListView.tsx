"use client";
import { useEffect } from "react";
import { CopanyWithUser } from "@/types/types";
import { useState } from "react";
import { deleteCopany, getCopanies } from "@/services/copanyFuncs";
import Image from "next/image";
import CreateCopanyView from "./CreateCopanyView";
import { useRouter } from "next/navigation";

export default function CopanyListView() {
  const [copanies, setCopanies] = useState<CopanyWithUser[]>([]);
  const [status, setStatus] = useState<"loading" | "failed" | "success">(
    "loading"
  );
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchCopanies = async () => {
      try {
        const copanies = await getCopanies();
        setCopanies(copanies);
        setStatus("success");
      } catch (error: unknown) {
        console.error("Error fetching copanies", error);
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError("Unknown error");
        }
        setStatus("failed");
      }
    };

    fetchCopanies();
  }, []);

  // --- View ---

  if (status === "loading") {
    return <div className="text-sm font-bold">Loading...</div>;
  }

  if (status === "failed") {
    return <div className="text-sm font-bold">Error: {error}</div>;
  }

  return (
    <div className="flex flex-col gap-2">
      <CreateCopanyView />
      <ul className="space-y-6">
        {copanies.map((copany) => (
          <li key={copany.id} className="space-y-2">
            <div
              onClick={() => {
                router.push(`/copany/${copany.id}`);
              }}
              className="cursor-pointer"
            >
              {copany.organization_avatar_url && (
                <Image
                  src={copany.organization_avatar_url}
                  alt={"Organization Avatar"}
                  className="w-32 h-32 border-1 border-gray-300 dark:border-gray-700"
                  width={100}
                  height={100}
                />
              )}
              <div className="font-medium text-lg">{copany.name}</div>
            </div>
            <div className="">{copany.description}</div>
            <div className="text-sm">ID: {copany.id}</div>
            <div className="text-sm">
              github_url:{" "}
              <a
                href={copany.github_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {copany.github_url}
              </a>
            </div>
            <div className="text-sm">project_type: {copany.project_type}</div>
            <div className="text-sm">project_stage: {copany.project_stage}</div>
            <div className="text-sm">main_language: {copany.main_language}</div>
            <div className="text-sm">license: {copany.license}</div>
            <div className="text-sm">created_at: {copany.created_at}</div>
            <div className="text-sm">updated_at: {copany.updated_at}</div>
            <div className="text-sm">created_by: {copany.created_by}</div>
            <div className="text-sm">
              created_by_name: {copany.created_by_name}
            </div>
            {/* <button
              onClick={async () => {
                await handleEdit(copany.id);
              }}
              className="text-black hover:text-gray-800 transition-colors cursor-pointer"
            >
              edit
            </button> */}
            <button
              onClick={async () => {
                await deleteCopany(copany.id);
                setCopanies(copanies.filter((c) => c.id !== copany.id));
              }}
              className="cursor-pointer rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 border-1 border-gray-300 px-2"
            >
              delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
