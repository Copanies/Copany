import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "approve";
  size?: "xs" | "sm" | "md" | "lg";
  children: React.ReactNode;
  shape?: "rectangle" | "square";
}

export default function Button({
  variant = "primary",
  size = "md",
  shape = "rectangle",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const baseClasses =
    "cursor-pointer rounded-md border-1 transition-colors duration-200 font-medium";

  const variantClasses = {
    primary:
      "bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100",
    secondary:
      "bg-transparent hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300",
    ghost:
      "bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 border-transparent dark:border-transparent text-gray-700 dark:text-gray-300",
    danger:
      "hover:bg-red-100 dark:hover:bg-red-900 border-red-600 dark:border-red-400 text-red-600 dark:text-red-400",
    approve:
      "bg-[#058E00] hover:bg-[#058E00]/80 dark:bg-[#058E00] dark:hover:bg-[#058E00]/80 text-white dark:text-white border-transparent",
  };

  const sizeClasses = {
    xs: "px-1 py-0.5 text-sm",
    sm: "px-2 py-1 text-sm",
    md: "px-2 py-1 text-base",
    lg: "px-4 py-2 text-base",
  };

  const shapeClasses = {
    rectangle: "",
    square: "aspect-square",
  };

  const disabledClasses = "disabled:opacity-50 disabled:cursor-not-allowed";

  const combinedClasses = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    shapeClasses[shape],
    disabledClasses,
    className,
  ].join(" ");

  return (
    <button className={combinedClasses} {...props}>
      {children}
    </button>
  );
}
