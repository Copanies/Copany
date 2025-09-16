import { NextRequest, NextResponse } from "next/server";
import { restoreUserMetadataFromCache } from "@/services/userMetadataProtection.service";

export async function POST(_request: NextRequest) {
  try {
    console.log("🛡️ API: Starting metadata protection...");
    console.log("🕐 API called at:", new Date().toISOString());
    
    const success = await restoreUserMetadataFromCache();
    
    if (success) {
      console.log("✅ API: Metadata protection completed successfully");
      return NextResponse.json({ 
        success: true, 
        message: "User metadata protected successfully" 
      });
    } else {
      console.log("ℹ️ API: No metadata protection needed");
      return NextResponse.json({ 
        success: true, 
        message: "No metadata protection needed" 
      });
    }
  } catch (error) {
    console.error("❌ API: Error in metadata protection:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to protect user metadata" 
      },
      { status: 500 }
    );
  }
}
