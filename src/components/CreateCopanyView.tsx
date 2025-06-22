"use client";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import Image from "next/image";
import ChevronDownIcon from "@/app/chevron.down.png";
import ChevronDownIconDark from "@/app/chevron.down.dark.png";
import {
  createCopanyAction,
  getOrgAndReposAction,
} from "@/actions/copany.actions";
import { RestEndpointMethodTypes } from "@octokit/rest";

export default function CreateCopanyView() {
  const { resolvedTheme } = useTheme();
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
  const [isDarkMode, setIsDarkMode] = useState(false);

  // 监听主题变化，避免 SSR 水化不匹配
  useEffect(() => {
    setIsDarkMode(resolvedTheme === "dark");
  }, [resolvedTheme]);

  useEffect(() => {
    let cancelled = false;

    const fetchOrgsAndRepos = async () => {
      try {
        const result = await getOrgAndReposAction();

        if (!cancelled) {
          if (result.success && result.data) {
            setOrgWithRepos(result.data);
            setStatus("success");
          } else {
            setError(result.error || "Unknown error");
            setStatus("failed");
          }
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

  async function handleCreateCopany(e: React.FormEvent) {
    e.preventDefault();

    let repo = orgWithRepos
      .find(({ repos }) => repos.find((repo) => repo.id === selectedRepoId))
      ?.repos.find((repo) => repo.id === selectedRepoId);
    if (!repo) {
      return;
    }

    try {
      const result = await createCopanyAction(repo.html_url);
      if (result.success) {
        window.location.href = "/";
      }
    } catch (error) {
      console.error("创建公司失败:", error);
      // You can add error handling UI here
    }
  }

  return (
    <form onSubmit={handleCreateCopany} className="flex gap-2">
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-2 rounded-md border-1 border-gray-300 px-2 h-fit min-w-[200px] justify-between hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
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
                className="rounded-sm"
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
            src={isDarkMode ? ChevronDownIconDark : ChevronDownIcon}
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
                          className="rounded-sm"
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
