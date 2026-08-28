import { Download } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Search,
  FileText as FileTextIcon,
} from "lucide-react";

// Estilo consistente para selects e inputs de filtro no admin
import { cn } from "@/lib/utils";

export const filterFieldClass =
  "border border-border-default bg-bg-secondary px-3 py-2 text-small text-text-primary outline-none transition-colors focus:border-accent";

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
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
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
    <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-muted/60 p-1">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`flex-shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            value === tab
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
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
      className={`h-9 rounded-lg border border-input bg-background px-3 pr-8 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23525566%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_0.5rem_center] cursor-pointer ${className}`}
    >
      {children}
    </select>
  );
}

export interface FilterExportButtonProps {
  onExportCsv: () => void;
  onGeneratePdf: () => void;
}

export function FilterExportButton({ onExportCsv, onGeneratePdf }: FilterExportButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 shrink-0">
          <Download className="h-4 w-4" />
          <span>Exportar</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onExportCsv}>
          <FileTextIcon className="mr-2 h-4 w-4" />
          Exportar CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onGeneratePdf}>
          <Download className="mr-2 h-4 w-4" />
          Gerar lista PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
