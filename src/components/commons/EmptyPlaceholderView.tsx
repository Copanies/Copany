import { ReactElement } from "react";
import Button from "./Button";

interface EmptyPlaceholderViewProps {
  icon: ReactElement;
  title: string;
  description: string;
  buttonIcon?: ReactElement;
  buttonTitle?: string;
  buttonAction?: () => void;
  size?: "md" | "lg";
}

export default function EmptyPlaceholderView({
  icon,
  title,
  description,
  buttonIcon,
  buttonTitle,
  buttonAction,
  size = "lg",
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
        {buttonTitle && buttonAction && (
          <Button variant="primary" size="sm" onClick={buttonAction}>
            <div className="flex items-center gap-2">
              {buttonIcon}
              <p>{buttonTitle}</p>
            </div>
          </Button>
        )}
      </div>
    </div>
  );
}
