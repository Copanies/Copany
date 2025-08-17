export default function LicenseBadge({ license }: { license: string }) {
  // 处理显示文本
  const displayText = license === "NOASSERTION" ? "Other" : license;

  // 为不同的 license 类型选择不同的颜色
  let gradientClass = "bg-gradient-to-b from-[#007ec6] to-[#0366a3]"; // 默认蓝色渐变

  if (license === "COSL") {
    gradientClass = "bg-gradient-to-b from-[#2ecc71] to-[#27ae60]"; // 绿色渐变
  } else if (license === "NOASSERTION") {
    gradientClass = "bg-gradient-to-b from-[#95a5a6] to-[#7f8c8d]"; // 浅灰色渐变
  }

  return (
    <div className="inline-flex items-center overflow-hidden text-sm font-medium">
      <span className="px-2 py-[2px] rounded-l-sm text-white [text-shadow:_0_1px_0_rgb(0_0_0_/_20%)] bg-gradient-to-b from-gray-600 to-gray-700">
        license
      </span>
      <span
        className={`px-2 py-[2px] rounded-r-sm text-white [text-shadow:_0_1px_0_rgb(0_0_0_/_20%)] ${gradientClass}`}
      >
        {displayText}
      </span>
    </div>
  );
}
