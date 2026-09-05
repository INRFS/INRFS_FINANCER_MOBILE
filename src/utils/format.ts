const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatInr(value: unknown): string {
  const amount = value == null || value === "" ? 0 : Number(value);
  return Number.isFinite(amount) ? inr.format(amount) : "—";
}
