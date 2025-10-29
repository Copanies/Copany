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
      try {
        const res = await getRepoReadmeWithFilenameAction(githubUrl, filename || undefined);
        if (!res || Array.isArray(res) || !("content" in res) || !res.content) {
          return NextResponse.json({ content: "No README", error: "NOT_FOUND" });
        }
        const content = decodeGitHubContent(res.content);
        return NextResponse.json({ content });
      } catch (error) {
        // Check if it's a GitHub API 404 (not found)
        const errorMessage = error instanceof Error ? error.message : String(error);
        const isNotFound = 
          errorMessage.includes("404") ||
          (typeof error === "object" && error !== null && "status" in error && (error as { status: number }).status === 404);
        
        if (isNotFound) {
          return NextResponse.json({ content: "No README", error: "NOT_FOUND" });
        }
        
        // All other errors (network errors, 5xx, etc.) are treated as network errors
        return NextResponse.json({ error: "NETWORK_ERROR" }, { status: 500 });
      }
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
  } catch (_error) {
    // Unhandled errors are treated as network errors
    return NextResponse.json({ error: "NETWORK_ERROR" }, { status: 500 });
  }
}
