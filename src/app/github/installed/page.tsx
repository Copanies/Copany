import { redirect } from "next/navigation";
import GithubInstalledLoading from "./loading";
import { copanyCache } from "@/utils/cache/instances";
import { getCopanyByIdAction } from "@/actions/copany.actions";

export default async function GithubInstalled({
  searchParams,
}: {
  searchParams: { state?: string };
}) {
  if (!searchParams.state) {
    return <GithubInstalledLoading />;
  }

  try {
    const decodedState = atob(decodeURIComponent(searchParams.state));
    const stateObj = JSON.parse(decodedState);

    // get latest copany data and set cache
    const copany = await getCopanyByIdAction(stateObj.copany_id);
    if (copany) {
      copanyCache.set(copany.id.toString(), copany);
    } else {
      console.error("Failed to fetch copany:", stateObj.copany_id);
      redirect("/");
      return;
    }

    redirect(`/copany/${stateObj.copany_id}?tab=Settings`);
  } catch (error) {
    console.error("Failed to decode state or fetch copany:", error);
    redirect("/");
  }
}
