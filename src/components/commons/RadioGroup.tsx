"use client";

import React from "react";

export interface RadioOption {
  value: string | boolean;
  label: string;
}

export interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  value: string | boolean;
  onChange: (value: string | boolean) => void;
  className?: string;
  disabled?: boolean;
}

export default function RadioGroup({
  name,
  options,
  value,
  onChange,
  className = "",
  disabled = false,
}: RadioGroupProps) {
  const handleChange = (optionValue: string | boolean) => {
    if (!disabled) {
      onChange(optionValue);
    }
  };

  return (
    <div className={`flex flex-col items-start gap-4 w-full ${className}`}>
      {options.map((option) => (
        <label
          key={option.value.toString()}
          className={`flex items-center gap-2 cursor-pointer ${
            disabled ? "cursor-not-allowed opacity-50" : ""
          }`}
        >
          <input
            type="radio"
            name={name}
            value={option.value.toString()}
            checked={value === option.value}
            onChange={() => handleChange(option.value)}
            className="sr-only"
            disabled={disabled}
          />
          <div
            className={`w-5 h-5 rounded-full border-2 border-gray-800 dark:border-gray-200 relative flex-shrink-0 ${
              value === option.value
                ? "bg-gray-800 dark:bg-gray-200"
                : "bg-transparent"
            } ${disabled ? "opacity-50" : ""}`}
          >
            {value === option.value && (
              <div className="w-2 h-2 bg-white dark:bg-gray-900 rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            )}
          </div>

          <span className="text-sm font-normal text-gray-900 dark:text-gray-100">
            {option.label}
          </span>
        </label>
      ))}
    </div>
  );
}
