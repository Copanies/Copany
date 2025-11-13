import crypto from 'crypto';

/**
 * AES-256-GCM encryption service for sensitive payment link data
 */
export class EncryptionService {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 16; // 16 bytes for GCM
  private static readonly TAG_LENGTH = 16; // 16 bytes for GCM

  /**
   * Get encryption key from environment variable
   */
  private static getEncryptionKey(): Buffer {
    const keyHex = process.env.AES_KEY;
    if (!keyHex) {
      throw new Error('AES_KEY environment variable is not set');
    }
    
    // Convert hex string to buffer (expecting 64 hex chars for 32 bytes)
    if (keyHex.length !== 64) {
      throw new Error('AES_KEY must be 64 hex characters (32 bytes)');
    }
    
    return Buffer.from(keyHex, 'hex');
  }

  /**
   * Encrypt payment link data using AES-256-GCM
   * @param plaintext - The payment link to encrypt
   * @returns Object containing IV, encrypted data, and authentication tag
   */
  static encrypt(plaintext: string): { iv: string; data: string; tag: string } {
    try {
      const key = this.getEncryptionKey();
      const iv = crypto.randomBytes(this.IV_LENGTH);
      
      const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
      cipher.setAAD(Buffer.from('payment-link', 'utf8')); // Additional authenticated data
      
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      return {
        iv: iv.toString('hex'),
        data: encrypted,
        tag: tag.toString('hex')
      };
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt payment link data');
    }
  }

  /**
   * Decrypt payment link data using AES-256-GCM
   * @param iv - Initialization vector (hex string)
   * @param encryptedData - Encrypted data (hex string)
   * @param authTag - Authentication tag (hex string)
   * @returns Decrypted payment link
   */
  static decrypt(iv: string, encryptedData: string, authTag: string): string {
    try {
      const key = this.getEncryptionKey();
      const ivBuffer = Buffer.from(iv, 'hex');
      const tagBuffer = Buffer.from(authTag, 'hex');
      
      const decipher = crypto.createDecipheriv(this.ALGORITHM, key, ivBuffer);
      decipher.setAuthTag(tagBuffer);
      decipher.setAAD(Buffer.from('payment-link', 'utf8')); // Same AAD as encryption
      
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt payment link data');
    }
  }

  /**
   * Encrypt App Store Connect credentials using AES-256-GCM
   * @param plaintext - The credential value to encrypt
   * @returns Object containing IV, encrypted data, and authentication tag
   */
  static encryptAppStoreCredentials(plaintext: string): { iv: string; data: string; tag: string } {
    try {
      const key = this.getEncryptionKey();
      const iv = crypto.randomBytes(this.IV_LENGTH);
      
      const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
      cipher.setAAD(Buffer.from('app-store-connect', 'utf8')); // Additional authenticated data
      
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      return {
        iv: iv.toString('hex'),
        data: encrypted,
        tag: tag.toString('hex')
      };
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt App Store Connect credentials');
    }
  }

  /**
   * Decrypt App Store Connect credentials using AES-256-GCM
   * @param iv - Initialization vector (hex string)
   * @param encryptedData - Encrypted data (hex string)
   * @param authTag - Authentication tag (hex string)
   * @returns Decrypted credential value
   */
  static decryptAppStoreCredentials(iv: string, encryptedData: string, authTag: string): string {
    try {
      const key = this.getEncryptionKey();
      const ivBuffer = Buffer.from(iv, 'hex');
      const tagBuffer = Buffer.from(authTag, 'hex');
      
      const decipher = crypto.createDecipheriv(this.ALGORITHM, key, ivBuffer);
      decipher.setAuthTag(tagBuffer);
      decipher.setAAD(Buffer.from('app-store-connect', 'utf8')); // Same AAD as encryption
      
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt App Store Connect credentials');
    }
  }

  /**
   * Validate if a string is a valid payment link format
   * @param link - The payment link to validate
   * @param type - The type of payment link (Wise or Alipay)
   * @returns true if valid, false otherwise
   */
  static validatePaymentLink(link: string, type: 'Wise' | 'Alipay'): boolean {
    if (!link || typeof link !== 'string') {
      return false;
    }

    const trimmedLink = link.trim();
    
    switch (type) {
      case 'Wise':
        // Strict validation for Wise payment links
        const wisePattern = /^https:\/\/wise\.com\/pay\/me\/.+$/;
        return wisePattern.test(trimmedLink);
      
      case 'Alipay':
        // Strict validation for Alipay QR code links
        const alipayPattern = /^https:\/\/qr\.alipay\.com\/.+$/;
        return alipayPattern.test(trimmedLink);
      
      default:
        return false;
    }
  }
}