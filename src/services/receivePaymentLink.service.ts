import { createSupabaseClient } from "@/utils/supabase/server";
import { ReceivePaymentLink, ReceivePaymentLinkType } from "@/types/database.types";
import { EncryptionService } from "@/utils/encryption";

export class ReceivePaymentLinkService {
  /**
   * Get user's payment links (decrypted)
   * @param userId - User ID
   * @returns Array of payment links with decrypted data
   */
  static async getUserPaymentLinks(userId: string): Promise<Array<ReceivePaymentLink & { decrypted_link: string }>> {
    const supabase = await createSupabaseClient();
    
    const { data, error } = await supabase
      .from('receive_payment_link')
      .select('*')
      .eq('user_id', userId)
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
   * @param userId - User ID
   * @param type - Payment link type
   * @returns Payment link with decrypted data or null if not found
   */
  static async getPaymentLinkByType(
    userId: string, 
    type: ReceivePaymentLinkType
  ): Promise<(ReceivePaymentLink & { decrypted_link: string }) | null> {
    const supabase = await createSupabaseClient();
    
    const { data, error } = await supabase
      .from('receive_payment_link')
      .select('*')
      .eq('user_id', userId)
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
