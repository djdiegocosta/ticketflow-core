import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Botão de ação principal (spec seção 7 do Design System):
 * fundo accent, texto #111111, padding 10px 20px, 14px / peso 600, cantos retos.
 * A única variação permitida é a largura (conforme o texto).
 */
export const primaryActionClass =
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap bg-accent px-5 py-2.5 text-body font-semibold leading-none text-[#111111] transition-colors hover:bg-accent-hover rounded-[var(--radius-sm)]";

export function PrimaryActionButton({
  children,
  onClick,
  className,
  withIcon = true,
  type = "button",
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  withIcon?: boolean;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button 
      type={type} 
      onClick={onClick} 
      disabled={disabled}
      className={cn(
        primaryActionClass, 
        disabled && "opacity-50 cursor-not-allowed grayscale",
        className
      )}
    >
      {withIcon && <Plus className="h-4 w-4" />}
      {children}
    </button>
  );
}

export function PrimaryActionLink({
  to,
  children,
  className,
  withIcon = true,
}: {
  to: string;
  children: React.ReactNode;
  className?: string;
  withIcon?: boolean;
}) {
  return (
    <Link to={to} className={cn(primaryActionClass, className)}>
      {withIcon && <Plus className="h-4 w-4" />}
      {children}
    </Link>
  );
}

/** Cabeçalho de listagem: ação principal à direita. Título movido para a TopBar. */
export function ListPageHeader({
  title: _title,
  action,
}: {
  title?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-end">
      {action}
    </div>
  );
}
