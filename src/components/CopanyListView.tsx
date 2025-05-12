"use client";
import { useEffect } from "react";
import { CopanyWithUser } from "@/types/types";
import { useState } from "react";
import {
  createCopany,
  deleteCopany,
  getCopanies,
  getOrgPublicRepos,
  getUserOrg,
} from "@/services/CopanyFuncs";
import Image from "next/image";
import { RestEndpointMethodTypes } from "@octokit/rest";
import ChevronDownIcon from "@/app/chevron.down.png";
export default function CopanyListView() {
  const [copanies, setCopanies] = useState<CopanyWithUser[]>([]);
  const [orgWithRepos, setOrgWithRepos] = useState<
    {
      org: RestEndpointMethodTypes["orgs"]["listForAuthenticatedUser"]["response"]["data"][0];
      repos: RestEndpointMethodTypes["repos"]["listForOrg"]["response"]["data"];
    }[]
  >([]);

  const [status, setStatus] = useState<"loading" | "failed" | "success">(
    "loading"
  );
  const [error, setError] = useState<string | null>(null);
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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

    getUserOrg()
      .then((orgs) => {
        orgs.forEach((org) => {
          getOrgPublicRepos(org.login)
            .then((repos) => {
              setOrgWithRepos((prev) => [...prev, { org, repos }]);
            })
            .catch(() => {});
        });
      })
      .catch(() => {});
  }, []);

  async function handleCreateCopany() {
    await createCopany(
      orgWithRepos
        .find(({ repos }) => repos.find((repo) => repo.id === selectedRepoId))
        ?.repos.find((repo) => repo.id === selectedRepoId)?.html_url || ""
    );
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
        action={async () => {
          await handleCreateCopany();
        }}
        className="flex gap-2"
      >
        {/* <input
          type="text"
          name="github_url"
          placeholder="Enter github url"
          className="rounded-md border-1 border-gray-300 px-2 h-fit"
        /> */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 rounded-md border-1 border-gray-300 px-2 h-fit min-w-[200px] justify-between hover:bg-gray-100 cursor-pointer"
          >
            {selectedRepoId ? (
              <div className="flex items-center gap-2">
                <Image
                  src={
                    orgWithRepos.find(({ repos }) =>
                      repos.find((repo) => repo.id === selectedRepoId)
                    )?.org.avatar_url || ""
                  }
                  alt="Selected Organization Avatar"
                  width={20}
                  height={20}
                  className="rounded-full"
                />
                <span>
                  {
                    orgWithRepos
                      .flatMap(({ repos }) => repos)
                      .find((repo) => repo.id === selectedRepoId)?.name
                  }
                </span>
              </div>
            ) : (
              <span>Select Organization</span>
            )}
            <Image
              src={ChevronDownIcon}
              alt="Chevron Down"
              width={12}
              height={12}
              className={`text-gray-500 ${isDropdownOpen ? "rotate-180" : ""}`}
            />
          </button>
          {isDropdownOpen && (
            <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700">
              {orgWithRepos.map((org) => {
                return (
                  <div key={org.org.id}>
                    <div
                      key={org.org.id}
                      className="flex items-center gap-1 px-2 py-1 border-b border-gray-200 dark:border-gray-700"
                    >
                      <Image
                        src={org.org.avatar_url}
                        alt="Organization Avatar"
                        width={20}
                        height={20}
                        className="rounded-full"
                      />
                      <span>{org.org.login}</span>
                    </div>
                    <div>
                      {org.repos
                        .filter((repo) => repo.owner.login === org.org.login)
                        .map((repo) => (
                          <div
                            key={repo.id}
                            className="flex flex-col items-start gap-2 pl-8 px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                            onClick={() => {
                              setSelectedRepoId(repo.id);
                              setIsDropdownOpen(false);
                            }}
                          >
                            <span>{repo.name}</span>
                            <span className="text-sm text-gray-500">
                              {repo.description}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

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
