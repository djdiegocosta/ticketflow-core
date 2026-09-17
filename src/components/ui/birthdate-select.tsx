import { useEffect, useRef, useState } from "react";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * Data de nascimento: input DD/MM/AAAA com máscara + calendário em popover
 * (ano e mês selecionáveis diretamente, sem navegar mês a mês). Substitui o
 * antigo componente de 3 seletores (Dia/Mês/Ano) — mesmo motivo de
 * existência (o input nativo tem um bug de largura no Safari/iOS), mas
 * mais rápido de preencher, principalmente pra datas de nascimento antigas.
 *
 * `value`/`onChange` continuam no mesmo formato ISO ("AAAA-MM-DD") de
 * antes — os dois lugares que usam este componente (Perfil e Cadastro)
 * não precisam de nenhuma mudança.
 */

function parseIsoToDate(iso: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  // Confere que a data existe de verdade (ex: 31/02 não vira 03/03 silenciosamente)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return undefined;
  }
  return date;
}

function formatDateToIso(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateToDisplay(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatIsoToDisplay(iso: string): string {
  const date = parseIsoToDate(iso);
  return date ? formatDateToDisplay(date) : "";
}

/** Remove tudo que não é dígito e reinsere as barras nas posições certas — mesma técnica já usada em maskWhatsApp (form-format.ts). */
function maskDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  let result = day;
  if (month) result += `/${month}`;
  if (year) result += `/${year}`;
  return result;
}

/** Converte DD/MM/AAAA pra ISO só se a data estiver completa, existir de
 * verdade e não for no futuro. Retorna null pra qualquer outro caso
 * (incompleta, inválida ou futura) — o chamador decide o que fazer com
 * isso (nunca apagar o texto digitado, só não propagar um valor ainda). */
function tryParseDisplayToIso(display: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(display);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day)
    return null;

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (date > today) return null;

  return formatDateToIso(date);
}

export function BirthdateSelect({
  value,
  onChange,
  minYear,
  maxYear,
}: {
  value: string;
  onChange: (value: string) => void;
  minYear?: number;
  maxYear?: number;
}) {
  const [displayText, setDisplayText] = useState(() => formatIsoToDisplay(value));
  const [open, setOpen] = useState(false);
  // Guarda o último valor que ESTE componente emitiu, pra distinguir "o
  // valor externo mudou por outro motivo" (ex: carregou do banco, form foi
  // resetado) de "o valor externo é só o eco do que acabei de digitar" —
  // sem isso, digitação parcial poderia ser sobrescrita pelo próprio
  // sincronismo com o formulário.
  const lastEmitted = useRef(value);

  useEffect(() => {
    if (value !== lastEmitted.current) {
      setDisplayText(formatIsoToDisplay(value));
      lastEmitted.current = value;
    }
  }, [value]);

  const handleInputChange = (raw: string) => {
    const masked = maskDateInput(raw);
    setDisplayText(masked);

    if (masked === "") {
      lastEmitted.current = "";
      onChange("");
      return;
    }

    const iso = tryParseDisplayToIso(masked);
    if (iso) {
      lastEmitted.current = iso;
      onChange(iso);
    }
    // Data incompleta ou ainda inválida (ex: "15/", "15/11/", "31/02/1990"
    // sem estar completa, ou data futura): não chama onChange - o texto
    // digitado continua visível, sem ser apagado.
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (!date) return;
    const iso = formatDateToIso(date);
    setDisplayText(formatDateToDisplay(date));
    lastEmitted.current = iso;
    onChange(iso);
    setOpen(false);
  };

  const currentYear = new Date().getFullYear();
  const selectedDate = parseIsoToDate(value);

  return (
    <div className="relative flex items-center">
      <input
        type="text"
        inputMode="numeric"
        autoComplete="bday"
        aria-label="Data de nascimento"
        placeholder="DD/MM/AAAA"
        value={displayText}
        onChange={(e) => handleInputChange(e.target.value)}
        maxLength={10}
        className="w-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-2 pr-11 rounded-[var(--radius-sm)] outline-none focus:border-[var(--accent)] text-text-primary"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Abrir calendário"
            className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[var(--radius-sm)] text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
          >
            <CalendarIcon className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            captionLayout="dropdown"
            selected={selectedDate}
            onSelect={handleCalendarSelect}
            startMonth={new Date(minYear ?? currentYear - 100, 0)}
            endMonth={new Date(maxYear ?? currentYear, 11)}
            disabled={{ after: new Date() }}
            defaultMonth={selectedDate ?? new Date((maxYear ?? currentYear) - 30, 0)}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
