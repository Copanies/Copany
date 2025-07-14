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
   * 上传 copany logo 到 Supabase Storage
   */
  async uploadLogo(file: File, copanyId: string): Promise<UploadResult> {
    try {
      // 验证文件类型
      if (!this.isValidImageFile(file)) {
        return {
          success: false,
          error: "请选择有效的图片文件 (PNG, JPG, JPEG, GIF, WebP)",
        };
      }

      // 生成唯一的文件名
      const fileExtension = file.name.split(".").pop();
      const fileName = `${copanyId}-${Date.now()}.${fileExtension}`;
      const filePath = `logos/${fileName}`;

      // 上传文件到 Supabase Storage
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        console.error("上传失败:", error);
        return {
          success: false,
          error: `上传失败: ${error.message}`,
        };
      }

      // 获取公共 URL
      const { data: urlData } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      return {
        success: true,
        url: urlData.publicUrl,
      };
    } catch (error) {
      console.error("上传过程中发生错误:", error);
      return {
        success: false,
        error: "上传过程中发生未知错误",
      };
    }
  }

  /**
   * 删除 copany logo
   */
  async deleteLogo(filePath: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) {
        console.error("删除失败:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("删除过程中发生错误:", error);
      return false;
    }
  }

  /**
   * 验证文件是否为有效的图片文件
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
   * 获取文件大小限制（5MB）
   */
  getMaxFileSize(): number {
    return 5 * 1024 * 1024; // 5MB
  }
}

export const storageService = new StorageService();
