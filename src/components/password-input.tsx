"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

type PasswordInputProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  placeholder?: string;
  minLength?: number;
  pattern?: string;
  required?: boolean;
  disabled?: boolean;
  title?: string;
};

export function PasswordInput({
  id,
  value,
  onChange,
  autoComplete = "current-password",
  placeholder = "Password",
  minLength,
  pattern,
  required,
  disabled,
  title
}: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="password-field">
      <input
        id={id}
        type={isVisible ? "text" : "password"}
        autoComplete={autoComplete}
        spellCheck={false}
        placeholder={placeholder}
        value={value}
        minLength={minLength}
        pattern={pattern}
        required={required}
        disabled={disabled}
        title={title}
        onChange={(event) => onChange(event.target.value)}
      />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setIsVisible((current) => !current)}
        disabled={disabled}
        aria-label={isVisible ? "Hide password" : "Show password"}
      >
        {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}
