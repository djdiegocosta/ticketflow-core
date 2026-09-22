import type { ComponentType, SVGProps } from "react";
import { cn } from "@/lib/utils";

export interface DashboardMetricCardProps {
  title: string;
  value: string | number;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  trend?: string;
  secondary?: string;
  gaugeValue?: number;
  iconColor?: string;
  iconSize?: string;
  temperatureUnit?: boolean;
  /** Cor de destaque opcional aplicada ao valor (ex.: resultado positivo/negativo). */
  valueColor?: string;
}

/**
 * Card de KPI usado no Dashboard (Receita, Ingressos, Check-in, Temperatura).
 * Extraído para ser reaproveitado em outras telas administrativas — ex.:
 * Histórico de Eventos (ver /docs/HISTORICO-DE-EVENTOS.md).
 */
export const DashboardMetricCard = ({
  title,
  value,
  icon: Icon,
  trend,
  secondary,
  gaugeValue,
  iconColor,
  iconSize = "h-5 w-5",
  temperatureUnit,
  valueColor,
}: DashboardMetricCardProps) => (
  <div className="flex h-full flex-col rounded-[var(--radius-md)] bg-bg-secondary p-5 shadow-sm">
    <div className="mb-2 flex items-start justify-between gap-2">
      <span className="text-small text-text-secondary">{title}</span>
      {temperatureUnit ? (
        <div className="relative shrink-0">
          <Icon className={cn(iconSize, iconColor)} />
          <span className="absolute -right-3 -top-2 text-[10px] font-medium text-text-secondary">°C</span>
        </div>
      ) : (
        <Icon className={cn(iconSize, iconColor, "shrink-0")} />
      )}
    </div>
    <div className="flex flex-1 items-end justify-between gap-3">
      <div className="min-w-0">
        <div className={cn("mb-1 break-words text-heading-1 leading-tight text-text-primary", valueColor)}>
          {value}
        </div>
        {trend && <div className="text-small text-success">{trend}</div>}
        {secondary && <div className="text-small text-text-secondary">{secondary}</div>}
      </div>
      {gaugeValue !== undefined && (
        <div className="relative h-[50px] w-[90px] shrink-0">
          <svg viewBox="0 0 90 50" width="90" height="50" className="block">
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
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-center">
            <span className="text-heading-2 font-semibold leading-none text-text-primary">{gaugeValue}%</span>
          </div>
        </div>
      )}
    </div>
  </div>
);
