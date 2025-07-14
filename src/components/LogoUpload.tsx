'use client';

import { useState, useRef } from 'react';
import { storageService, UploadResult } from '@/services/storage.service';

interface LogoUploadProps {
  copanyId: string;
  onUploadSuccess?: (url: string) => void;
  onUploadError?: (error: string) => void;
}

export default function LogoUpload({ 
  copanyId, 
  onUploadSuccess, 
  onUploadError 
}: LogoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 检查文件大小
    const maxSize = storageService.getMaxFileSize();
    if (file.size > maxSize) {
      const errorMsg = `文件大小不能超过 ${Math.round(maxSize / 1024 / 1024)}MB`;
      setUploadResult({ success: false, error: errorMsg });
      onUploadError?.(errorMsg);
      return;
    }

    setSelectedFile(file);
    setUploadResult(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadResult(null);

    try {
      const result = await storageService.uploadLogo(selectedFile, copanyId);
      setUploadResult(result);

      if (result.success && result.url) {
        onUploadSuccess?.(result.url);
      } else if (result.error) {
        onUploadError?.(result.error);
      }
    } catch (error) {
      const errorMsg = '上传过程中发生未知错误';
      setUploadResult({ success: false, error: errorMsg });
      onUploadError?.(errorMsg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="logo-upload" className="block text-sm font-medium mb-2">
          选择 Copany Logo
        </label>
        <input
          ref={fileInputRef}
          id="logo-upload"
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
          onChange={handleFileSelect}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        <p className="mt-1 text-sm text-gray-500">
          支持 PNG, JPG, JPEG, GIF, WebP 格式，最大 5MB
        </p>
      </div>

      {selectedFile && (
        <div className="space-y-2">
          <div className="text-sm">
            <strong>已选择文件:</strong> {selectedFile.name}
          </div>
          <div className="text-sm text-gray-500">
            大小: {Math.round(selectedFile.size / 1024)} KB
          </div>
          
          {/* 图片预览 */}
          <div className="mt-2">
            <img
              src={URL.createObjectURL(selectedFile)}
              alt="Logo 预览"
              className="max-w-xs max-h-32 object-contain border rounded"
            />
          </div>
        </div>
      )}

      <div className="flex space-x-2">
        <button
          onClick={handleUpload}
          disabled={!selectedFile || isUploading}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isUploading ? '上传中...' : '上传 Logo'}
        </button>
        
        {selectedFile && (
          <button
            onClick={handleReset}
            disabled={isUploading}
            className="px-4 py-2 bg-gray-500 text-white rounded disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            重置
          </button>
        )}
      </div>

      {/* 上传结果显示 */}
      {uploadResult && (
        <div className={`p-3 rounded ${
          uploadResult.success 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {uploadResult.success ? (
            <div>
              <p className="font-medium">上传成功！</p>
              {uploadResult.url && (
                <div className="mt-2">
                  <p className="text-sm">Logo URL:</p>
                  <a 
                    href={uploadResult.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm break-all"
                  >
                    {uploadResult.url}
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div>
              <p className="font-medium">上传失败</p>
              <p className="text-sm">{uploadResult.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 