import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
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
      "bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100",
    secondary:
      "bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300",
    ghost:
      "bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 border-transparent dark:border-transparent text-gray-700 dark:text-gray-300",
    danger:
      "bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300",
  };

  const sizeClasses = {
    sm: "px-2 py-1 text-base",
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
