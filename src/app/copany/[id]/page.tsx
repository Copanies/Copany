import TabView from "@/components/TabView";
import ReadmeTabView from "./ReadmeTabView";
import { CopanyService } from "@/services/copany.service";
import Image from "next/image";
import CooperateTabView from "./CooperateTabView";

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
      <div className="p-8 max-w-screen-xl mx-auto gap-4 flex flex-col">
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
          <p className="">{copany?.github_url}</p>
        </div>
        <TabView
          tabs={[
            {
              label: "README",
              content: <ReadmeTabView githubUrl={copany?.github_url} />,
            },
            {
              label: "Cooperate",
              content: <CooperateTabView copanyId={id} />,
            },
          ]}
        />
      </div>
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
