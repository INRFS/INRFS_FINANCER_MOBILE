export function interestForDays(principal: number | string, annualRate: number | string, days: number): number {
  const amount = Number(principal) || 0;
  const rate = Number(annualRate) || 0;
  return Math.round((amount * rate / 100 * days / 365 + Number.EPSILON) * 100) / 100;
}

export function rateForDays(annualRate: number | string, days: number): number {
  return (Number(annualRate) || 0) * days / 365;
}

export function monthlyPeriodDays(startDate: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate || '')) return 30;
  const [year, month, day] = startDate.split('-').map(Number) as [number, number, number];
  const start = Date.UTC(year, month - 1, day);
  const nextMonth = new Date(Date.UTC(year, month, 1));
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const end = Date.UTC(
    nextMonth.getUTCFullYear(),
    nextMonth.getUTCMonth(),
    Math.min(day, lastDay)
  );
  return Math.round((end - start) / 86_400_000);
}

export function formatInterestAmount(value: number | string): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}
