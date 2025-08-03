export default function LicenseBadge({ license }: { license: string }) {
  // 为 COSL 使用绿色渐变，其他 license 使用蓝色渐变
  const isCosl = license === "COSL";
  const gradientClass = isCosl
    ? "bg-gradient-to-b from-[#2ecc71] to-[#27ae60]" // 更鲜艳的绿色渐变
    : "bg-gradient-to-b from-[#007ec6] to-[#0366a3]"; // 默认蓝色渐变

  return (
    <div className="inline-flex items-center ml-2 overflow-hidden text-xs font-medium">
      <span className="px-2 py-[2px] rounded-l-sm text-white [text-shadow:_0_1px_0_rgb(0_0_0_/_20%)] bg-gradient-to-b from-gray-600 to-gray-700">
        license
      </span>
      <span
        className={`px-2 py-[2px] rounded-r-sm text-white [text-shadow:_0_1px_0_rgb(0_0_0_/_20%)] ${gradientClass}`}
      >
        {license}
      </span>
    </div>
  );
}
