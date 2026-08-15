const CONNECTIVES = ["de", "da", "do", "dos", "das", "e"];

/** Title case respeitando conectivos (Adriano de Araújo). */
export function formatName(value: string) {
  if (!value) return "";
  return value
    .split(" ")
    .map((word) => {
      if (word.length === 0) return "";
      const lower = word.toLowerCase();
      if (CONNECTIVES.includes(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1).toLowerCase();
    })
    .join(" ");
}

/** Nome válido = pelo menos 2 palavras. */
export function isFullName(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length >= 2;
}

export function maskWhatsApp(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}
