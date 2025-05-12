"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import ChevronDownIcon from "@/app/chevron.down.png";
import { createCopany } from "@/services/CopanyFuncs";
import { getUserOrg } from "@/services/CopanyFuncs";
import { getOrgPublicRepos } from "@/services/CopanyFuncs";
import { RestEndpointMethodTypes } from "@octokit/rest";

export default function CreateCopanyView() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null);
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

  useEffect(() => {
    let cancelled = false;

    const fetchOrgsAndRepos = async () => {
      try {
        const orgs = await getUserOrg();
        const orgsWithRepos = await Promise.all(
          orgs.map(async (org) => {
            const repos = await getOrgPublicRepos(org.login);
            return { org, repos };
          })
        );
        if (!cancelled) {
          setOrgWithRepos(orgsWithRepos);
          setStatus("success");
        }
      } catch (error: unknown) {
        console.error("Error fetching orgs or repos", error);
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError("Unknown error");
        }
        setStatus("failed");
      }
    };

    fetchOrgsAndRepos();

    return () => {
      cancelled = true;
      console.log("Cleanup called");
    };
  }, []);

  async function handleCreateCopany() {
    await createCopany(
      orgWithRepos
        .find(({ repos }) => repos.find((repo) => repo.id === selectedRepoId))
        ?.repos.find((repo) => repo.id === selectedRepoId)?.html_url || ""
    );
  }

  return (
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
            {status === "loading" && (
              <div className="px-2 py-1">Loading...</div>
            )}
            {status === "failed" && <div className="px-2 py-1">{error}</div>}
            {status === "success" && (
              <>
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
              </>
            )}
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
  );
}
