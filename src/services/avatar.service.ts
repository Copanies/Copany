import { createClient } from '@supabase/supabase-js';
import { createAdminSupabaseClient, createSupabaseClient } from '@/utils/supabase/server';
import { generateRandomCatAvatarClient } from '@/utils/catAvatar';

// Generate random cat avatar with custom colors (server-side version)
export const generateRandomCatAvatar = () => {
  return generateRandomCatAvatarClient(true, false);
};

// Upload avatar to Supabase storage
export const uploadAvatarToStorage = async (userId: string, svgContent: string) => {
  console.log('🎨 Starting avatar upload for user:', userId);
  
  // Use service role client for server-side upload during registration
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
  
  // Convert SVG to blob
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const fileName = `${userId}/avatar_${Date.now()}.svg`;
  
  console.log('📁 Generated filename:', fileName);
  console.log('📏 Blob size:', blob.size, 'bytes');
  
  try {
    // Upload to avatars bucket
    console.log('📤 Attempting upload to avatars bucket...');
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(fileName, blob, {
        contentType: 'image/svg+xml',
        upsert: true
      });

    if (error) {
      console.error('❌ Error uploading avatar:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return null;
    }

    console.log('✅ Upload successful:', data);

    // Get public URL
    const { data: publicData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    console.log('🔗 Generated public URL:', publicData.publicUrl);
    return publicData.publicUrl;
  } catch (error) {
    console.error('💥 Exception in uploadAvatarToStorage:', error);
    return null;
  }
};

// Client-side version for component usage
export const uploadAvatarToStorageClient = async (userId: string, svgContent: string) => {
  const supabase = await createSupabaseClient();
  
  // Convert SVG to blob
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const fileName = `${userId}/avatar_${Date.now()}.svg`;
  
  try {
    // Upload to avatars bucket
    const { error } = await supabase.storage
      .from('avatars')
      .upload(fileName, blob, {
        contentType: 'image/svg+xml',
        upsert: true
      });

    if (error) {
      console.error('Error uploading avatar:', error);
      return null;
    }

    // Get public URL
    const { data: publicData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    return publicData.publicUrl;
  } catch (error) {
    console.error('Error in uploadAvatarToStorageClient:', error);
    return null;
  }
};

// Generate and upload avatar for new user
export const generateAndUploadUserAvatar = async (userId: string) => {
  const avatarSvg = generateRandomCatAvatar();
  const avatarUrl = await uploadAvatarToStorage(userId, avatarSvg);
  return avatarUrl;
};

/**
 * Update user avatar with SVG content
 */
export async function updateUserAvatarWithSvg(userId: string, svgContent: string) {
  try {
    console.log('🎨 Starting avatar update with SVG for user:', userId);
    
    // Upload SVG to storage
    const avatarUrl = await uploadAvatarToStorageClient(userId, svgContent);
    
    if (!avatarUrl) {
      console.error('❌ Failed to upload SVG avatar');
      return { success: false, error: 'Failed to upload avatar' };
    }

    // Update user metadata using admin client
    const adminSupabase = await createAdminSupabaseClient();
    const { error: updateError } = await adminSupabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        avatar_url: avatarUrl,
      }
    });

    if (updateError) {
      console.error('❌ Failed to update user metadata with avatar:', updateError);
      return { success: false, error: 'Failed to update user profile' };
    }

    console.log('✅ Avatar updated successfully for user:', userId, avatarUrl);
    return { success: true, avatar_url: avatarUrl };
  } catch (error) {
    console.error('💥 Exception during avatar update:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Update user avatar with uploaded file
 */
export async function updateUserAvatarWithFile(userId: string, file: File) {
  try {
    console.log('📁 Starting avatar update with file for user:', userId);
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'Invalid file type. Only images are allowed.' };
    }

    // Create Supabase client
    const supabase = await createSupabaseClient();
    
    // Convert file to blob and upload
    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: file.type });
    const fileName = `${userId}/avatar_${Date.now()}.${file.name.split('.').pop()}`;
    
    // Upload to avatars bucket
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, blob, {
        contentType: file.type,
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Failed to upload file:', uploadError);
      return { success: false, error: 'Failed to upload file' };
    }

    // Get public URL
    const { data: publicData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    const avatarUrl = publicData.publicUrl;

    // Update user metadata using admin client
    const adminSupabase = await createAdminSupabaseClient();
    const { error: updateError } = await adminSupabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        avatar_url: avatarUrl,
      }
    });

    if (updateError) {
      console.error('❌ Failed to update user metadata with avatar:', updateError);
      return { success: false, error: 'Failed to update user profile' };
    }

    console.log('✅ Avatar updated successfully for user:', userId, avatarUrl);
    return { success: true, avatar_url: avatarUrl };
  } catch (error) {
    console.error('💥 Exception during avatar update:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Check if user needs avatar initialization and generate one if needed
 * This should be called after user email verification/first login
 */
export async function initializeUserAvatarIfNeeded(userId: string) {
  try {
    console.log('🔍 Checking if user needs avatar initialization:', userId);
    
    // Get user info using admin client to check current avatar
    const adminSupabase = await createAdminSupabaseClient();
    const { data: userData, error: userError } = await adminSupabase.auth.admin.getUserById(userId);
    
    if (userError || !userData.user) {
      console.error('❌ Failed to get user data for avatar initialization:', userError);
      return false;
    }

    const user = userData.user;
    const hasExistingAvatar = user.user_metadata?.avatar_url;
    const isEmailProvider = user.app_metadata?.provider === 'email';
    
    console.log('👤 User info:', {
      id: user.id,
      email: user.email,
      provider: user.app_metadata?.provider,
      hasAvatar: !!hasExistingAvatar,
      isEmailProvider
    });

    // Only generate avatar for email users who don't have one
    if (isEmailProvider && !hasExistingAvatar) {
      console.log('🎨 Generating avatar for email user without existing avatar');
      
      // Generate and upload avatar
      const avatarUrl = await generateAndUploadUserAvatar(userId);
      
      if (avatarUrl) {
        // Update user metadata using admin client
        const { error: updateError } = await adminSupabase.auth.admin.updateUserById(userId, {
          user_metadata: {
            ...user.user_metadata,
            avatar_url: avatarUrl,
          }
        });
        
        if (updateError) {
          console.error('❌ Failed to update user metadata with avatar:', updateError);
          return false;
        }
        
        console.log('✅ Avatar initialized successfully for user:', userId, avatarUrl);
        return true;
      } else {
        console.error('❌ Failed to generate avatar URL');
        return false;
      }
    } else {
      console.log('ℹ️ User does not need avatar initialization:', {
        reason: !isEmailProvider ? 'Not email provider' : 'Already has avatar'
      });
      return false;
    }
  } catch (error) {
    console.error('💥 Exception during avatar initialization:', error);
    return false;
  }
}
