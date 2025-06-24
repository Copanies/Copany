import IssueSubTabView from "./IssueSubTabView";
import ProjectSubTabView from "./ProjectSubTabView";
import VerticalTabView from "@/components/VerticalTabView";

export default function CooperateTabView({ copanyId }: { copanyId: string }) {
  return (
    <VerticalTabView
      tabs={[
        { label: "Issue", content: <IssueSubTabView copanyId={copanyId} /> },
        {
          label: "Project",
          content: <ProjectSubTabView copanyId={copanyId} />,
        },
      ]}
    />
  );
}
