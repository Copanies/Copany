/**
 * 生成带 shimmer 动画效果的灰色占位符 base64 数据
 * 用于 Next.js Image 组件的 placeholder
 */

const shimmer = (w: number, h: number) => `
<svg width="${w}" height="${h}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="g">
      <stop stop-color="#e5e7eb" offset="20%" />
      <stop stop-color="#f3f4f6" offset="50%" />
      <stop stop-color="#e5e7eb" offset="70%" />
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="#e5e7eb" />
  <rect id="r" width="${w}" height="${h}" fill="url(#g)" />
  <animate xlink:href="#r" attributeName="x" from="-${w}" to="${w}" dur="1s" repeatCount="indefinite"  />
</svg>`;

const toBase64 = (str: string) =>
  typeof window === "undefined"
    ? Buffer.from(str).toString("base64")
    : window.btoa(str);

/**
 * 生成带 shimmer 加载动画的占位符 Data URL
 * @param w - 宽度
 * @param h - 高度
 * @returns Data URL 字符串，可直接用于 Image 的 blurDataURL 属性
 */
export const shimmerDataUrl = (w: number = 400, h: number = 400) =>
  `data:image/svg+xml;base64,${toBase64(shimmer(w, h))}`;

/**
 * 暗色模式下的 shimmer 效果
 */
const shimmerDark = (w: number, h: number) => `
<svg width="${w}" height="${h}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="g">
      <stop stop-color="#374151" offset="20%" />
      <stop stop-color="#4b5563" offset="50%" />
      <stop stop-color="#374151" offset="70%" />
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="#374151" />
  <rect id="r" width="${w}" height="${h}" fill="url(#g)" />
  <animate xlink:href="#r" attributeName="x" from="-${w}" to="${w}" dur="1s" repeatCount="indefinite"  />
</svg>`;

/**
 * 暗色模式下的 shimmer Data URL
 */
export const shimmerDarkDataUrl = (w: number = 400, h: number = 400) =>
  `data:image/svg+xml;base64,${toBase64(shimmerDark(w, h))}`;

