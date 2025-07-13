import { useState, useEffect } from "react";

/**
 * 检测当前是否为 dark mode
 */
function checkDarkMode(): boolean {
  if (typeof window === "undefined") return false;

  const htmlElement = document.documentElement;
  return (
    htmlElement.classList.contains("dark") ||
    (window.matchMedia("(prefers-color-scheme: dark)").matches &&
      !htmlElement.classList.contains("light"))
  );
}

/**
 * 自定义 hook 用于检测 dark mode 状态
 * 统一项目中的 dark mode 检测逻辑
 * 使用懒初始化避免延迟问题
 */
export function useDarkMode(): boolean {
  // 使用懒初始化，首次渲染时就获得正确的值
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // 服务端渲染时返回 false，避免水化不匹配
    if (typeof window === "undefined") return false;
    return checkDarkMode();
  });

  useEffect(() => {
    // 客户端挂载后立即同步状态，确保正确性
    const currentDarkMode = checkDarkMode();
    if (currentDarkMode !== isDarkMode) {
      setIsDarkMode(currentDarkMode);
    }

    // 监听系统偏好变化
    const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => setIsDarkMode(checkDarkMode());

    darkModeQuery.addEventListener("change", handleChange);

    // 监听 HTML 元素 class 变化（手动主题切换）
    const observer = new MutationObserver(handleChange);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // 清理函数
    return () => {
      darkModeQuery.removeEventListener("change", handleChange);
      observer.disconnect();
    };
  }, [isDarkMode]);

  return isDarkMode;
}
