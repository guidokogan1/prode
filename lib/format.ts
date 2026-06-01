export function formatCredits(value: number) {
  return Math.round(value).toLocaleString("es-AR");
}

export function formatNetAmount(amount: number) {
  return `${amount >= 0 ? "+" : "-"}${formatCredits(Math.abs(amount))}`;
}

export function parseCredits(raw: string) {
  return Number(raw.replace(/\./g, "").replace(/,/g, ""));
}
