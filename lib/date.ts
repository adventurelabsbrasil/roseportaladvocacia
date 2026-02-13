/**
 * "Ontem" (yesterday) in America/Sao_Paulo for daily report.
 */
export function getYesterday(): string {
  const now = new Date();
  const saoPaulo = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  saoPaulo.setDate(saoPaulo.getDate() - 1);
  const y = saoPaulo.getFullYear();
  const m = String(saoPaulo.getMonth() + 1).padStart(2, "0");
  const d = String(saoPaulo.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatDateForDisplay(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const MONTH_ABBREV_PT = [
  "jan.", "fev.", "mar.", "abr.", "mai.", "jun.",
  "jul.", "ago.", "set.", "out.", "nov.", "dez.",
];

/**
 * Brazilian date format: dd/mmm/yyyy (e.g. 31/dez./2026).
 * When short is true, returns dd/mmm. (e.g. 31/dez.) for tight spaces like chart axes.
 */
export function formatDateBR(dateStr: string, short?: boolean): string {
  const d = new Date(dateStr + "T12:00:00");
  const day = String(d.getDate()).padStart(2, "0");
  const month = MONTH_ABBREV_PT[d.getMonth()] ?? "";
  if (short) return `${day}/${month}`;
  return `${day}/${month}/${d.getFullYear()}`;
}

/**
 * Parse dd/mm/yyyy or dd-mm-yyyy to YYYY-MM-DD. Returns null if invalid.
 */
export function parseDateBR(input: string): string | null {
  const trimmed = input.trim().replace(/\s/g, "");
  const match = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/) ?? trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/);
  if (!match) return null;
  const [, d, m, y] = match;
  let year = parseInt(y!, 10);
  if (year < 100) year += year < 50 ? 2000 : 1900;
  const month = parseInt(m!, 10);
  const day = parseInt(d!, 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Convert YYYY-MM-DD to dd/mm/yyyy for display in text inputs.
 */
export function formatDateToInput(dateStr: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * Split a date range into monthly chunks. Each chunk is { since, until } (inclusive).
 * Useful for batching API calls (e.g. Meta Insights per month).
 */
export function monthlyChunks(since: string, until: string): { since: string; until: string }[] {
  const chunks: { since: string; until: string }[] = [];
  const start = new Date(since + "T12:00:00");
  const end = new Date(until + "T12:00:00");
  let cur = new Date(start);
  while (cur <= end) {
    const y = cur.getFullYear();
    const m = cur.getMonth();
    const chunkStart = `${y}-${String(m + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
    const lastDay = new Date(y, m + 1, 0);
    const chunkEndDate = lastDay > end ? end : lastDay;
    const chunkEnd = `${chunkEndDate.getFullYear()}-${String(chunkEndDate.getMonth() + 1).padStart(2, "0")}-${String(chunkEndDate.getDate()).padStart(2, "0")}`;
    chunks.push({ since: chunkStart, until: chunkEnd });
    cur = new Date(y, m + 1, 1);
  }
  return chunks;
}

/** List of dates from since to until (inclusive), YYYY-MM-DD. */
export function dateRange(since: string, until: string): string[] {
  const out: string[] = [];
  const start = new Date(since + "T12:00:00");
  const end = new Date(until + "T12:00:00");
  const cur = new Date(start);
  while (cur <= end) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, "0");
    const d = String(cur.getDate()).padStart(2, "0");
    out.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function formatYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Yesterday in America/Sao_Paulo as Date. */
function getYesterdayDate(): Date {
  const now = new Date();
  const saoPaulo = new Date(
    now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
  );
  saoPaulo.setDate(saoPaulo.getDate() - 1);
  return saoPaulo;
}

export function getPresetRange(
  preset: "yesterday" | "last7" | "last30" | "thisMonth" | "lastMonth"
): { since: string; until: string } {
  const yesterday = getYesterdayDate();
  const until = formatYMD(yesterday);

  if (preset === "yesterday") {
    return { since: until, until };
  }

  if (preset === "last7") {
    const since = new Date(yesterday);
    since.setDate(since.getDate() - 6);
    return { since: formatYMD(since), until };
  }

  if (preset === "last30") {
    const since = new Date(yesterday);
    since.setDate(since.getDate() - 29);
    return { since: formatYMD(since), until };
  }

  if (preset === "thisMonth") {
    const since = new Date(yesterday.getFullYear(), yesterday.getMonth(), 1);
    return { since: formatYMD(since), until };
  }

  if (preset === "lastMonth") {
    const y = yesterday.getFullYear();
    const m = yesterday.getMonth();
    const since = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0);
    return { since: formatYMD(since), until: formatYMD(end) };
  }

  return { since: until, until };
}
