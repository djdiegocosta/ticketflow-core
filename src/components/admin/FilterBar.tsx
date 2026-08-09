import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Barra de filtros padrão do admin (seção 11 do Design System):
 * abas/dropdowns/busca à esquerda, ações à direita, mesma linha e mesmo gap.
 */
export const filterFieldClass =
  "h-10 border border-border-default bg-bg-secondary px-3 text-body text-text-primary outline-none transition-colors focus:border-accent rounded-[var(--radius-sm)]";

export function FilterBar({
  children,
  actions,
  className,
}: {
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-3">{children}</div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}

export function FilterSearch({
  value,
  onChange,
  placeholder,
  label,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-disabled" />
      <input
        aria-label={label ?? placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          filterFieldClass,
          "w-full pl-9 pr-3 placeholder:text-text-disabled sm:w-[280px]",
        )}
      />
    </div>
  );
}

export function FilterTabs({
  tabs,
  value,
  onChange,
}: {
  tabs: string[];
  value: string;
  onChange: (tab: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-border-subtle">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={cn(
            "border-b-2 px-4 py-2 text-body transition-colors",
            value === tab
              ? "border-accent bg-accent-muted text-accent-text rounded-t-[var(--radius-sm)]"
              : "border-transparent text-text-secondary hover:bg-bg-tertiary rounded-t-[var(--radius-sm)]",
          )}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
