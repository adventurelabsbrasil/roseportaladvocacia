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
