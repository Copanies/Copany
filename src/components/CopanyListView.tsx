"use client";
import { useEffect } from "react";
import { Copany, CopanyWithUser } from "@/types/types";
import { useState } from "react";
import {
  createCopany,
  deleteCopany,
  getCopanies,
} from "@/services/copanyFuncs";
import Image from "next/image";

export default function CopanyListView() {
  const [copanies, setCopanies] = useState<CopanyWithUser[]>([]);
  const [status, setStatus] = useState<"loading" | "failed" | "success">(
    "loading"
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCopanies()
      .then((copanies) => {
        const typedCopanies: CopanyWithUser[] = copanies.map((copany) => {
          const item: CopanyWithUser = {
            id: Number(copany.id),
            github_url: String(copany.github_url),
            name: String(copany.name),
            description: String(copany.description),
            created_by: String(copany.created_by),
            created_by_name: String(copany.created_by_name),
            organization_avatar_url: copany.organization_avatar_url
              ? String(copany.organization_avatar_url)
              : null,
            project_type: String(copany.project_type),
            project_stage: String(copany.project_stage),
            main_language: String(copany.main_language),
            license: String(copany.license),
            created_at: String(copany.created_at),
            updated_at: copany.updated_at ? String(copany.updated_at) : null,
          };
          return item;
        });
        setCopanies(typedCopanies);
        setStatus("success");
      })
      .catch((error) => {
        setError(error.message);
        setStatus("failed");
      });
  }, []);

  async function handleCreateCopany(formData: FormData) {
    console.log(
      "handleCreateCopany",
      formData.values(),
      formData.get("github_url")
    );
    await createCopany(formData.get("github_url") as string);
    const copanies = await getCopanies();
    const typedCopanies: CopanyWithUser[] = copanies.map((copany) => {
      const item: CopanyWithUser = {
        id: Number(copany.id),
        github_url: String(copany.github_url),
        name: String(copany.name),
        description: String(copany.description),
        created_by: String(copany.created_by),
        created_by_name: String(copany.created_by_name),
        organization_avatar_url: copany.organization_avatar_url
          ? String(copany.organization_avatar_url)
          : null,
        project_type: String(copany.project_type),
        project_stage: String(copany.project_stage),
        main_language: String(copany.main_language),
        license: String(copany.license),
        created_at: String(copany.created_at),
        updated_at: copany.updated_at ? String(copany.updated_at) : null,
      };
      return item;
    });
    setCopanies(typedCopanies);
    console.log(typedCopanies);
  }

  // --- View ---

  if (status === "loading") {
    return <div className="text-sm font-bold">Loading...</div>;
  }

  if (status === "failed") {
    return <div className="text-sm font-bold">Error: {error}</div>;
  }

  return (
    <div className="flex flex-col gap-2">
      <form
        action={async (formData) => {
          await handleCreateCopany(formData);
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          name="github_url"
          placeholder="Enter github url"
          className="rounded-md border-1 border-gray-300 px-2 h-fit"
        />
        <button
          className="cursor-pointer rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 border-1 border-gray-300 px-2 mb-2"
          type="submit"
        >
          Create Copany
        </button>
      </form>
      <ul className="space-y-6">
        {copanies.map((copany) => (
          <li key={copany.id} className="space-y-2">
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
