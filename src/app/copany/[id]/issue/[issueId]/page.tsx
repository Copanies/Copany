import IssueEditorView from "@/components/IssueEditorView";
import IssueStateSelector from "@/components/IssueStateSelector";
import { getIssueAction } from "@/actions/issue.actions";

export default async function CopanyIssueView({
  params,
}: {
  params: Promise<{ id: string; issueId: string }>;
}) {
  const resolvedParams = await params;

  // 在服务器端获取 issue 数据
  const issueData = await getIssueAction(resolvedParams.issueId);

  return (
    <div className="flex flex-row max-w-screen-lg mx-auto gap-4 p-6">
      <IssueEditorView issueData={issueData} />
      <div className="w-1/3">
        <div className="flex flex-col gap-2">
          <div className="text-sm text-gray-500">State</div>
          <IssueStateSelector
            issueId={issueData.id}
            initialState={issueData.state}
            showText={true}
          />
        </div>
      </div>
    </div>
  );
}
