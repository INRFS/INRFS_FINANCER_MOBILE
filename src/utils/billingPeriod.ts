const monthYear = (value: unknown): string | null => {
  if (typeof value !== "string" || !value) return null;
  const dateOnly = value.slice(0, 10);
  const match = dateOnly.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
};

/** A 26th-to-25th billing cycle is labelled by the month in which it closes. */
export const formatBillingPeriodLabel = (periodEnd: unknown, periodStart?: unknown): string =>
  monthYear(periodEnd) ?? monthYear(periodStart) ?? "Unknown";
