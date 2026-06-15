function formatNumber(value: number) {
  return Math.round(value).toLocaleString("es-AR");
}

export function formatCredits(value: number) {
  return `$${formatNumber(value)}`;
}

export function formatNetAmount(amount: number) {
  return `${amount >= 0 ? "+" : "-"}$${formatNumber(Math.abs(amount))}`;
}

export function formatGross(amount: number) {
  return `$${formatNumber(Math.max(0, amount))}`;
}

export function parseCredits(raw: string) {
  return Number(raw.replace(/[$.,]/g, ""));
}
