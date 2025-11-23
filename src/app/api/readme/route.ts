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
        
        // Log detailed information for debugging
        if (Array.isArray(res)) {
          console.warn(`⚠️ GitHub API returned array instead of file for ${githubUrl}, filename: ${filename || "default"}. This usually means the path points to a directory.`);
        }
        
        if (!res || Array.isArray(res) || !("content" in res) || !res.content) {
          console.log(`ℹ️ README not found for ${githubUrl}, filename: ${filename || "default"}. res type: ${Array.isArray(res) ? "array" : res ? typeof res : "null"}`);
          return NextResponse.json({ content: "No README", error: "NOT_FOUND" });
        }
        const content = decodeGitHubContent(res.content);
        return NextResponse.json({ content });
      } catch (error) {
        // Log error details for debugging
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStatus = typeof error === "object" && error !== null && "status" in error ? (error as { status: number }).status : null;
        
        console.error(`❌ Error fetching README for ${githubUrl}, filename: ${filename || "default"}:`, {
          message: errorMessage,
          status: errorStatus,
          error: error,
        });
        
        // Check if it's a GitHub API 404 (not found)
        const isNotFound = 
          errorMessage.includes("404") ||
          errorStatus === 404;
        
        if (isNotFound) {
          return NextResponse.json({ content: "No README", error: "NOT_FOUND" });
        }
        
        // Check for rate limit (403) or authentication issues
        if (errorStatus === 403 || errorMessage.includes("rate limit") || errorMessage.includes("403")) {
          console.warn(`⚠️ GitHub API rate limit or permission issue for ${githubUrl}`);
          return NextResponse.json({ error: "NETWORK_ERROR" }, { status: 500 });
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
