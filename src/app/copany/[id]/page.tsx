import MarkdownView from "../../../components/MarkdownView";
import { getRepoReadme } from "../../../services/copanyFuncs";
import { getCopany } from "../../../services/copanyFuncs";
import Image from "next/image";

const decodeGitHubContent = (base64String: string): string => {
  try {
    return Buffer.from(base64String, "base64").toString("utf-8");
  } catch (error) {
    console.error("解码失败:", error);
    throw new Error("无法解码 GitHub 内容");
  }
};

export default async function CopanyDetailView({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const copany = await getCopany(Number(id));
    console.log("copany", copany.name);
    // const prs = await getRepoPRs(copany.name);
    const readme = await getRepoReadme(copany.name);
    console.log(decodeGitHubContent(readme?.content || ""));
    return (
      <div className="p-8 max-w-screen-lg mx-auto gap-8 flex flex-col">
        <div className="flex flex-col gap-1">
          <Image
            src={copany.organization_avatar_url || ""}
            alt={copany.name}
            width={100}
            height={100}
            className="border-1 border-gray-300 dark:border-gray-700"
          />
          <h1 className="text-2xl font-bold">{copany.name}</h1>
          <p className="">{copany.description}</p>
          <p className="">{copany.github_url}</p>
        </div>
        <MarkdownView content={decodeGitHubContent(readme?.content || "")} />
        {/* <pre>{JSON.stringify(prs, null, 2)}</pre> */}
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
