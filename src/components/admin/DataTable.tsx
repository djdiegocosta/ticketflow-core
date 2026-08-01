import * as React from "react";
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
        "overflow-x-auto rounded-[var(--radius-md)] border border-border-subtle bg-bg-secondary shadow-[var(--shadow-sm)]",
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
      <tr className="border-b border-border-subtle text-left">
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
}: {
  children?: React.ReactNode;
  variant?: CellVariant;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} className={cn("px-4 py-3", cellVariantClass[variant], className)}>
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
