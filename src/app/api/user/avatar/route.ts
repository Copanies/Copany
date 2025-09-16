import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient, createAdminSupabaseClient } from '@/utils/supabase/server';
import { generateAndUploadUserAvatar } from '@/services/avatar.service';

export async function POST(_request: NextRequest) {
  try {
    const supabase = await createSupabaseClient();
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Generate and upload new avatar
    const avatarUrl = await generateAndUploadUserAvatar(user.id);
    
    if (!avatarUrl) {
      return NextResponse.json(
        { error: 'Failed to generate avatar' },
        { status: 500 }
      );
    }

    // Update user metadata with new avatar URL usiang admin client
    const adminSupabase = await createAdminSupabaseClient();
    const { error: updateError } = await adminSupabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        avatar_url: avatarUrl,
      }
    });

    if (updateError) {
      console.error('Failed to update user avatar:', updateError.message);
      return NextResponse.json(
        { error: 'Failed to update user profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      avatar_url: avatarUrl,
    });

  } catch (error) {
    console.error('Error in avatar generation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createSupabaseClient();
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Return current avatar URL from user metadata
    const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

    return NextResponse.json({
      avatar_url: avatarUrl,
    });

  } catch (error) {
    console.error('Error getting user avatar:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
