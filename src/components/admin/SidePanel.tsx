import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Painel lateral (Sheet) — componente-base único do admin.
 * Abre da direita, 480px, transição 300ms, cabeçalho fixo, barra de steps
 * opcional e rodapé fixo de ações. Só o conteúdo interno varia.
 */
export function SidePanel({
  open,
  onClose,
  title,
  steps,
  currentStep,
  footer,
  children,
  overlayClassName,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  steps?: string[];
  currentStep?: number;
  footer?: React.ReactNode;
  children: React.ReactNode;
  overlayClassName?: string;
}) {
  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/45 transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0",
          overlayClassName,
        )}
        onClick={onClose}
      />

      {/* Painel */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-[480px] flex-col border-l border-border-subtle bg-bg-primary shadow-[var(--shadow-lg)] transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Cabeçalho */}
        <div className="flex shrink-0 items-center justify-between border-b border-border-subtle px-6 py-4">
          <h2 className="text-heading-2 text-text-primary">{title}</h2>
          <button
            type="button"
            aria-label="Fechar painel"
            onClick={onClose}
            className="p-1 text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary rounded-[var(--radius-sm)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Barra de progresso (steps) */}
        {steps && steps.length > 1 && currentStep !== undefined && (
          <div className="shrink-0 border-b border-border-subtle px-6 py-4">
            <div className="mb-2 h-1 w-full bg-bg-tertiary rounded-[var(--radius-full)]">
              <div
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${(currentStep / steps.length) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-micro font-medium">
              {steps.map((label, i) => (
                <span
                  key={label}
                  className={currentStep >= i + 1 ? "text-text-primary" : "text-text-secondary"}
                >
                  {i + 1}. {label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>

        {/* Rodapé */}
        {footer && (
          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border-subtle bg-bg-primary px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </>
  );
}

export const panelInputClass =
  "w-full border border-border-default bg-bg-secondary px-3.5 py-2.5 text-body text-text-primary outline-none transition-colors placeholder:text-text-disabled focus:border-accent rounded-[var(--radius-sm)]";
export const panelLabelClass = "mb-2 block text-small text-text-secondary";
export const panelErrorClass = "mt-1 text-small text-error";

export function PanelCancelButton({
  children = "Cancelar",
  onClick,
}: {
  children?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-body text-text-secondary transition-colors hover:text-text-primary"
    >
      {children}
    </button>
  );
}

export function PanelPrimaryButton({
  children,
  onClick,
  className,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-1 bg-accent px-5 py-2.5 text-body font-semibold leading-none text-[#111111] transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 rounded-[var(--radius-sm)]",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function PanelSecondaryButton({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-1 border border-border-default bg-bg-tertiary px-5 py-2.5 text-body leading-none text-text-primary transition-colors hover:border-accent rounded-[var(--radius-sm)]",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Modal de confirmação de descarte usado pelos painéis. */
export function PanelDiscardDialog({
  open,
  title,
  description,
  onKeepEditing,
  onDiscard,
}: {
  open: boolean;
  title: string;
  description: string;
  onKeepEditing: () => void;
  onDiscard: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-6">
      <div className="w-full max-w-[400px] border border-border-subtle bg-bg-primary p-6 shadow-[var(--shadow-lg)] rounded-[var(--radius-md)]">
        <h3 className="text-heading-2 text-text-primary">{title}</h3>
        <p className="mt-2 text-body text-text-secondary">{description}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onKeepEditing}
            className="px-4 py-2 text-body text-text-secondary transition-colors hover:text-text-primary"
          >
            Continuar editando
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="bg-error px-4 py-2 text-body font-semibold text-white transition-opacity hover:opacity-90 rounded-[var(--radius-sm)]"
          >
            Descartar
          </button>
        </div>
      </div>
    </div>
  );
}
