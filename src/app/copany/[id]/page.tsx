import { getRepoPRs } from "@/services/CopanyFuncs";
import { getCopany } from "@/services/CopanyFuncs";

export default async function CopanyDetailView({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  try {
    const copany = await getCopany(Number(id));
    console.log("copany", copany.name);
    const prs = await getRepoPRs(copany.name);
    return (
      <div>
        <h1>CopanyDetailView</h1>
        <pre>{JSON.stringify(prs, null, 2)}</pre>
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
