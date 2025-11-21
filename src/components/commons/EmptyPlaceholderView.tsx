import { ReactElement, ReactNode } from "react";
import { useTranslations } from "next-intl";
import Button from "./Button";

interface EmptyPlaceholderViewProps {
  icon: ReactElement;
  title?: string;
  titleKey?: string;
  description?: string | ReactNode;
  descriptionKey?: string;
  buttonIcon?: ReactElement;
  buttonTitle?: string;
  buttonTitleKey?: string;
  buttonAction?: () => void;
  size?: "md" | "lg";
  buttonDisabled?: boolean;
  buttonTooltip?: string;
  buttonTooltipKey?: string;
  customButton?: ReactNode;
}

export default function EmptyPlaceholderView({
  icon,
  title,
  titleKey,
  description,
  descriptionKey,
  buttonIcon,
  buttonTitle,
  buttonTitleKey,
  buttonAction,
  size = "lg",
  buttonDisabled = false,
  buttonTooltip,
  buttonTooltipKey,
  customButton,
}: EmptyPlaceholderViewProps) {
  const t = useTranslations("emptyPlaceholder");

  // Use translation key if provided, otherwise use direct text (backward compatible)
  const displayTitle = titleKey ? t(titleKey) : title;
  const displayDescription = descriptionKey ? t(descriptionKey) : description;
  const displayButtonTitle = buttonTitleKey ? t(buttonTitleKey) : buttonTitle;
  const displayButtonTooltip = buttonTooltipKey
    ? t(buttonTooltipKey)
    : buttonTooltip;

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
            {displayTitle}
          </h3>
          <p
            className={`text-gray-600 dark:text-gray-400 ${
              size === "md" ? "text-sm" : "text-base"
            }`}
          >
            {displayDescription}
          </p>
        </div>
        {customButton
          ? customButton
          : displayButtonTitle &&
            buttonAction && (
              <Button
                variant="secondary"
                size="md"
                onClick={buttonAction}
                disabled={buttonDisabled}
                disableTooltipConent={displayButtonTooltip}
              >
                <div className="flex items-center gap-2">
                  {buttonIcon}
                  <p>{displayButtonTitle}</p>
                </div>
              </Button>
            )}
      </div>
    </div>
  );
}
