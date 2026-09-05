import { formatBillingPeriodLabel } from "./billingPeriod";

const money = (value: unknown) => Math.round((Number(value ?? 0) + Number.EPSILON) * 100) / 100;

const indiaDateKey = (value: unknown) => {
  const date = new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) => parts.find(item => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
};

export const groupServiceCharges = (invoices: any[], today: string) => {
  const groups = new Map<string, any>();
  for (const item of Array.isArray(invoices) ? invoices : []) {
    const key = item.periodStart && item.periodEnd
      ? `${item.periodStart}_${item.periodEnd}`
      : String(item.id ?? item.billingMonth ?? "default");
    const group = groups.get(key) ?? {
      id: key, periodStart: item.periodStart, periodEnd: item.periodEnd, dueDate: item.dueDate,
      month: formatBillingPeriodLabel(item.periodEnd, item.periodStart), interestCollected: 0,
      amountPayable: 0, amountPaid: 0, rates: [], items: [],
    };
    group.interestCollected += Number(item.interestActivity ?? 0);
    group.amountPayable += Number(item.chargeAmount ?? 0);
    group.amountPaid += Number(item.collectedAmount ?? 0);
    if (item.chargePercentage != null) group.rates.push(Number(item.chargePercentage));
    group.items.push(item);
    groups.set(key, group);
  }
  return [...groups.values()].map(group => {
    const interestCollected = money(group.interestCollected);
    const amountPayable = money(group.amountPayable);
    const amountPaid = money(group.amountPaid);
    const outstanding = money(Math.max(0, amountPayable - amountPaid));
    const rates = [...new Set<number>(group.rates.filter((rate: number) => Number.isFinite(rate)))];
    const chargeRate: number | string = rates.length === 1 ? rates[0]! : rates.length ? "Mixed" : 0;
    const overdue = group.items.some((item: any) => item.status === "Overdue") || (group.dueDate && group.dueDate < today);
    const status = amountPayable <= 0 ? "No Charge"
      : outstanding <= 0 && amountPaid > 0 ? "Paid"
        : amountPaid > 0 ? "Partially Paid"
          : overdue ? "Overdue" : "Accruing";
    return { ...group, interestCollected, amountPayable, amountPaid, outstanding, chargeRate, status };
  }).sort((a, b) => String(b.periodEnd ?? b.periodStart).localeCompare(String(a.periodEnd ?? a.periodStart)));
};

export const withLiveInterestCollected = (billing: any, payments: any[]) => {
  if (!billing?.periodStart || !billing?.periodEnd || !Array.isArray(payments)) return billing;
  const interestCollected = money(payments.filter(payment => {
    const status = typeof payment.status === "string" ? payment.status.toLowerCase() : payment.status;
    const date = indiaDateKey(payment.receivedAt);
    return [1, "completed", "paid", "success"].includes(status) && date >= billing.periodStart && date <= billing.periodEnd;
  }).reduce((sum, payment) => sum + Number(payment.interestAmount ?? 0), 0));
  const amountPayable = billing.chargeRate === "Mixed"
    ? billing.amountPayable
    : money(interestCollected * Number(billing.chargeRate ?? 0) / 100);
  const amountPaid = money(billing.amountPaid);
  const outstanding = money(Math.max(0, amountPayable - amountPaid));
  const status = amountPayable <= 0 ? "No Charge"
    : outstanding <= 0 && amountPaid > 0 ? "Paid"
      : amountPaid > 0 ? "Partially Paid" : "Accruing";
  return { ...billing, interestCollected, amountPayable, amountPaid, outstanding, status };
};
