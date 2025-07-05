"use client";
import { useEffect, useState, useRef } from "react";
import { useTheme } from "next-themes";
import Image from "next/image";
import ChevronDownIcon from "@/app/chevron.down.png";
import ChevronDownIconDark from "@/app/chevron.down.dark.png";
import {
  createCopanyAction,
  getOrgAndReposAction,
} from "@/actions/copany.actions";
import { RestEndpointMethodTypes } from "@octokit/rest";
import Button from "./commons/Button";
import LoadingView from "./commons/LoadingView";

export default function CreateCopanyView() {
  const { resolvedTheme } = useTheme();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    setIsDarkMode(resolvedTheme === "dark");
  }, [resolvedTheme]);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        // 阻止事件传播，防止触发被点击元素的点击事件
        event.stopPropagation();
        event.preventDefault();
        setIsDropdownOpen(false);
      }
    }

    if (isDropdownOpen) {
      // 使用 capture 阶段来确保我们能够先处理事件
      document.addEventListener("click", handleClickOutside, true);
      return () => {
        document.removeEventListener("click", handleClickOutside, true);
      };
    }
  }, [isDropdownOpen]);

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
    };
  }, []);

  async function handleCreateCopany(e: React.FormEvent) {
    e.preventDefault();

    const repo = orgWithRepos
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
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsDropdownOpen(!isDropdownOpen);
          }}
          className="flex items-center gap-2 rounded-md border-1 border-gray-300 dark:border-gray-700 px-2 py-1 h-fit min-w-[200px] justify-between hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
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
                className="rounded-sm w-4 h-4"
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
            <span>Select Project</span>
          )}
          <Image
            src={isDarkMode ? ChevronDownIconDark : ChevronDownIcon}
            alt="Chevron Down"
            width={12}
            height={12}
            style={{ width: "12px", height: "auto" }}
            className={`text-gray-500 ${isDropdownOpen ? "rotate-180" : ""}`}
          />
        </button>
        {isDropdownOpen && (
          <div
            className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            {status === "loading" && (
              <div className="p-2">
                <LoadingView type="label" />
              </div>
            )}
            {status === "failed" && <div className="px-2 py-1">{error}</div>}
            {status === "success" && (
              <>
                {orgWithRepos.map((org) => {
                  return (
                    <div key={org.org.id}>
                      <div
                        key={org.org.id}
                        className="flex items-center gap-1 px-2 py-2 border-b border-gray-200 dark:border-gray-700"
                      >
                        <Image
                          src={org.org.avatar_url}
                          alt="Organization Avatar"
                          width={20}
                          height={20}
                          className="rounded-sm w-5 h-5"
                        />
                        <span>{org.org.login}</span>
                      </div>
                      <div>
                        {org.repos
                          .filter((repo) => repo.owner.login === org.org.login)
                          .map((repo) => (
                            <div
                              key={repo.id}
                              className="flex flex-col items-start gap-2 pl-8 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
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

      <Button className="mb-2" type="submit" variant="primary" size="sm">
        Create Copany
      </Button>
    </form>
  );
}
