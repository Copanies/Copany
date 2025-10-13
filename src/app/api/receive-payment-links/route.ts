import { NextRequest, NextResponse } from "next/server";
import { getUserPaymentLinksAction, getPaymentLinkByTypeAction } from "@/actions/receivePaymentLink.actions";
import { ReceivePaymentLinkService } from "@/services/receivePaymentLink.service";
import { ReceivePaymentLinkType } from "@/types/database.types";
import { createSupabaseClient } from "@/utils/supabase/server";

/**
 * GET /api/receive-payment-links
 * Get user's payment links
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type') as ReceivePaymentLinkType | null;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Verify user authentication
    const supabase = await createSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 }
      );
    }

    let result;
    
    if (type) {
      // Get specific payment link by type
      if (!['Wise', 'Alipay'].includes(type)) {
        return NextResponse.json(
          { error: "Invalid payment link type" },
          { status: 400 }
        );
      }

      result = await getPaymentLinkByTypeAction(user.id, userId, type);
    } else {
      // Get all payment links for user
      result = await getUserPaymentLinksAction(user.id, userId);
    }

    if (!result.success) {
      if (result.error === 'Unauthorized access to payment links') {
        return NextResponse.json(
          { error: "Unauthorized access" },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { error: result.error || "Failed to fetch payment links" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error("GET /api/receive-payment-links error:", error);
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/receive-payment-links
 * Create or update payment link
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, type, paymentLink } = body;

    if (!userId || !type || !paymentLink) {
      return NextResponse.json(
        { error: "userId, type, and paymentLink are required" },
        { status: 400 }
      );
    }

    if (!['Wise', 'Alipay'].includes(type)) {
      return NextResponse.json(
        { error: "Invalid payment link type" },
        { status: 400 }
      );
    }

    // Verify user authentication
    const supabase = await createSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || user.id !== userId) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 }
      );
    }

    const result = await ReceivePaymentLinkService.upsertPaymentLink(
      userId,
      type as ReceivePaymentLinkType,
      paymentLink
    );

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("POST /api/receive-payment-links error:", error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/receive-payment-links
 * Delete payment link
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type') as ReceivePaymentLinkType | null;

    if (!userId || !type) {
      return NextResponse.json(
        { error: "userId and type are required" },
        { status: 400 }
      );
    }

    if (!['Wise', 'Alipay'].includes(type)) {
      return NextResponse.json(
        { error: "Invalid payment link type" },
        { status: 400 }
      );
    }

    // Verify user authentication
    const supabase = await createSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || user.id !== userId) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 }
      );
    }

    await ReceivePaymentLinkService.deletePaymentLink(userId, type);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/receive-payment-links error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
