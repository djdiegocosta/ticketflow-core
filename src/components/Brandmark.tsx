import { Ticket } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZES = {
  /** Usado em barras/headers compactos: sidebar do Admin, header do Cliente. */
  sm: { icon: "h-5 w-5", text: "text-heading-2" },
  /** Usado em telas de entrada de tela cheia: Login, Cadastro. */
  lg: { icon: "h-7 w-7", text: "text-[28px] leading-tight" },
} as const;

/**
 * Marca única do TicketFlow (ícone + wordmark). Fonte única de verdade para
 * não deixar o logo divergir entre Admin, Cliente e telas de autenticação.
 */
export function Brandmark({
  size = "sm",
  pulse = false,
  className,
}: {
  size?: keyof typeof SIZES;
  pulse?: boolean;
  className?: string;
}) {
  const s = SIZES[size];
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Ticket
        className={cn(s.icon, "shrink-0 text-[var(--accent-text)]", pulse && "animate-pulse")}
      />
      <span className={cn(s.text, "font-bold text-[var(--text-primary)]")}>TicketFlow</span>
    </div>
  );
}
