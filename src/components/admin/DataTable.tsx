import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Primitivas de tabela compartilhadas pelo admin.
 * Referência visual: tabela de Vendas (/admin/vendas).
 */

export function DataTableShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-x-auto border border-border-subtle bg-bg-secondary shadow-[var(--shadow-sm)] rounded-[var(--radius-md)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DataTable({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <table className={cn("w-full border-collapse", className)}>{children}</table>;
}

export function DataTableHeadRow({ columns }: { columns: React.ReactNode[] }) {
  return (
    <thead>
      <tr className="border-b border-border-subtle text-left bg-bg-tertiary transition-colors">
        {columns.map((h, i) => (
          <th key={i} className="px-4 py-3 text-small font-medium text-text-secondary">
            {h}
          </th>
        ))}
      </tr>
    </thead>
  );
}

export function DataTableRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <tr
      className={cn(
        "border-b border-border-subtle last:border-0 transition-colors hover:bg-bg-tertiary",
        className,
      )}
    >
      {children}
    </tr>
  );
}

type CellVariant = "primary" | "secondary" | "muted" | "strong";

const cellVariantClass: Record<CellVariant, string> = {
  primary: "text-body text-text-primary",
  secondary: "text-small text-text-secondary",
  muted: "text-small text-text-disabled",
  strong: "text-body font-semibold text-text-primary",
};

export function DataTableCell({
  children,
  variant = "secondary",
  className,
  colSpan,
  onClick,
}: {
  children?: React.ReactNode;
  variant?: CellVariant;
  className?: string;
  colSpan?: number;
  onClick?: () => void;
}) {
  return (
    <td
      colSpan={colSpan}
      onClick={onClick}
      className={cn("px-4 py-3", cellVariantClass[variant], className)}
    >
      {children}
    </td>
  );
}

export type PillTone = "accent" | "warning" | "error" | "success" | "info" | "neutral";

const pillToneClass: Record<PillTone, string> = {
  accent: "bg-accent-muted text-accent-text",
  warning: "bg-warning/15 text-warning",
  error: "bg-error/15 text-error",
  success: "bg-success/15 text-success",
  info: "bg-info/15 text-info",
  neutral: "bg-bg-tertiary text-text-secondary",
};

export function StatusPill({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: PillTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block rounded-[var(--radius-full)] px-2.5 py-0.5 text-micro font-medium",
        pillToneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * Paginação compartilhada de listagem: seletor 10/25/50/100 + indicador
 * "Mostrando X–Y de Z" + navegação. Único componente para todas as áreas.
 */
export function DataTablePagination({
  pageSize,
  onPageSizeChange,
  currentPage,
  totalPages,
  totalItems,
  startIndex,
  onPageChange,
}: {
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex flex-col items-center justify-between gap-4 border-t border-border-subtle pt-4 sm:flex-row">
      <div className="flex items-center gap-4 text-small text-text-secondary">
        <div className="flex items-center gap-2">
          Mostrar
          <select
            aria-label="Itens por página"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="border border-border-default bg-bg-secondary px-2 py-1 outline-none focus:border-accent rounded-[var(--radius-sm)]"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <span>
          Mostrando {totalItems === 0 ? 0 : startIndex + 1}–
          {Math.min(startIndex + pageSize, totalItems)} de {totalItems}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Página anterior"
          disabled={currentPage === 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          className="border border-border-default p-2 text-text-primary transition-colors hover:border-accent disabled:cursor-not-allowed disabled:text-text-disabled rounded-[var(--radius-sm)]"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-small text-text-secondary">
          {currentPage} / {totalPages}
        </span>
        <button
          type="button"
          aria-label="Próxima página"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          className="border border-border-default p-2 text-text-primary transition-colors hover:border-accent disabled:cursor-not-allowed disabled:text-text-disabled rounded-[var(--radius-sm)]"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
