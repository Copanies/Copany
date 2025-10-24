import { createClient } from "@/utils/supabase/client";

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export class StorageService {
  private supabase = createClient();
  private bucketName = "copany-logos";
  private coverImageBucket = "copany-cover-images";
  private financeBucket = "finance-evidence";

  /**
   * Upload copany logo to Supabase Storage
   */
  async uploadLogo(file: File): Promise<UploadResult> {
    try {
      // Validate file type
      if (!this.isValidImageFile(file)) {
        return {
          success: false,
          error: "Please select a valid image file (PNG, JPG, JPEG, GIF, WebP)",
        };
      }

      // Generate unique filename
      const fileExtension = file.name.split(".").pop();
      const fileName = `logo_${Date.now()}.${fileExtension}`;
      const filePath = `logos/${fileName}`;

      // Upload file to Supabase Storage
      const { error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        console.error("Upload failed:", error);
        return {
          success: false,
          error: `Upload failed: ${error.message}`,
        };
      }

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      return {
        success: true,
        url: urlData.publicUrl,
      };
    } catch (error) {
      console.error("Error occurred during upload:", error);
      return {
        success: false,
        error: "Unknown error occurred during upload",
      };
    }
  }

  /**
   * Delete copany logo
   */
  async deleteLogo(filePath: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) {
        console.error(`❌ StorageService.deleteLogo: Deletion failed`, error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error(
        `💥 StorageService.deleteLogo: Error occurred during deletion`,
        error
      );
      return false;
    }
  }

  /**
   * Upload copany cover image to Supabase Storage
   */
  async uploadCoverImage(file: File): Promise<UploadResult> {
    try {
      // Validate file type
      if (!this.isValidImageFile(file)) {
        return {
          success: false,
          error: "Please select a valid image file (PNG, JPG, JPEG, GIF, WebP)",
        };
      }

      // Generate unique filename
      const fileExtension = file.name.split(".").pop();
      const fileName = `cover_image_${Date.now()}.${fileExtension}`;
      const filePath = `covers/${fileName}`;

      // Upload file to Supabase Storage
      const { error } = await this.supabase.storage
        .from(this.coverImageBucket)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        console.error("Cover image upload failed:", error);
        return {
          success: false,
          error: `Upload failed: ${error.message}`,
        };
      }

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from(this.coverImageBucket)
        .getPublicUrl(filePath);

      return {
        success: true,
        url: urlData.publicUrl,
      };
    } catch (error) {
      console.error("Error occurred during cover image upload:", error);
      return {
        success: false,
        error: "Unknown error occurred during upload",
      };
    }
  }

  /**
   * Delete copany cover image
   */
  async deleteCoverImage(filePath: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.coverImageBucket)
        .remove([filePath]);

      if (error) {
        console.error(`❌ StorageService.deleteCoverImage: Deletion failed`, error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error(
        `💥 StorageService.deleteCoverImage: Error occurred during deletion`,
        error
      );
      return false;
    }
  }

  /**
   * Validate if file is a valid image file
   */
  private isValidImageFile(file: File): boolean {
    const validTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/gif",
      "image/webp",
    ];

    return validTypes.includes(file.type);
  }

  /**
   * Get file size limit (1MB)
   */
  getMaxLogoFileSize(): number {
    return 5 * 1024 * 1024; // 5MB
  }

    /**
   * Get file size limit (20MB)
   */
  getMaxCoverImageFileSize(): number {
    return 20 * 1024 * 1024; // 20MB
  }

  /**
   * Finance evidence max size (20MB)
   */
  getFinanceEvidenceMaxFileSize(): number {
    return 20 * 1024 * 1024; // 20MB
  }

  /**
   * Upload finance evidence (image files) for distribute/transactions
   */
  async uploadFinanceEvidence(file: File, copanyId: string, kind: "distribute" | "transaction"): Promise<UploadResult> {
    try {
      if (!this.isValidImageFile(file)) {
        return { success: false, error: "Please select a valid image file (PNG, JPG, JPEG, GIF, WebP)" };
      }
      if (file.size > this.getFinanceEvidenceMaxFileSize()) {
        return { success: false, error: "File size exceeds 20MB limit" };
      }
      const fileExtension = file.name.split(".").pop();
      const fileName = `${kind}-${copanyId}-${Date.now()}.${fileExtension}`;
      const filePath = `${copanyId}/${kind}/${fileName}`;

      const { error } = await this.supabase.storage
        .from(this.financeBucket)
        .upload(filePath, file, { cacheControl: "3600", upsert: false });
      if (error) {
        return { success: false, error: `Upload failed: ${error.message}` };
      }

      const { data: urlData } = this.supabase.storage
        .from(this.financeBucket)
        .getPublicUrl(filePath);
      return { success: true, url: urlData.publicUrl };
    } catch (_error) {
      return { success: false, error: "Unknown error occurred during upload" };
    }
  }

  /**
   * Delete finance evidence by full file path (relative to bucket)
   */
  async deleteFinanceEvidence(filePath: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.financeBucket)
        .remove([filePath]);
      if (error) return { success: false, error: error.message };
      return { success: !!(data && data.length > 0) };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
    }
  }

  /**
   * Extract path from public URL for this.financeBucket
   */
  extractFinancePathFromUrl(url: string): string | null {
    try {
      const u = new URL(url);
      const parts = u.pathname.split("/");
      const idx = parts.findIndex((p) => p === this.financeBucket);
      if (idx >= 0 && idx < parts.length - 1) {
        return parts.slice(idx + 1).join("/");
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Extract path from public URL for cover image bucket
   */
  extractCoverImagePathFromUrl(url: string): string | null {
    try {
      const u = new URL(url);
      const parts = u.pathname.split("/");
      const idx = parts.findIndex((p) => p === this.coverImageBucket);
      if (idx >= 0 && idx < parts.length - 1) {
        return parts.slice(idx + 1).join("/");
      }
      return null;
    } catch {
      return null;
    }
  }
}

export const storageService = new StorageService();
