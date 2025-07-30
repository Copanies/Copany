import GithubInstalledLoading from "./loading";
import { getCopanyByIdAction } from "@/actions/copany.actions";
import { copanyCache } from "@/utils/cache/instances";
import GithubInstalledClient from "./client";

interface PageProps {
  searchParams: { state?: string };
}

export default async function GithubInstalled({ searchParams }: PageProps) {
  const state = searchParams?.state;

  if (!state) {
    console.log("No state found, showing loading...");
    return <GithubInstalledLoading />;
  }

  try {
    const decodedState = atob(decodeURIComponent(state));
    const stateObj = JSON.parse(decodedState);

    console.log(
      "Processing GitHub installation for copany:",
      stateObj.copany_id
    );

    const copany = await getCopanyByIdAction(stateObj.copany_id);
    if (!copany) {
      console.error("Failed to fetch copany:", stateObj.copany_id);
      return <GithubInstalledLoading />;
    }

    // set cache for later use (optional)
    copanyCache.set(copany.id.toString(), copany);

    return <GithubInstalledClient copanyId={stateObj.copany_id} />;
  } catch (err) {
    console.error("GitHub installation error:", err);
    return <GithubInstalledLoading />;
  }
}
