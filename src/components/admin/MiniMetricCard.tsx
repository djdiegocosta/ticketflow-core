import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Card compacto de mini dashboard de área (Vendas, Cortesias, Clientes, Remarketing).
 * Componente-base único: ícone + valor principal (heading-1) + label (small).
 * Altura uniforme garantida por h-full + grid da área.
 */
export function MiniMetricCard({
  title,
  value,
  subtext,
  icon: Icon,
  iconColor,
  gaugeValue,
  headerRight,
  children,
  className,
}: {
  title: string;
  value?: string | number;
  subtext?: string;
  icon?: React.ElementType;
  iconColor?: string;
  gaugeValue?: number;
  headerRight?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-full min-h-[104px] flex-col border border-border-subtle bg-bg-secondary p-3.5 shadow-[var(--shadow-sm)] rounded-[var(--radius-md)]",
        className,
      )}
    >
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <span className="text-small text-text-secondary">{title}</span>
        {headerRight ??
          (Icon ? <Icon className={cn("h-4 w-4", iconColor ?? "text-text-secondary")} /> : null)}
      </div>
      <div className="flex flex-1 items-end justify-between gap-2">
        <div className="flex-1">
          {children ?? (
            <>
              <div className="text-heading-1 text-text-primary">{value}</div>
              {subtext && <div className="mt-0.5 text-small text-text-secondary">{subtext}</div>}
            </>
          )}
        </div>
        {gaugeValue !== undefined && (
          <div className="relative h-[38px] w-[68px] shrink-0">
            <svg viewBox="0 0 90 50" width="68" height="38" className="block">
              <path
                d="M 8 46 A 37 37 0 0 1 82 46"
                fill="none"
                stroke="var(--bg-tertiary)"
                strokeWidth={10}
                strokeLinecap="round"
              />
              <path
                d="M 8 46 A 37 37 0 0 1 82 46"
                fill="none"
                stroke="var(--warning)"
                strokeWidth={10}
                strokeLinecap="round"
                strokeDasharray={Math.PI * 37}
                strokeDashoffset={Math.PI * 37 * (1 - gaugeValue / 100)}
              />
            </svg>
            <span className="absolute inset-x-0 bottom-0 text-center text-small font-semibold text-text-primary">
              {Math.round(gaugeValue)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/** Grid padrão para os mini dashboards de área. */
export function MiniMetricGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
