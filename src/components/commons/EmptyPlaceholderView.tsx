import { ReactElement } from "react";
import Button from "./Button";

interface EmptyPlaceholderViewProps {
  icon: ReactElement;
  title: string;
  description: string;
  buttonIcon?: ReactElement;
  buttonTitle?: string;
  buttonAction?: () => void;
}

export default function EmptyPlaceholderView({
  icon,
  title,
  description,
  buttonIcon,
  buttonTitle,
  buttonAction,
}: EmptyPlaceholderViewProps) {
  return (
    <div className="py-8 text-center max-w-xl mx-auto">
      <div className="flex flex-col items-center gap-5">
        {icon}
        <div className="flex flex-col items-center gap-2">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">{description}</p>
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
