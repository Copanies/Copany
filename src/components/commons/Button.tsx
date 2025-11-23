import React from "react";
import * as Tooltip from "@radix-ui/react-tooltip";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "text" | "danger" | "approve";
  size?: "xs" | "sm" | "md" | "lg";
  children: React.ReactNode;
  shape?: "rectangle" | "square";
  // When button is disabled, show tooltip with this content. Keep name per request.
  disableTooltipConent?: React.ReactNode;
}

export default function Button({
  variant = "secondary",
  size = "md",
  shape = "rectangle",
  className = "",
  children,
  disableTooltipConent,
  ...props
}: ButtonProps) {
  const baseClasses =
    "cursor-pointer rounded-md border-1 transition-colors duration-200 font-base";

  const variantClasses = {
    primary:
      "bg-gray-800 hover:bg-gray-800/80 dark:bg-gray-100 dark:hover:bg-gray-100/80 border-gray-800 dark:border-gray-100 text-white dark:text-black",
    secondary:
      "bg-white hover:bg-gray-100 dark:bg-background-dark dark:hover:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100",
    ghost:
      "bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 border-transparent dark:border-transparent text-gray-900 dark:text-gray-100",
    text: "bg-transparent text-blue-500 hover:text-blue-500/80 hover:underline border-transparent border-0",
    danger:
      "hover:bg-red-700 dark:hover:bg-red-700 border-gray-300 hover:border-red-700 dark:border-gray-700 dark:hover:border-red-700 text-red-600 dark:text-red-400 hover:text-white dark:hover:text-white",
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

  const buttonElement = (
    <button className={combinedClasses} {...props}>
      {children}
    </button>
  );

  const shouldShowDisabledTooltip = !!props.disabled && !!disableTooltipConent;

  if (shouldShowDisabledTooltip) {
    return (
      <Tooltip.Provider delayDuration={150} skipDelayDuration={300}>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <div className="inline-block">{buttonElement}</div>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              side="bottom"
              sideOffset={8}
              align="start"
              className="tooltip-surface"
            >
              {disableTooltipConent}
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    );
  }

  return buttonElement;
}
