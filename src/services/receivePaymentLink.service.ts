import { createSupabaseClient } from "@/utils/supabase/server";
import { ReceivePaymentLink, ReceivePaymentLinkType } from "@/types/database.types";
import { EncryptionService } from "@/utils/encryption";

export class ReceivePaymentLinkService {
  /**
   * Check if current user can access target user's payment links
   * @param currentUserId - Current authenticated user ID
   * @param targetUserId - Target user whose payment links are being accessed
   * @returns true if access is allowed
   */
  private static async canAccessPaymentLinks(
    currentUserId: string,
    targetUserId: string
  ): Promise<boolean> {
    // User can always access their own payment links
    if (currentUserId === targetUserId) {
      return true;
    }

    // Check if current user is a copany owner with pending distributes to target user
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from('distribute')
      .select('id, copany!inner(created_by)')
      .eq('to_user', targetUserId)
      .in('status', ['in_progress', 'in_review'])
      .eq('copany.created_by', currentUserId)
      .limit(1);

    if (error) {
      console.error('Error checking payment link access:', error);
      return false;
    }

    return data && data.length > 0;
  }

  /**
   * Get user's payment links (decrypted)
   * @param currentUserId - Current authenticated user ID
   * @param targetUserId - Target user ID whose payment links to fetch
   * @returns Array of payment links with decrypted data
   */
  static async getUserPaymentLinks(
    currentUserId: string,
    targetUserId: string
  ): Promise<Array<ReceivePaymentLink & { decrypted_link: string }>> {
    // Check access permission
    const hasAccess = await this.canAccessPaymentLinks(currentUserId, targetUserId);
    if (!hasAccess) {
      throw new Error('Unauthorized access to payment links');
    }

    const supabase = await createSupabaseClient();
    
    const { data, error } = await supabase
      .from('receive_payment_link')
      .select('*')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payment links:', error);
      throw new Error('Failed to fetch payment links');
    }

    // Decrypt the payment links
    const decryptedLinks = data?.map(link => {
      try {
        const decryptedLink = EncryptionService.decrypt(link.iv, link.data, link.tag);
        return {
          ...link,
          decrypted_link: decryptedLink
        };
      } catch (error) {
        console.error(`Failed to decrypt payment link ${link.id}:`, error);
        return {
          ...link,
          decrypted_link: '****' // Fallback for corrupted data
        };
      }
    }) || [];

    return decryptedLinks;
  }

  /**
   * Get payment link by type for a user
   * @param currentUserId - Current authenticated user ID
   * @param targetUserId - Target user ID whose payment link to fetch
   * @param type - Payment link type
   * @returns Payment link with decrypted data or null if not found
   */
  static async getPaymentLinkByType(
    currentUserId: string,
    targetUserId: string,
    type: ReceivePaymentLinkType
  ): Promise<(ReceivePaymentLink & { decrypted_link: string }) | null> {
    // Check access permission
    const hasAccess = await this.canAccessPaymentLinks(currentUserId, targetUserId);
    if (!hasAccess) {
      throw new Error('Unauthorized access to payment links');
    }

    const supabase = await createSupabaseClient();
    
    const { data, error } = await supabase
      .from('receive_payment_link')
      .select('*')
      .eq('user_id', targetUserId)
      .eq('type', type)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      console.error('Error fetching payment link by type:', error);
      throw new Error('Failed to fetch payment link');
    }

    try {
      const decryptedLink = EncryptionService.decrypt(data.iv, data.data, data.tag);
      return {
        ...data,
        decrypted_link: decryptedLink
      };
    } catch (error) {
      console.error(`Failed to decrypt payment link ${data.id}:`, error);
      return {
        ...data,
        decrypted_link: '****' // Fallback for corrupted data
      };
    }
  }

  /**
   * Create or update a payment link
   * @param userId - User ID
   * @param type - Payment link type
   * @param paymentLink - The payment link URL to encrypt and store
   * @returns Created/updated payment link
   */
  static async upsertPaymentLink(
    userId: string,
    type: ReceivePaymentLinkType,
    paymentLink: string
  ): Promise<ReceivePaymentLink> {
    // Validate payment link format
    if (!EncryptionService.validatePaymentLink(paymentLink, type)) {
      throw new Error(`Invalid ${type} payment link format`);
    }

    // Encrypt the payment link
    const encrypted = EncryptionService.encrypt(paymentLink);
    
    const supabase = await createSupabaseClient();
    
    // Use upsert to handle both create and update
    const { data, error } = await supabase
      .from('receive_payment_link')
      .upsert({
        user_id: userId,
        type,
        iv: encrypted.iv,
        data: encrypted.data,
        tag: encrypted.tag,
      }, {
        onConflict: 'user_id,type',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting payment link:', error);
      throw new Error('Failed to save payment link');
    }

    return data;
  }

  /**
   * Delete a payment link
   * @param userId - User ID
   * @param type - Payment link type to delete
   * @returns true if deleted successfully
   */
  static async deletePaymentLink(userId: string, type: ReceivePaymentLinkType): Promise<boolean> {
    const supabase = await createSupabaseClient();
    
    const { error } = await supabase
      .from('receive_payment_link')
      .delete()
      .eq('user_id', userId)
      .eq('type', type);

    if (error) {
      console.error('Error deleting payment link:', error);
      throw new Error('Failed to delete payment link');
    }

    return true;
  }

  /**
   * Check if user has any payment links configured
   * @param userId - User ID
   * @returns Object indicating which payment link types are configured
   */
  static async getPaymentLinkStatus(userId: string): Promise<{
    hasWise: boolean;
    hasAlipay: boolean;
    total: number;
  }> {
    const supabase = await createSupabaseClient();
    
    const { data, error } = await supabase
      .from('receive_payment_link')
      .select('type')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching payment link status:', error);
      throw new Error('Failed to fetch payment link status');
    }

    const types = data?.map(link => link.type) || [];
    
    return {
      hasWise: types.includes('Wise'),
      hasAlipay: types.includes('Alipay'),
      total: types.length
    };
  }
}
