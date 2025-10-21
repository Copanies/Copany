import { NextRequest, NextResponse } from "next/server";
import { getRepoReadmeWithFilenameAction, getRepoLicenseAction, getRepoLicenseTypeAction } from "@/actions/github.action";

const decodeGitHubContent = (base64String: string): string => {
  const binaryString = typeof atob !== "undefined" ? atob(base64String) : Buffer.from(base64String, "base64").toString("binary");
  const bytes = Uint8Array.from(binaryString, (char) => char.charCodeAt(0));
  const decoder = new TextDecoder("utf-8");
  return decoder.decode(bytes);
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const githubUrl = searchParams.get("githubUrl");
    const type = searchParams.get("type"); // "readme" or "license"
    
    if (!githubUrl) {
      return NextResponse.json({ error: "githubUrl required" }, { status: 400 });
    }
    
    if (type === "readme") {
      const filename = searchParams.get("filename"); // Optional filename parameter
      const res = await getRepoReadmeWithFilenameAction(githubUrl, filename || undefined);
      if (!res || Array.isArray(res) || !("content" in res) || !res.content) {
        return NextResponse.json({ content: "No README" });
      }
      const content = decodeGitHubContent(res.content);
      return NextResponse.json({ content });
    } else if (type === "license") {
      const license = await getRepoLicenseAction(githubUrl);
      if (!license || Array.isArray(license) || !("content" in license)) {
        return NextResponse.json({ content: "No License", type: null });
      }
      const type = await getRepoLicenseTypeAction(githubUrl);
      const content = decodeGitHubContent(license.content);
      return NextResponse.json({ content, type: type ?? null });
    } else {
      return NextResponse.json({ error: "type required (readme or license)" }, { status: 400 });
    }
  } catch (_e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
