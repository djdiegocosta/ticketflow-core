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
 *
 * Símbolo: ingresso + fluxo central. Mantém apenas #00E676 e branco,
 * sem depender de biblioteca de ícones para a identidade da marca.
 */
function TicketFlowIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <path
        fill="#00E676"
        d="M112 104h288c13.3 0 24 10.7 24 24v64c-30.9 0-56 25.1-56 56s25.1 56 56 56v64c0 13.3-10.7 24-24 24H112c-13.3 0-24-10.7-24-24v-64c30.9 0 56-25.1 56-56s-25.1-56-56-56v-64c0-13.3 10.7-24 24-24z"
      />
      <path
        d="M145 224c34-42 67-42 101 0s67 42 101 0"
        stroke="#FFFFFF"
        strokeWidth="28"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
      <TicketFlowIcon
        className={cn(s.icon, "shrink-0", pulse && "animate-pulse")}
      />
      <span className={cn(s.text, "font-bold text-[var(--text-primary)]")}>TicketFlow</span>
    </div>
  );
}
