import React from 'react';

/**
 * 设备检测工具函数
 */

/**
 * 检测是否为移动设备
 * @returns boolean 是否为移动设备
 */
export function isMobileDevice(): boolean {
  // 在服务端渲染时返回 false
  if (typeof window === 'undefined') {
    return false;
  }

  // 检测触摸设备
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // 检测屏幕宽度 (小于 768px 认为是移动设备)
  const isSmallScreen = window.innerWidth < 768;
  
  // 检测用户代理字符串
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  const isMobileUA = mobileRegex.test(navigator.userAgent);
  
  return hasTouch && (isSmallScreen || isMobileUA);
}

/**
 * 检测是否为触摸设备
 * @returns boolean 是否支持触摸
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * 检测是否为桌面设备
 * @returns boolean 是否为桌面设备
 */
export function isDesktopDevice(): boolean {
  return !isMobileDevice();
}

/**
 * React Hook 用于检测移动设备
 * @returns boolean 是否为移动设备
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = React.useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return isMobileDevice();
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const checkDevice = () => {
      setIsMobile(isMobileDevice());
    };

    // 监听窗口大小变化
    window.addEventListener('resize', checkDevice);
    
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return isMobile;
}
