import TabView from "@/components/commons/TabView";
import ReadmeView from "./subviews/ReadmeView";
import { CopanyService } from "@/services/copany.service";
import Image from "next/image";
import ProjectsView from "./subviews/ProjectsView";
import VerticalTabView from "@/components/commons/VerticalTabView";
import IssuesView from "./subviews/IssuesView";
import MainNavigation from "@/components/MainNavigation";

export default async function CopanyDetailView({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const copany = await CopanyService.getCopanyById(id);
    console.log("copany", copany?.name);

    return (
      <main>
        <MainNavigation />
        <div className="p-8 max-w-screen-lg mx-auto gap-4 flex flex-col h-full">
          <div className="flex flex-col gap-1">
            <Image
              src={copany?.organization_avatar_url || ""}
              alt={copany?.name || ""}
              width={100}
              height={100}
              className="border-1 border-gray-300 dark:border-gray-700"
            />
            <h1 className="text-2xl font-bold">{copany?.name}</h1>
            <p className="">{copany?.description}</p>
            <a
              href={copany?.github_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              {copany?.github_url}
            </a>
          </div>
          <TabView
            tabs={[
              {
                label: "README",
                content: <ReadmeView githubUrl={copany?.github_url} />,
              },
              {
                label: "Cooperate",
                content: (
                  <VerticalTabView
                    tabs={[
                      {
                        label: "Issue",
                        content: <IssuesView copanyId={id} />,
                      },
                      {
                        label: "Project",
                        content: <ProjectsView copanyId={id} />,
                      },
                    ]}
                  />
                ),
              },
            ]}
          />
        </div>
      </main>
    );
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error fetching copany", error.message);
      return <div className="p-4">Error fetching copany: {error.message}</div>;
    } else {
      console.error("Error fetching copany", error);
      return <div className="p-4">Error fetching copany</div>;
    }
  }
}
