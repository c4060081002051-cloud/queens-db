export function formatCurrencyUGX(value: number): string {
  return `${new Intl.NumberFormat("en-UG", { maximumFractionDigits: 0 }).format(value)} UGX`;
}

export function formatReceiptDate(value: Date): string {
  return value.toLocaleString("en-UG", {
    year: "numeric",
    month: "long",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatYmdToLabel(ymd: string): string {
  const t = Date.parse(`${ymd}T12:00:00`);
  if (Number.isNaN(t)) return ymd;
  return new Date(t).toLocaleDateString("en-UG", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}
