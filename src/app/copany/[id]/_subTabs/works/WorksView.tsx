import IssuesView from "./IssuesView";

export default function WorksView({ copanyId }: { copanyId: string }) {
  return <IssuesView copanyId={copanyId} />;
}
