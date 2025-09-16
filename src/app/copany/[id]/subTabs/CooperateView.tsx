import IssuesView from "./issue/IssuesView";

export default function CooperateView({ copanyId }: { copanyId: string }) {
  return <IssuesView copanyId={copanyId} />;
}
