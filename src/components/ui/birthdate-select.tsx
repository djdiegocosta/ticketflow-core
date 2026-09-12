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
  // month é 1-12. new Date(year, month, 0) dá o último dia do mês anterior
  // ao informado, ou seja, o total de dias do mês "month".
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
 * Data de nascimento com 3 seletores simples (Dia / Mês / Ano) em vez de um
 * <input type="date">. Motivos: o input nativo tem um bug conhecido no
 * Safari/iOS que faz a caixa não respeitar largura total (fica pequena e
 * desalinhada); e escolher dia/mês/ano direto é mais rápido do que navegar
 * um calendário até décadas atrás — menos barreira pro cadastro.
 *
 * `value`/`onChange` usam o mesmo formato ISO ("AAAA-MM-DD") já usado em
 * data_nascimento, então funciona como substituto direto do input nativo.
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
  const { day, month, year } = parseIso(value);
  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: (maxYear ?? currentYear) - (minYear ?? currentYear - 100) + 1 },
    (_, i) => (maxYear ?? currentYear) - i,
  );

  const emitChange = (nextDay: string, nextMonth: string, nextYear: string) => {
    if (!nextDay || !nextMonth || !nextYear) {
      onChange("");
      return;
    }
    onChange(`${nextYear}-${nextMonth}-${nextDay}`);
  };

  const maxDay = month && year ? daysInMonth(Number(month), Number(year)) : 31;
  const dayOptions = Array.from({ length: maxDay }, (_, i) => String(i + 1).padStart(2, "0"));
  // Se o dia selecionado não existe mais no mês novo (ex: estava em 31 e
  // mudou pra fevereiro), ajusta pro último dia válido em vez de deixar
  // uma data inválida silenciosa.
  const safeDay = day && Number(day) > maxDay ? String(maxDay).padStart(2, "0") : day;

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
