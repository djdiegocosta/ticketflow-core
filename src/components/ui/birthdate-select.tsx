import { useEffect, useState } from "react";

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

function parseIso(value: string): { day: string; month: string; year: string } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  if (!match) return { day: "", month: "", year: "" };
  const [, year, month, day] = match;
  return { day: day ?? "", month: month ?? "", year: year ?? "" };
}

const selectClass =
  "w-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-2 rounded-[var(--radius-sm)] outline-none focus:border-[var(--accent)] text-text-primary";

/**
 * Data de nascimento com 3 seletores simples (Dia / Mês / Ano).
 *
 * A seleção parcial fica preservada localmente. O valor controlado só é
 * emitido como ISO (AAAA-MM-DD) quando dia, mês e ano estiverem completos.
 */
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
  const parsed = parseIso(value);
  const [day, setDay] = useState(parsed.day);
  const [month, setMonth] = useState(parsed.month);
  const [year, setYear] = useState(parsed.year);

  useEffect(() => {
    const next = parseIso(value);
    if (next.day || next.month || next.year) {
      setDay(next.day);
      setMonth(next.month);
      setYear(next.year);
    } else if (!value) {
      // Só limpa a seleção local quando o valor externo realmente for
      // esvaziado, sem apagar uma seleção parcial durante a interação.
      setDay("");
      setMonth("");
      setYear("");
    }
  }, [value]);

  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: (maxYear ?? currentYear) - (minYear ?? currentYear - 100) + 1 },
    (_, i) => (maxYear ?? currentYear) - i,
  );

  const maxDay = month && year ? daysInMonth(Number(month), Number(year)) : 31;
  const dayOptions = Array.from({ length: maxDay }, (_, i) => String(i + 1).padStart(2, "0"));
  const safeDay = day && Number(day) > maxDay ? String(maxDay).padStart(2, "0") : day;

  const emitChange = (nextDay: string, nextMonth: string, nextYear: string) => {
    setDay(nextDay);
    setMonth(nextMonth);
    setYear(nextYear);

    if (nextDay && nextMonth && nextYear) {
      onChange(`${nextYear}-${nextMonth}-${nextDay}`);
    } else {
      // Mantém o formulário sem data completa até os três campos serem
      // escolhidos, mas não perde os componentes já selecionados.
      onChange("");
    }
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      <select
        aria-label="Dia"
        value={safeDay}
        onChange={(e) => emitChange(e.target.value, month, year)}
        className={selectClass}
      >
        <option value="">Dia</option>
        {dayOptions.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>

      <select
        aria-label="Mês"
        value={month}
        onChange={(e) => emitChange(safeDay, e.target.value, year)}
        className={selectClass}
      >
        <option value="">Mês</option>
        {MESES.map((label, i) => (
          <option key={label} value={String(i + 1).padStart(2, "0")}>
            {label}
          </option>
        ))}
      </select>

      <select
        aria-label="Ano"
        value={year}
        onChange={(e) => emitChange(safeDay, month, e.target.value)}
        className={selectClass}
      >
        <option value="">Ano</option>
        {years.map((y) => (
          <option key={y} value={String(y)}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}
