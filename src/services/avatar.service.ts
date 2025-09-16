import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { createAdminSupabaseClient } from '@/utils/supabase/server';

// Random color generation for avatar parts
// Generate a completely random color in hex format
const generateRandomColor = () => {
  // Generate a random integer between 0 and 255 for R, G, B
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);
  // Convert to hex and pad with zeros if necessary
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

/**
 * Generate a random light color in hex format.
 * The color will be in the lighter range by keeping RGB values high.
 */
const generateRandomLightColor = () => {
  // Generate R, G, B values between 200 and 255 for a light color
  const r = Math.floor(200 + Math.random() * 56);
  const g = Math.floor(200 + Math.random() * 56);
  const b = Math.floor(200 + Math.random() * 56);
  // Convert to hex and pad with zeros if necessary
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

// const colors = [
//   '#FFE0A6', '#FFB6C1', '#FFA07A', '#F0E68C', '#DDA0DD',
//   '#87CEEB', '#98FB98', '#F5DEB3', '#FFC0CB', '#E6E6FA',
//   '#B0E0E6', '#FFE4E1', '#F0FFF0', '#FFFACD', '#E0FFFF'
// ];
// return colors[Math.floor(Math.random() * colors.length)];

// const generateRandomSkinColor = () => {
//   const skinColors = [
//     '#A2665C', '#D2691E', '#CD853F', '#DEB887', '#F5DEB3',
//     '#FFDAB9', '#FFDBAC', '#FFE4C4', '#FFF8DC', '#FAEBD7'
//   ];
//   return skinColors[Math.floor(Math.random() * skinColors.length)];
// };

// Generate random cat avatar with custom colors
export const generateRandomCatAvatar = () => {
  const bgColor = generateRandomLightColor();
  const bodyColor = generateRandomColor();
  const mouthColor = generateRandomColor();
  const noseColor = generateRandomColor();
  const tongueColor = generateRandomColor();
  return `<svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0_23723_22255)">
<rect width="120" height="120" rx="60" fill="${bgColor}" style="fill:${bgColor};fill-opacity:1;"/>
<path d="M30.9157 98.5312C28.2215 116.756 65.1556 194.719 74.6979 213.281C105.009 183.581 147.949 167.719 165.63 163.5C167.033 163.781 149.296 124.35 141.213 109.5C131.11 90.9375 112.586 84.1875 107.535 79.125C102.483 74.0625 91.5372 73.2188 93.2212 70.6875C94.9051 68.1562 94.9051 55.5 91.5372 47.9062C88.1694 40.3125 99.9569 28.5 102.483 24.2812C105.009 20.0625 98.2729 20.9062 94.9051 20.9062C91.5372 20.9062 76.3819 31.0312 70.4881 28.5C64.5944 25.9688 45.2292 28.5 41.0194 28.5C37.6515 28.5 29.5125 19.5 25.864 15C27.5479 19.2188 29.9054 29.3438 25.864 36.0938C20.8123 44.5312 15.7604 59.7188 21.6542 73.2188C27.5479 86.7188 34.2836 75.75 30.9157 98.5312Z" fill="${bodyColor}" stroke="black" style="fill:${bodyColor};fill-opacity:1;stroke:black;stroke-opacity:1;" stroke-width="2"/>
<path d="M34.2836 65.6239C28.895 54.8239 35.1256 49.5926 41.0193 47.9051C48.3503 45.8061 57.4223 54.8178 61.2265 56.3426C65.4363 58.0301 70.4881 65.6239 65.4363 70.6864C60.3845 75.7489 58.7006 79.1239 56.1746 85.0301C53.6487 90.9364 46.0711 91.7801 43.5452 85.0301C41.0193 78.2801 41.0193 79.1239 34.2836 65.6239Z" fill="${mouthColor}" stroke="black" style="fill:${mouthColor};fill-opacity:1;stroke:black;stroke-opacity:1;" stroke-width="2"/>
<path d="M28.3898 52.9688C22.7767 49.0313 11.7189 39.3 12.3924 31.875M28.3898 52.9688C24.7413 52.9688 15.4237 53.6437 7.34082 56.3438M28.3898 52.9688C22.4961 56.3438 10.0351 63.9375 7.34082 67.3125M28.3898 58.0312C23.8993 59.7188 14.9185 64.6125 14.9185 70.6875M62.0685 31.875C59.3742 33.9 53.0876 43.4062 50.281 47.9062C57.2974 40.875 72.8457 26.475 78.9078 25.125M55.3328 52.9688C55.8941 51 57.3535 46.5563 58.7007 44.5312" stroke="black" style="stroke:black;stroke-opacity:1;"/>
<path d="M40.1775 44.5316L41.0194 47.0628C42.142 47.9067 43.5452 47.0634 43.5452 47.0634C43.5452 47.0634 45.5098 43.9696 46.9131 43.6884C47.755 43.1257 49.1022 41.6628 47.755 40.3128C46.0711 38.6253 39.3355 38.6253 38.4935 41.1566C37.82 43.1816 39.3355 44.2503 40.1775 44.5316Z" fill="${noseColor}" stroke="black" style="fill:${noseColor};fill-opacity:1;stroke:black;stroke-opacity:1;" stroke-width="2"/>
<path d="M57.0167 39.469C58.9813 38.6252 63.5841 37.1065 66.2784 37.7815M39.3355 38.6251C38.4935 38.3438 36.3044 37.95 34.2837 38.6251M36.8096 50.4376L37.6516 58.8751L40.1774 48.7501L36.8096 50.4376ZM48.5971 49.5939V57.1876L51.123 51.2814L48.5971 49.5939Z" stroke="black" style="stroke:black;stroke-opacity:1;" stroke-width="2"/>
<path d="M43.0617 77.156C42.3881 73.781 46.1489 67.3122 48.1135 64.4997C48.9555 63.2347 51.4813 64.4997 54.0072 64.4997C56.0279 64.4997 55.9718 65.0622 55.6911 65.3435L54.0072 67.031C53.1652 67.8747 54.8491 77.156 54.0072 80.531C53.1652 83.906 54.0072 83.906 50.6393 84.7497C47.2715 85.5935 43.9036 84.7497 43.0616 84.7497C42.2197 84.7497 40.5359 83.0622 40.201 81.3747C39.9331 80.0247 41.9965 80.8122 43.0617 81.3747C43.3424 81.3747 43.7353 80.531 43.0617 77.156Z" fill="${tongueColor}" stroke="black" style="fill:${tongueColor};fill-opacity:1;stroke:black;stroke-opacity:1;" stroke-width="2"/>
</g>
<defs>
<clipPath id="clip0_23723_22255">
<rect width="120" height="120" rx="60" fill="white" style="fill:white;fill-opacity:1;"/>
</clipPath>
</defs>
</svg>
`
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
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
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
