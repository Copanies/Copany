"use client";

import { useState } from "react";
import LogoUpload from "@/components/LogoUpload";

export default function LogoUploadPage() {
  const [copanyId, setCopanyId] = useState("");
  const [uploadedLogos, setUploadedLogos] = useState<string[]>([]);

  const handleUploadSuccess = (url: string) => {
    setUploadedLogos((prev) => [...prev, url]);
  };

  const handleUploadError = (error: string) => {
    console.error("上传失败:", error);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Copany Logo 上传
          </h1>

          <div className="space-y-6">
            {/* Copany ID 输入 */}
            <div>
              <label
                htmlFor="copany-id"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Copany ID
              </label>
              <input
                id="copany-id"
                type="text"
                value={copanyId}
                onChange={(e) => setCopanyId(e.target.value)}
                placeholder="请输入 Copany ID"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-sm text-gray-500">
                这将用于生成唯一的文件名
              </p>
            </div>

            {/* 上传组件 */}
            {copanyId && (
              <LogoUpload
                copanyId={copanyId}
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
              />
            )}

            {!copanyId && (
              <div className="text-center py-8 text-gray-500">
                请先输入 Copany ID 以启用上传功能
              </div>
            )}
          </div>

          {/* 已上传的 Logo 列表 */}
          {uploadedLogos.length > 0 && (
            <div className="mt-8 pt-6 border-t">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                已上传的 Logo ({uploadedLogos.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {uploadedLogos.map((url, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <img
                      src={url}
                      alt={`Logo ${index + 1}`}
                      className="w-full h-32 object-contain mb-2"
                    />
                    <div className="text-sm text-gray-600 break-all">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        查看原图
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 使用说明 */}
          <div className="mt-8 pt-6 border-t">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              使用说明
            </h2>
            <div className="text-sm text-gray-600 space-y-2">
              <p>• 支持的图片格式: PNG, JPG, JPEG, GIF, WebP</p>
              <p>• 最大文件大小: 5MB</p>
              <p>• 文件将上传到 Supabase Storage 的 "copany-logos" bucket</p>
              <p>• 文件名格式: [copanyId]-[时间戳].[扩展名]</p>
              <p>• 上传成功后会显示公共访问 URL</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
