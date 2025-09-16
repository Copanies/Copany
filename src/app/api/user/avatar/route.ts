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

export async function PUT(request: NextRequest) {
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

    const contentType = request.headers.get('content-type');
    let avatarUrl: string | null = null;

    if (contentType?.includes('application/json')) {
      // Handle JSON payload (for SVG content)
      const body = await request.json();
      avatarUrl = body.avatar_url;
    } else if (contentType?.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await request.formData();
      const file = formData.get('file') as File;
      
      if (!file) {
        return NextResponse.json(
          { error: 'No file provided' },
          { status: 400 }
        );
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        return NextResponse.json(
          { error: 'Invalid file type. Only images are allowed.' },
          { status: 400 }
        );
      }

      // Convert file to blob and upload
      const arrayBuffer = await file.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: file.type });
      const fileName = `${user.id}/avatar_${Date.now()}.${file.name.split('.').pop()}`;
      
      // Upload to avatars bucket
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, {
          contentType: file.type,
          upsert: true
        });

      if (uploadError) {
        console.error('Failed to upload file:', uploadError);
        return NextResponse.json(
          { error: 'Failed to upload file' },
          { status: 500 }
        );
      }

      // Get public URL
      const { data: publicData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      avatarUrl = publicData.publicUrl;
    } else {
      return NextResponse.json(
        { error: 'Invalid content type' },
        { status: 400 }
      );
    }

    if (!avatarUrl) {
      return NextResponse.json(
        { error: 'Failed to process avatar' },
        { status: 500 }
      );
    }

    // Update user metadata using admin client
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
    console.error('Error updating user avatar:', error);
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
