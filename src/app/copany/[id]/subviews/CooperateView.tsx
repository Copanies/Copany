import { useMemo } from "react";
import SecondaryTabViewView from "@/components/commons/SecondaryTabView";
import IssuesView from "./IssuesView";
import ProjectsView from "./ProjectsView";

export default function CooperateView({ copanyId }: { copanyId: string }) {
  const urlParamName = "subtab";

  const tabs = useMemo(
    () => [
      {
        label: "Issue",
        content: <IssuesView copanyId={copanyId} />,
      },
      {
        label: "Project",
        content: <ProjectsView />,
      },
    ],
    [copanyId]
  );

  return <SecondaryTabViewView tabs={tabs} urlParamName={urlParamName} />;
}
