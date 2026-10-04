import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/** Ícone (i) que abre uma explicação curta ao toque/clique. */
export function InfoHint({ children, label = "Mais informações" }: { children: React.ReactNode; label?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className="inline-flex h-5 w-5 items-center justify-center rounded-[var(--radius-full)] text-[var(--text-disabled)] transition-colors hover:text-[var(--text-secondary)]"
        >
          <Info className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-72 rounded-[var(--radius-sm)] border-[var(--border-default)] bg-[var(--bg-secondary)] p-3 text-small text-[var(--text-secondary)]"
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}
