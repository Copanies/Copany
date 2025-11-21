import { createAdminSupabaseClient } from "@/utils/supabase/server";
import { EncryptionService } from "@/utils/encryption";

export interface AppStoreConnectCredentials {
  privateKey: string;
  keyId: string;
  issuerId: string;
  vendorNumber: string;
  appSKU: string;
}

interface EncryptedCredentialsRow {
  id: number;
  copany_id: number;
  iv: string;
  encrypted_private_key: string;
  encrypted_key_id: string;
  encrypted_issuer_id: string;
  encrypted_vendor_number: string;
  encrypted_app_sku: string;
  created_at: string;
  updated_at: string;
}

export class AppStoreConnectCredentialsService {
  /**
   * Check if user is the owner of the copany
   * @param copanyId - Copany ID
   * @param userId - User ID
   * @returns true if user is owner
   */
  private static async isCopanyOwner(
    copanyId: string,
    userId: string
  ): Promise<boolean> {
    const adminSupabase = await createAdminSupabaseClient();
    const { data: copany, error } = await adminSupabase
      .from("copany")
      .select("created_by")
      .eq("id", copanyId)
      .single();

    if (error || !copany) {
      console.error("Error checking copany owner:", error);
      return false;
    }

    return copany.created_by === userId;
  }

  /**
   * Encrypt and save credentials (replaces existing credentials for the copany)
   * @param copanyId - Copany ID
   * @param userId - User ID (must be copany owner)
   * @param credentials - Credentials to encrypt and save
   * @returns Saved credentials row
   */
  static async saveCredentials(
    copanyId: string,
    userId: string,
    credentials: AppStoreConnectCredentials
  ): Promise<EncryptedCredentialsRow> {
    // Verify user is copany owner
    const isOwner = await this.isCopanyOwner(copanyId, userId);
    if (!isOwner) {
      throw new Error("Only copany owner can save credentials");
    }

    const adminSupabase = await createAdminSupabaseClient();

    // Delete existing credentials for this copany
    await adminSupabase
      .from("app_store_connect_credentials")
      .delete()
      .eq("copany_id", copanyId);

    // Encrypt each credential field (each field gets its own IV for security)
    const encryptedPrivateKey = EncryptionService.encryptAppStoreCredentials(
      credentials.privateKey
    );
    const encryptedKeyId = EncryptionService.encryptAppStoreCredentials(
      credentials.keyId
    );
    const encryptedIssuerId = EncryptionService.encryptAppStoreCredentials(
      credentials.issuerId
    );
    const encryptedVendorNumber = EncryptionService.encryptAppStoreCredentials(
      credentials.vendorNumber
    );
    const encryptedAppSKU = EncryptionService.encryptAppStoreCredentials(
      credentials.appSKU
    );

    // Save encrypted credentials
    // Each field stores its own IV, data, and tag as JSON for security
    const { data, error } = await adminSupabase
      .from("app_store_connect_credentials")
      .insert({
        copany_id: parseInt(copanyId),
        iv: encryptedPrivateKey.iv, // Store first IV (legacy field, not used for decryption)
        encrypted_private_key: JSON.stringify({
          iv: encryptedPrivateKey.iv,
          data: encryptedPrivateKey.data,
          tag: encryptedPrivateKey.tag,
        }),
        encrypted_key_id: JSON.stringify({
          iv: encryptedKeyId.iv,
          data: encryptedKeyId.data,
          tag: encryptedKeyId.tag,
        }),
        encrypted_issuer_id: JSON.stringify({
          iv: encryptedIssuerId.iv,
          data: encryptedIssuerId.data,
          tag: encryptedIssuerId.tag,
        }),
        encrypted_vendor_number: JSON.stringify({
          iv: encryptedVendorNumber.iv,
          data: encryptedVendorNumber.data,
          tag: encryptedVendorNumber.tag,
        }),
        encrypted_app_sku: JSON.stringify({
          iv: encryptedAppSKU.iv,
          data: encryptedAppSKU.data,
          tag: encryptedAppSKU.tag,
        }),
      })
      .select()
      .single();

    if (error) {
      console.error("Error saving credentials:", error);
      throw new Error(`Failed to save credentials: ${error.message}`);
    }

    return data as EncryptedCredentialsRow;
  }

  /**
   * Get and decrypt credentials for a copany
   * @param copanyId - Copany ID
   * @returns Decrypted credentials or null if not found
   */
  static async getCredentials(
    copanyId: string
  ): Promise<AppStoreConnectCredentials | null> {
    const adminSupabase = await createAdminSupabaseClient();

    const { data, error } = await adminSupabase
      .from("app_store_connect_credentials")
      .select("*")
      .eq("copany_id", copanyId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Not found
        return null;
      }
      console.error("Error getting credentials:", error);
      throw new Error(`Failed to get credentials: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    const row = data as EncryptedCredentialsRow;

    // Decrypt each field
    // Parse the encrypted data (stored as JSON string with iv, data, tag)
    const privateKeyEncrypted = JSON.parse(row.encrypted_private_key);
    const keyIdEncrypted = JSON.parse(row.encrypted_key_id);
    const issuerIdEncrypted = JSON.parse(row.encrypted_issuer_id);
    const vendorNumberEncrypted = JSON.parse(row.encrypted_vendor_number);
    const appSKUEncrypted = JSON.parse(row.encrypted_app_sku);

    return {
      privateKey: EncryptionService.decryptAppStoreCredentials(
        privateKeyEncrypted.iv,
        privateKeyEncrypted.data,
        privateKeyEncrypted.tag
      ),
      keyId: EncryptionService.decryptAppStoreCredentials(
        keyIdEncrypted.iv,
        keyIdEncrypted.data,
        keyIdEncrypted.tag
      ),
      issuerId: EncryptionService.decryptAppStoreCredentials(
        issuerIdEncrypted.iv,
        issuerIdEncrypted.data,
        issuerIdEncrypted.tag
      ),
      vendorNumber: EncryptionService.decryptAppStoreCredentials(
        vendorNumberEncrypted.iv,
        vendorNumberEncrypted.data,
        vendorNumberEncrypted.tag
      ),
      appSKU: EncryptionService.decryptAppStoreCredentials(
        appSKUEncrypted.iv,
        appSKUEncrypted.data,
        appSKUEncrypted.tag
      ),
    };
  }

  /**
   * Delete credentials for a copany
   * @param copanyId - Copany ID
   * @param userId - User ID (must be copany owner)
   */
  static async deleteCredentials(
    copanyId: string,
    userId: string
  ): Promise<void> {
    // Verify user is copany owner
    const isOwner = await this.isCopanyOwner(copanyId, userId);
    if (!isOwner) {
      throw new Error("Only copany owner can delete credentials");
    }

    const adminSupabase = await createAdminSupabaseClient();

    const { error } = await adminSupabase
      .from("app_store_connect_credentials")
      .delete()
      .eq("copany_id", copanyId);

    if (error) {
      console.error("Error deleting credentials:", error);
      throw new Error(`Failed to delete credentials: ${error.message}`);
    }
  }
}

