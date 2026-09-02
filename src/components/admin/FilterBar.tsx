import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

// Estilo consistente para selects e inputs de filtro no admin
export const filterFieldClass =
  "border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-2 text-small text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--accent)]";

export interface FilterBarProps {
  children?: React.ReactNode;
  actions?: React.ReactNode;
}

export function FilterBar({ children, actions }: FilterBarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex flex-1 items-center gap-2 min-w-0">
        {children}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

export interface FilterSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function FilterSearch({ value, onChange, placeholder = "Buscar..." }: FilterSearchProps) {
  return (
    <div className="relative flex flex-1 min-w-0">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)] pointer-events-none" />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9 rounded-full w-full min-w-0"
      />
    </div>
  );
}

export interface FilterTabsProps {
  tabs: readonly string[];
  value: string;
  onChange: (tab: string) => void;
}

export function FilterTabs({ tabs, value, onChange }: FilterTabsProps) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-[var(--bg-tertiary)] p-1">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`flex-shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            value === tab
              ? "bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

export interface FilterSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode;
}

export function FilterSelect({ children, className = "", ...props }: FilterSelectProps) {
  return (
    <select
      {...props}
      className={`h-9 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 pr-8 text-sm text-[var(--text-primary)] ring-offset-background focus:outline-none focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23525566%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_0.5rem_center] cursor-pointer ${className}`}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236E6E73' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
      }}
    >
      {children}
    </select>
  );
}

export interface FilterExportButtonProps {
  onGeneratePdf: () => void;
}

export function FilterExportButton({ onGeneratePdf }: FilterExportButtonProps) {
  return (
    <Button
      type="button"
      onClick={onGeneratePdf}
      className={cn(
        "h-10 shrink-0 gap-2 rounded-[var(--radius-sm)] bg-accent px-5 py-2.5 text-body font-semibold leading-none text-[#111111] hover:bg-accent-hover",
      )}
      title="Gerar lista PDF"
      aria-label="Gerar lista PDF"
    >
      <Download className="h-4 w-4" />
      <span className="hidden sm:inline">PDF</span>
    </Button>
  );
}
