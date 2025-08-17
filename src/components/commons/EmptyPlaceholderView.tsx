import { ReactElement } from "react";
import Button from "./Button";
import * as Tooltip from "@radix-ui/react-tooltip";

interface EmptyPlaceholderViewProps {
  icon: ReactElement;
  title: string;
  description: string;
  buttonIcon?: ReactElement;
  buttonTitle?: string;
  buttonAction?: () => void;
  size?: "md" | "lg";
  buttonDisabled?: boolean;
  buttonTooltip?: string;
}

export default function EmptyPlaceholderView({
  icon,
  title,
  description,
  buttonIcon,
  buttonTitle,
  buttonAction,
  size = "lg",
  buttonDisabled = false,
  buttonTooltip,
}: EmptyPlaceholderViewProps) {
  return (
    <div
      className={`py-8 px-4 text-center mx-auto ${
        size === "md" ? "max-w-md" : "max-w-xl"
      }`}
    >
      <div className="flex flex-col items-center gap-5">
        {icon}
        <div className="flex flex-col items-center gap-2">
          <h3
            className={`font-semibold text-gray-900 dark:text-gray-100 ${
              size === "md" ? "text-base" : "text-xl"
            }`}
          >
            {title}
          </h3>
          <p
            className={`text-gray-600 dark:text-gray-400 ${
              size === "md" ? "text-sm" : "text-base"
            }`}
          >
            {description}
          </p>
        </div>
        {buttonTitle &&
          buttonAction &&
          (buttonDisabled ? (
            <Tooltip.Provider delayDuration={150} skipDelayDuration={300}>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <div className="inline-block">
                    <Button
                      variant="primary"
                      size="md"
                      onClick={buttonAction}
                      disabled
                    >
                      <div className="flex items-center gap-2">
                        {buttonIcon}
                        <p>{buttonTitle}</p>
                      </div>
                    </Button>
                  </div>
                </Tooltip.Trigger>
                {buttonTooltip ? (
                  <Tooltip.Portal>
                    <Tooltip.Content
                      side="bottom"
                      sideOffset={8}
                      align="center"
                      className="z-[9999] rounded bg-white text-gray-900 text-sm px-3 py-2 shadow-lg border border-gray-200 w-80 md:w-96 whitespace-pre-line break-words"
                    >
                      {buttonTooltip}
                    </Tooltip.Content>
                  </Tooltip.Portal>
                ) : null}
              </Tooltip.Root>
            </Tooltip.Provider>
          ) : (
            <Button variant="primary" size="md" onClick={buttonAction}>
              <div className="flex items-center gap-2">
                {buttonIcon}
                <p>{buttonTitle}</p>
              </div>
            </Button>
          ))}
      </div>
    </div>
  );
}
