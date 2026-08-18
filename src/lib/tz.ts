// Utilidades de timezone sem dependência externa (README 20).
// Trabalhamos internamente em UTC; convertendo horários "de parede" no fuso.

// Offset (ms) do fuso em relação ao UTC para um instante específico.
function offsetMs(timeZone: string, at: Date): number {
  const asTz = new Date(at.toLocaleString("en-US", { timeZone }));
  const asUtc = new Date(at.toLocaleString("en-US", { timeZone: "UTC" }));
  return asTz.getTime() - asUtc.getTime();
}

// Converte um horário de parede (y-m-d h:m no fuso) para o instante UTC correspondente.
export function wallTimeToUtc(
  timeZone: string,
  y: number,
  m: number,
  d: number,
  hh: number,
  mm: number,
): Date {
  const guessUtc = Date.UTC(y, m - 1, d, hh, mm);
  const off = offsetMs(timeZone, new Date(guessUtc));
  return new Date(guessUtc - off);
}

// Partes locais (ano/mês/dia/dia-da-semana) de um instante num fuso.
export function zonedParts(timeZone: string, at: Date): {
  y: number; m: number; d: number; weekday: number;
} {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short",
  });
  const parts = fmt.formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const wdMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    y: Number(get("year")),
    m: Number(get("month")),
    d: Number(get("day")),
    weekday: wdMap[get("weekday")] ?? 0,
  };
}
