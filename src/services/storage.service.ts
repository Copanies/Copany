import { createClient } from "@/utils/supabase/client";

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export class StorageService {
  private supabase = createClient();
  private bucketName = "copany-logos";

  /**
   * Upload copany logo to Supabase Storage
   */
  async uploadLogo(file: File, copanyName: string): Promise<UploadResult> {
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
      const fileName = `${copanyName}-${Date.now()}.${fileExtension}`;
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
  getMaxFileSize(): number {
    return 1 * 1024 * 1024; // 1MB
  }
}

export const storageService = new StorageService();
