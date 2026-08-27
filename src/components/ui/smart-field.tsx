import * as React from "react";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SmartFieldProps {
  label: string;
  icon: React.ElementType;
  value: string;
  onChange: (value: string) => void;
  isValid?: boolean;
  placeholder?: string;
  type?: string;
  inputMode?: React.InputHTMLAttributes<HTMLInputElement>["inputMode"];
  error?: string;
}

export function SmartField({ label, icon: Icon, value, onChange, isValid, placeholder, type, inputMode, error }: SmartFieldProps) {
  return (
    <div className="space-y-1">
      <label className="text-micro font-bold uppercase">{label}</label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          inputMode={inputMode}
          className={cn("w-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-2 pl-10 pr-10 rounded-[var(--radius-sm)] outline-none", error ? "border-[var(--error)]" : "focus:border-[var(--accent)]")}
        />
        {React.createElement(Icon, { className: cn("absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none", error ? "text-[var(--error)]" : "text-[var(--text-disabled)]") })}
        <CheckCircle2 className={cn("absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-[var(--accent)] transition-opacity duration-200", isValid ? "opacity-100" : "opacity-0")} />
      </div>
      {error && <p className="text-micro text-[var(--error)]">{error}</p>}
    </div>
  );
}
