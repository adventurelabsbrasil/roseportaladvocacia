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
