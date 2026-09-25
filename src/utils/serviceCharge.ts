import { formatBillingPeriodLabel } from "./billingPeriod";

export const roundMoney = (value: unknown): number =>
  Math.round((Number(value ?? 0) + Number.EPSILON) * 100) / 100;

export const getMonthKeyFromDate = (dateValue: unknown): string => {
  if (!dateValue) return "";
  if (typeof dateValue === "string") {
    const trimmed = dateValue.trim();
    if (/^\d{4}-\d{2}$/.test(trimmed)) return trimmed;
    const match = trimmed.match(/^(\d{4})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}`;
  }
  const date = new Date(String(dateValue));
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  return year && month ? `${year}-${month}` : "";
};

export const formatMonthLabelFromKey = (monthKey: string): string => {
  if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) return "—";
  const parts = monthKey.split("-");
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  if (Number.isNaN(year) || Number.isNaN(month) || month < 1 || month > 12) return "—";
  const date = new Date(Date.UTC(year, month - 1, 1));
  return date.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
};

export const formatMonthLabel = (periodEnd: unknown, periodStart?: unknown): string => {
  if (periodEnd && typeof periodEnd === "string" && /^\d{4}-\d{2}$/.test(periodEnd)) {
    return formatMonthLabelFromKey(periodEnd);
  }
  if (periodEnd) {
    const key = getMonthKeyFromDate(periodEnd);
    if (key) return formatMonthLabelFromKey(key);
  }
  if (periodStart) {
    const key = getMonthKeyFromDate(periodStart);
    if (key) return formatMonthLabelFromKey(key);
  }
  return "—";
};

export const getLoanAmount = (loan: any): number => {
  return (
    Number(
      loan?.principal ?? loan?.amount ?? loan?.principalAmount ?? 0
    ) || 0
  );
};

export const getPaymentInterest = (payment: any): number => {
  const status =
    typeof payment?.status === "string"
      ? payment.status.toLowerCase()
      : payment?.status;
  if (![1, "completed", "paid", "success"].includes(status)) return 0;
  return Number(payment?.interestAmount ?? payment?.interest ?? 0) || 0;
};

export const getPaymentDate = (payment: any): string => {
  return (
    payment?.receivedAt ||
    payment?.paymentDate ||
    payment?.createdAt ||
    payment?.created_at ||
    ""
  );
};

export const getInvoiceMonthKey = (invoice: any): string => {
  if (invoice?.billingMonth && /^\d{4}-\d{2}$/.test(invoice.billingMonth)) {
    return invoice.billingMonth;
  }
  if (invoice?.periodEnd) {
    return getMonthKeyFromDate(invoice.periodEnd);
  }
  if (invoice?.periodStart) {
    return getMonthKeyFromDate(invoice.periodStart);
  }
  if (invoice?.createdAt) {
    return getMonthKeyFromDate(invoice.createdAt);
  }
  return "";
};

export interface CalculateMonthlyServiceChargesParams {
  invoices?: any[];
  loans?: any[];
  payments?: any[];
  defaultRate?: number;
  referenceDate?: Date | string;
  ensureCurrentMonth?: boolean;
}

export const calculateMonthlyServiceCharges = ({
  invoices = [],
  loans = [],
  payments = [],
  defaultRate = 1,
  referenceDate = new Date(),
  ensureCurrentMonth = true,
}: CalculateMonthlyServiceChargesParams = {}) => {
  const safeInvoices = Array.isArray(invoices) ? invoices : [];
  const safeLoans = Array.isArray(loans) ? loans : [];
  const safePayments = Array.isArray(payments) ? payments : [];
  const safeDefaultRate = Number(defaultRate) || 1;

  const currentMonthKey = referenceDate
    ? getMonthKeyFromDate(referenceDate) || (typeof referenceDate === "string" ? referenceDate.slice(0, 7) : new Date().toISOString().slice(0, 7))
    : "";

  const monthKeysSet = new Set<string>();
  if (ensureCurrentMonth && currentMonthKey) {
    monthKeysSet.add(currentMonthKey);
  }

  safeInvoices.forEach((inv) => {
    const key = getInvoiceMonthKey(inv);
    if (key) monthKeysSet.add(key);
  });

  safeLoans.forEach((loan) => {
    const key = getMonthKeyFromDate(
      loan.startDate ||
        loan.disbursementDate ||
        loan.dateGiven ||
        loan.createdAt ||
        loan.created_at ||
        loan.createdDate ||
        loan.issueDate
    );
    if (key) monthKeysSet.add(key);
  });

  safePayments.forEach((payment) => {
    const key = getMonthKeyFromDate(getPaymentDate(payment));
    if (key) monthKeysSet.add(key);
  });

  const sortedMonthKeys = [...monthKeysSet].sort((a, b) => b.localeCompare(a));

  return sortedMonthKeys.map((monthKey) => {
    const monthLoans = safeLoans.filter((loan) => {
      const key = getMonthKeyFromDate(
        loan.startDate ||
          loan.disbursementDate ||
          loan.dateGiven ||
          loan.createdAt ||
          loan.created_at ||
          loan.createdDate ||
          loan.issueDate
      );
      return key === monthKey;
    });

    const monthPayments = safePayments.filter((payment) => {
      const key = getMonthKeyFromDate(getPaymentDate(payment));
      return key === monthKey;
    });

    const monthInvoices = safeInvoices.filter((inv) => {
      return getInvoiceMonthKey(inv) === monthKey;
    });

    const loansTotal = monthLoans.reduce(
      (sum, l) => sum + getLoanAmount(l),
      0
    );
    const paymentsInterest = monthPayments.reduce(
      (sum, p) => sum + getPaymentInterest(p),
      0
    );

    const invoicesInterest = monthInvoices.reduce(
      (sum, inv) => sum + Number(inv.interestActivity || 0),
      0
    );
    const invoicesPayable = monthInvoices.reduce(
      (sum, inv) => sum + Number(inv.chargeAmount || 0),
      0
    );
    const invoicesPaid = monthInvoices.reduce(
      (sum, inv) => sum + Number(inv.collectedAmount || 0),
      0
    );

    // Determine rate
    const invoiceRates = [
      ...new Set(
        monthInvoices
          .map((i) =>
            i.chargePercentage !== undefined && i.chargePercentage !== null
              ? Number(i.chargePercentage)
              : null
          )
          .filter((r): r is number => r !== null && !Number.isNaN(r))
      ),
    ];

    let chargeRate: number | string = safeDefaultRate;
    if (invoiceRates.length === 1 && monthLoans.length === 0 && invoiceRates[0] !== undefined) {
      chargeRate = invoiceRates[0];
    } else if (invoiceRates.length > 1 && monthLoans.length === 0) {
      chargeRate = "Mixed";
    }

    let interestCollected = 0;
    let amountPayable = 0;

    if (monthLoans.length > 0 || monthPayments.length > 0) {
      interestCollected = roundMoney(loansTotal + paymentsInterest);
      amountPayable =
        chargeRate === "Mixed"
          ? roundMoney(invoicesPayable)
          : roundMoney((interestCollected * Number(chargeRate || 0)) / 100);
    } else if (monthInvoices.length > 0) {
      interestCollected = roundMoney(invoicesInterest);
      amountPayable =
        chargeRate === "Mixed"
          ? roundMoney(invoicesPayable)
          : invoicesPayable > 0
          ? roundMoney(invoicesPayable)
          : roundMoney((interestCollected * Number(chargeRate || 0)) / 100);
    } else {
      interestCollected = 0;
      amountPayable = 0;
    }

    const amountPaid = roundMoney(invoicesPaid);
    const outstanding = roundMoney(Math.max(0, amountPayable - amountPaid));

    let status = "Pending";
    if (amountPayable <= 0) {
      status = "No Charge";
    } else if (outstanding <= 0 && amountPaid > 0) {
      status = "Paid";
    } else if (amountPaid > 0 && outstanding > 0) {
      status = "Partially Paid";
    } else if (monthInvoices.some((i) => i.status === "Overdue")) {
      status = "Overdue";
    } else {
      const invoiceStatuses = [
        ...new Set(monthInvoices.map((i) => i.status).filter(Boolean)),
      ];
      if (invoiceStatuses.length === 1 && invoiceStatuses[0] !== "Paid") {
        status = invoiceStatuses[0];
      }
    }

    const parts = monthKey.split("-");
    const year = Number(parts[0]) || 1970;
    const monthNum = Number(parts[1]) || 1;
    const lastDay = new Date(Date.UTC(year, monthNum, 0)).getUTCDate();
    const periodStart = `${monthKey}-01`;
    const periodEnd = `${monthKey}-${String(lastDay).padStart(2, "0")}`;
    const month = formatMonthLabelFromKey(monthKey);

    return {
      id: monthKey,
      groupKey: monthKey,
      monthKey,
      month,
      periodStart,
      periodEnd,
      dueDate: monthInvoices[0]?.dueDate || null,
      interestCollected,
      chargeRate,
      amountPayable,
      amountPaid,
      outstanding,
      status,
      recordCount:
        monthLoans.length + monthPayments.length + monthInvoices.length,
      items: monthInvoices,
      loans: monthLoans,
      payments: monthPayments,
    };
  });
};

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
    const interestCollected = roundMoney(group.interestCollected);
    const amountPayable = roundMoney(group.amountPayable);
    const amountPaid = roundMoney(group.amountPaid);
    const outstanding = roundMoney(Math.max(0, amountPayable - amountPaid));
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
  const interestCollected = roundMoney(payments.filter(payment => {
    const status = typeof payment.status === "string" ? payment.status.toLowerCase() : payment.status;
    const date = indiaDateKey(payment.receivedAt ?? payment.paymentDate ?? payment.createdAt);
    return [1, "completed", "paid", "success"].includes(status) && date >= billing.periodStart && date <= billing.periodEnd;
  }).reduce((sum, payment) => sum + Number(payment.interestAmount ?? payment.interest ?? 0), 0));
  const amountPayable = billing.chargeRate === "Mixed"
    ? billing.amountPayable
    : roundMoney(interestCollected * Number(billing.chargeRate ?? 0) / 100);
  const amountPaid = roundMoney(billing.amountPaid);
  const outstanding = roundMoney(Math.max(0, amountPayable - amountPaid));
  const status = amountPayable <= 0 ? "No Charge"
    : outstanding <= 0 && amountPaid > 0 ? "Paid"
      : amountPaid > 0 ? "Partially Paid" : "Accruing";
  return { ...billing, interestCollected, amountPayable, amountPaid, outstanding, status };
};
