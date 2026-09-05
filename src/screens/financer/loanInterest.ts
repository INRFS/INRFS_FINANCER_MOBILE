/** Prorates an entered monthly percentage using the product's 30-day month convention. */
export function interestForDays(principal: number | string, monthlyRate: number | string, days: number): number {
  const amount = Number(principal) || 0;
  const rate = Number(monthlyRate) || 0;
  return Math.round((amount * rate / 100 * days / 30 + Number.EPSILON) * 100) / 100;
}

export function rateForDays(monthlyRate: number | string, days: number): number {
  return (Number(monthlyRate) || 0) * days / 30;
}

/**
 * Calculates interest for the entered contractual duration. Calendar months are
 * whole billing periods, so a 31-day calendar month must not accrue 31/30 of a
 * monthly charge.
 */
export function totalInterestForDuration(
  principal: number | string,
  monthlyRate: number | string,
  duration: number | string,
  durationUnit: string,
): number {
  const periods = Number(duration) || 0;
  if (durationUnit === "Months") {
    return interestForDays(principal, monthlyRate, periods * 30);
  }
  if (durationUnit === "Weeks") {
    return interestForDays(principal, monthlyRate, periods * 7);
  }
  return interestForDays(principal, monthlyRate, periods);
}

export function collectionInterestForFrequency(
  principal: number | string,
  monthlyRate: number | string,
  frequency: string,
  totalInterest: number,
): number {
  const periodInterest = frequency === "Daily"
    ? interestForDays(principal, monthlyRate, 1)
    : frequency === "Weekly"
      ? interestForDays(principal, monthlyRate, 7)
      : frequency === "Monthly"
        ? interestForDays(principal, monthlyRate, 30)
        : totalInterest;
  return Math.min(periodInterest, totalInterest);
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
