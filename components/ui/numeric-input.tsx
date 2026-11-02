"use client";

import { useRef, useCallback, forwardRef } from "react";

export interface NumericInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    | "onChange"
    | "onPaste"
    | "value"
    | "defaultValue"
    | "type"
    | "inputmode"
  > {
  mode?: "decimal" | "integer";
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const NumericInput = forwardRef<HTMLInputElement, NumericInputProps>(
  ({ mode = "decimal", onChange, className, ...props }, ref) => {
    const inputRef = useRef<HTMLInputElement | null>(null);

    const setRef = useCallback((el: HTMLInputElement | null) => {
      inputRef.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    }, [ref]);

    const sanitize = (raw: string): string => {
      if (mode === "integer") {
        return raw.replace(/\D/g, "");
      }
      let result = "";
      let sepCount = 0;
      for (const ch of raw) {
        if (/\d/.test(ch)) {
          result += ch;
        } else if ((ch === "," || ch === ".") && sepCount === 0) {
          result += ch;
          sepCount += 1;
        }
      }
      return result;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const sanitized = sanitize(e.target.value);
      if (inputRef.current) {
        inputRef.current.value = sanitized;
      }
      e.target.value = mode === "integer" ? sanitized : sanitized.replace(",", ".");
      onChange?.(e);
    };

    const handlePaste = (e: React.ClipboardEvent) => {
      e.preventDefault();
      const data = e.clipboardData?.getData("text") || "";
      const sanitized = sanitize(data);
      if (inputRef.current) {
        inputRef.current.value =
          mode === "integer" ? sanitized : sanitized.replace(",", ".");
        onChange?.({ target: inputRef.current } as React.ChangeEvent<HTMLInputElement>);
      }
    };

    return (
      <input
        ref={setRef}
        type="text"
        inputMode="decimal"
        onChange={handleChange}
        onPaste={handlePaste}
        className={className}
        {...props}
      />
    );
  }
);

NumericInput.displayName = "NumericInput";

export default NumericInput;
export { NumericInput };
