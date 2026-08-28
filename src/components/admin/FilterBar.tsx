import * as React from "react";
import { Search, Download } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * Barra de filtros padrão do admin (seção 11 do Design System):
 * abas/dropdowns/busca à esquerda, ações à direita, mesma linha e mesmo gap.
 */
export const filterFieldClass =
  "h-10 w-full border border-border-default bg-bg-secondary px-3 text-body text-text-primary outline-none transition-colors focus:border-accent rounded-[var(--radius-sm)] flex-shrink-0";

export const filterFieldCompactClass =
  "h-10 border border-border-default bg-bg-secondary px-3 text-body text-text-primary outline-none transition-colors focus:border-accent rounded-[var(--radius-sm)] flex-shrink-0";

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
        "flex flex-col gap-3 md:flex-row md:items-center md:justify-between",
        className,
      )}
    >
      <div className="grid w-full grid-cols-1 gap-3 min-[480px]:grid-cols-[1fr_auto_auto] md:flex md:w-auto md:flex-wrap md:items-center">
        {children}
      </div>
      {actions && (
        <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
          {actions}
        </div>
      )}
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
    <div className={cn("relative w-full md:min-w-[260px] md:flex-1 md:max-w-[400px]", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-disabled" />
      <input
        aria-label={label ?? placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-10 w-full border-2 border-accent bg-bg-secondary pl-9 pr-3 text-body text-text-primary outline-none transition-colors placeholder:text-text-disabled focus:border-accent focus:ring-2 focus:ring-accent/20",
        )}
      />
    </div>
  );
}

export function FilterSelect({
  value,
  onChange,
  children,
  className,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
  "aria-label": string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(filterFieldCompactClass, "w-auto min-w-[120px] cursor-pointer", className)}
    >
      {children}
    </select>
  );
}

export function FilterExportButton({
  onExportCsv,
  onGeneratePdf,
}: {
  onExportCsv: () => void;
  onGeneratePdf: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title="Exportar vendas"
          aria-label="Exportar vendas"
          className="inline-flex h-10 w-10 items-center justify-center border border-border-default bg-bg-tertiary text-text-secondary transition-colors hover:border-accent hover:text-accent rounded-[var(--radius-sm)]"
        >
          <Download className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        <DropdownMenuItem onClick={onExportCsv} className="cursor-pointer">
          Exportar CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onGeneratePdf} className="cursor-pointer">
          Gerar lista PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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
              ? "border-accent bg-accent-muted text-accent-text rounded-t-[var(--radius-sm)] dark:border-b-2"
              : "border-transparent text-text-secondary hover:bg-bg-tertiary rounded-t-[var(--radius-sm)]",
          )}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
