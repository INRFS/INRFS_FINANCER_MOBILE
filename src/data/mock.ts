import type { Status } from "../types/navigation";

export const financerProfile = {
  name: "Suresh Patel",
  businessName: "Patel Finance Services",
  mobile: "+91 98765 43210",
  email: "suresh@patelfinance.in",
  city: "Ahmedabad",
  state: "Gujarat",
  plan: "Premium Plan",
};

export const dashboardStats = {
  totalCustomers: 250,
  totalCustomersGrowth: "+12 this month",
  activeLoans: 180,
  activeLoansGrowth: "8 new this week",
  totalGiven: 1850000,
  principalOutstanding: 1240000,
  interestDueToday: 35000,
  interestReceived: 28500,
  pendingInterest: 42000,
  overdueAmount: 18500,
  overdueAccountsCount: 2,
};

export const monthlyCollections = [
  { month: "Apr", expected: 32000, collected: 30500 },
  { month: "May", expected: 35000, collected: 34000 },
  { month: "Jun", expected: 38000, collected: 36200 },
  { month: "Jul", expected: 40000, collected: 39500 },
  { month: "Aug", expected: 42000, collected: 41000 },
  { month: "Sep", expected: 45000, collected: 28500 },
];

export const loanStatus = [
  { label: "Active", value: 156, status: "Active" as Status },
  { label: "Overdue", value: 8, status: "Overdue" as Status },
  { label: "Paid", value: 12, status: "Paid" as Status },
  { label: "Rescheduled", value: 4, status: "Rescheduled" as Status },
];

export const customers = [
  { id: "CUST-101", name: "Ramesh Kumar", mobile: "+91 98234 11223", loans: 2, outstanding: 45000, due: "10-Sep-2026", status: "Active" as Status, city: "Ahmedabad" },
  { id: "CUST-102", name: "Priya Sharma", mobile: "+91 98112 33445", loans: 1, outstanding: 28000, due: "05-Sep-2026", status: "Active" as Status, city: "Vadodara" },
  { id: "CUST-103", name: "Vikram Singh", mobile: "+91 97445 66778", loans: 1, outstanding: 15000, due: "Today", status: "Due" as Status, city: "Surat" },
  { id: "CUST-104", name: "Mohammed Ali", mobile: "+91 96554 88990", loans: 2, outstanding: 60000, due: "20-Sep-2026", status: "Active" as Status, city: "Ahmedabad" },
  { id: "CUST-105", name: "Rajesh Patel", mobile: "+91 99123 44556", loans: 1, outstanding: 12500, due: "01-Sep-2026", status: "Overdue" as Status, city: "Rajkot" },
  { id: "CUST-106", name: "Sunita Verma", mobile: "+91 98888 22110", loans: 1, outstanding: 35000, due: "15-Sep-2026", status: "Active" as Status, city: "Gandhinagar" },
  { id: "CUST-107", name: "Amit Shah", mobile: "+91 97123 99887", loans: 0, outstanding: 0, due: "—", status: "Closed" as const, city: "Ahmedabad" },
];

export const loans = [
  { id: "LN000125", customer: "Ramesh Kumar", principal: 50000, rate: "2% Monthly", frequency: "Daily Collection", outstanding: 35000, nextDue: "10-Sep-2026", status: "Active" as Status },
  { id: "LN000126", customer: "Ramesh Kumar", principal: 20000, rate: "1.5% Monthly", frequency: "Monthly Interest", outstanding: 10000, nextDue: "12-Sep-2026", status: "Active" as Status },
  { id: "LN000127", customer: "Priya Sharma", principal: 40000, rate: "2% Monthly", frequency: "Weekly Collection", outstanding: 28000, nextDue: "05-Sep-2026", status: "Active" as Status },
  { id: "LN000128", customer: "Vikram Singh", principal: 25000, rate: "2.5% Monthly", frequency: "Daily Collection", outstanding: 15000, nextDue: "Today", status: "Due" as Status },
  { id: "LN000129", customer: "Rajesh Patel", principal: 18000, rate: "3% Monthly", frequency: "Daily Collection", outstanding: 12500, nextDue: "01-Sep-2026", status: "Overdue" as Status },
  { id: "LN000130", customer: "Amit Shah", principal: 30000, rate: "2% Monthly", frequency: "Monthly Interest", outstanding: 0, nextDue: "—", status: "Closed" as const },
  { id: "LN000131", customer: "Mohammed Ali", principal: 50000, rate: "2% Monthly", frequency: "Weekly Collection", outstanding: 40000, nextDue: "20-Sep-2026", status: "Active" as Status },
  { id: "LN000132", customer: "Mohammed Ali", principal: 25000, rate: "2% Monthly", frequency: "Daily Collection", outstanding: 20000, nextDue: "25-Sep-2026", status: "Active" as Status },
];

export const payments = [
  { id: "PAY-1001", customer: "Ramesh Kumar", loanId: "LN000125", amount: 1000, type: "Interest", method: "UPI", date: "08-Sep-2026", status: "Paid" as Status },
  { id: "PAY-1002", customer: "Priya Sharma", loanId: "LN000127", amount: 680, type: "Interest", method: "Cash", date: "04-Sep-2026", status: "Paid" as Status },
  { id: "PAY-1003", customer: "Mohammed Ali", loanId: "LN000131", amount: 900, type: "Interest", method: "Bank Transfer", date: "01-Sep-2026", status: "Paid" as Status },
  { id: "PAY-1004", customer: "Sunita Verma", loanId: "LN000133", amount: 1200, type: "Interest", method: "UPI", date: "30-Aug-2026", status: "Paid" as Status },
  { id: "PAY-1005", customer: "Rajesh Patel", loanId: "LN000129", amount: 500, type: "Principal", method: "Cash", date: "25-Aug-2026", status: "Paid" as Status },
];

const relativeDate = (offset: number) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
};

export const paymentSchedule = [
  { id: "PMT-1001", loanId: "LN000125", customerId: "CUS001", customer: "Ramesh Kumar", amount: 1000, dueDate: relativeDate(0), paymentDate: relativeDate(0), method: "PhonePe", status: "Success" as Status },
  { id: "PMT-1002", loanId: "LN000126", customerId: "CUS002", customer: "Sunita Devi", amount: 750, dueDate: relativeDate(1), paymentDate: "", method: "", status: "Pending" as Status },
  { id: "PMT-1003", loanId: "LN000127", customerId: "CUS003", customer: "Anil Sharma", amount: 700, dueDate: relativeDate(1), paymentDate: "", method: "", status: "Overdue" as Status },
  { id: "PMT-1004", loanId: "LN000128", customerId: "CUS004", customer: "Priya Singh", amount: 550, dueDate: relativeDate(2), paymentDate: relativeDate(2), method: "Cash", status: "Success" as Status },
  { id: "PMT-1005", loanId: "LN000129", customerId: "CUS005", customer: "Vikram Rao", amount: 1200, dueDate: relativeDate(3), paymentDate: "", method: "", status: "Rescheduled" as Status },
];

export const duePayments = [
  { id: "PAY-001", customer: "Ramesh Kumar", loan: "LN000125", amount: 1000, due: "10-Sep-2026", days: "Due", status: "Due" as Status },
  { id: "PAY-002", customer: "Priya Sharma", loan: "LN000127", amount: 680, due: "05-Sep-2026", days: "Due", status: "Due" as Status },
  { id: "PAY-003", customer: "Vikram Singh", loan: "LN000128", amount: 400, due: "Today", days: "Due", status: "Due" as Status },
  { id: "PAY-004", customer: "Mohammed Ali", loan: "LN000131", amount: 900, due: "20-Sep-2026", days: "Upcoming", status: "Upcoming" as Status },
  { id: "PAY-005", customer: "Mohammed Ali", loan: "LN000132", amount: 450, due: "25-Sep-2026", days: "Upcoming", status: "Upcoming" as Status },
];

export const interestSchedules = [
  { loanId: "LN000125", customer: "Ramesh Kumar", principal: 50000, rate: "2.0%", amount: 1000, due: "10-Sep-2026", status: "Due" as Status },
  { loanId: "LN000127", customer: "Priya Sharma", principal: 40000, rate: "2.0%", amount: 800, due: "05-Sep-2026", status: "Due" as Status },
  { loanId: "LN000128", customer: "Vikram Singh", principal: 25000, rate: "2.5%", amount: 625, due: "10-Sep-2026", status: "Due" as Status },
  { loanId: "LN000129", customer: "Rajesh Patel", principal: 18000, rate: "3.0%", amount: 540, due: "01-Sep-2026", status: "Overdue" as Status },
  { loanId: "LN000131", customer: "Mohammed Ali", principal: 50000, rate: "2.0%", amount: 1000, due: "20-Sep-2026", status: "Upcoming" as Status },
  { loanId: "LN000132", customer: "Mohammed Ali", principal: 25000, rate: "2.0%", amount: 500, due: "25-Sep-2026", status: "Upcoming" as Status },
];

export const overdueAccounts = [
  { id: "OD-001", customer: "Rajesh Patel", loan: "LN000129", amount: 12500, due: "01-Aug-2026", days: "10 days overdue", status: "Overdue" as Status },
  { id: "OD-002", customer: "Vikram Singh", loan: "LN000128", amount: 6000, due: "05-Aug-2026", days: "5 days overdue", status: "Overdue" as Status },
];

export const notifications = [
  { id: 1, title: "Payment Overdue Alert", body: "Rajesh Patel (LN000129) payment is 10 days overdue.", time: "2 hours ago", category: "Overdue", unread: true },
  { id: 2, title: "Payment Received", body: "Received ₹1,000 from Ramesh Kumar via UPI.", time: "Yesterday", category: "Payments", unread: true },
  { id: 3, title: "New Loan Disbursed", body: "Loan LN000132 was approved and disbursed to Mohammed Ali.", time: "3 days ago", category: "Loans", unread: false },
  { id: 4, title: "System Maintenance", body: "Scheduled maintenance on Sunday at 2:00 AM IST.", time: "1 week ago", category: "System", unread: false },
];

export const supportTickets = [
  { id: "TCK-801", subject: "SMS OTP delay on customer login", category: "Technical", date: "05-Sep-2026", status: "Pending" as Status },
  { id: "TCK-788", subject: "Query regarding GST calculation in interest report", category: "Billing", date: "20-Aug-2026", status: "Resolved" as Status },
];

export const ledger = [
  { title: "Loan Disbursed — LN000125", subtitle: "01-Aug-2026 · Debit", amount: "₹50,000", status: "Active" as Status },
  { title: "Interest Applied (August)", subtitle: "10-Aug-2026 · Debit", amount: "₹1,000", status: "Due" as Status },
  { title: "Payment Received via UPI", subtitle: "12-Aug-2026 · Credit", amount: "₹1,000", status: "Paid" as Status },
  { title: "Principal Repayment Cash", subtitle: "25-Aug-2026 · Credit", amount: "₹15,000", status: "Paid" as Status },
  { title: "Interest Applied (September)", subtitle: "01-Sep-2026 · Debit", amount: "₹1,000", status: "Due" as Status },
  { title: "Payment Received via UPI", subtitle: "08-Sep-2026 · Credit", amount: "₹1,000", status: "Paid" as Status },
];

export const customerLedgers = [
  { id: "CUS001", name: "Ramesh Kumar", phone: "+91 98001 11111", loanCount: 2, totalDisbursed: 23000, totalReceived: 2000, outstanding: 21000, entries: [
    { date: "10-Aug-2026", description: "Loan Disbursed", debit: 10000, credit: 0, balance: 10000 }, { date: "10-Aug-2026", description: "Interest Due", debit: 1000, credit: 0, balance: 11000 }, { date: "12-Aug-2026", description: "Interest Received", debit: 0, credit: 1000, balance: 10000 }, { date: "10-Sep-2026", description: "Interest Due", debit: 1000, credit: 0, balance: 11000 },
  ] },
  { id: "CUS002", name: "Priya Sharma", phone: "+91 98765 22222", loanCount: 1, totalDisbursed: 15000, totalReceived: 5000, outstanding: 10000, entries: [
    { date: "05-Aug-2026", description: "Loan Disbursed", debit: 15000, credit: 0, balance: 15000 }, { date: "12-Aug-2026", description: "Payment Received", debit: 0, credit: 5000, balance: 10000 }, { date: "05-Sep-2026", description: "Interest Due", debit: 1000, credit: 0, balance: 11000 },
  ] },
  { id: "CUS003", name: "Vikram Singh", phone: "+91 98765 33333", loanCount: 3, totalDisbursed: 45000, totalReceived: 15000, outstanding: 30000, entries: [
    { date: "01-Aug-2026", description: "Loan Disbursed", debit: 20000, credit: 0, balance: 20000 }, { date: "03-Aug-2026", description: "Loan Disbursed", debit: 15000, credit: 0, balance: 35000 }, { date: "08-Aug-2026", description: "Payment Received", debit: 0, credit: 10000, balance: 25000 }, { date: "10-Aug-2026", description: "Loan Disbursed", debit: 10000, credit: 0, balance: 35000 }, { date: "10-Sep-2026", description: "Interest Due", debit: 1500, credit: 0, balance: 36500 },
  ] },
  { id: "CUS004", name: "Anita Desai", phone: "+91 98765 44444", loanCount: 1, totalDisbursed: 12000, totalReceived: 4000, outstanding: 8000, entries: [
    { date: "02-Aug-2026", description: "Loan Disbursed", debit: 12000, credit: 0, balance: 12000 }, { date: "10-Aug-2026", description: "Payment Received", debit: 0, credit: 4000, balance: 8000 }, { date: "02-Sep-2026", description: "Interest Due", debit: 800, credit: 0, balance: 8800 },
  ] },
  { id: "CUS005", name: "Mohammed Ali", phone: "+91 98765 55555", loanCount: 2, totalDisbursed: 30000, totalReceived: 12000, outstanding: 18000, entries: [
    { date: "04-Aug-2026", description: "Loan Disbursed", debit: 20000, credit: 0, balance: 20000 }, { date: "09-Aug-2026", description: "Loan Disbursed", debit: 10000, credit: 0, balance: 30000 }, { date: "15-Aug-2026", description: "Payment Received", debit: 0, credit: 12000, balance: 18000 }, { date: "04-Sep-2026", description: "Interest Due", debit: 1200, credit: 0, balance: 19200 },
  ] },
  { id: "CUS006", name: "Sunita Rao", phone: "+91 98765 66666", loanCount: 0, totalDisbursed: 0, totalReceived: 0, outstanding: 0, entries: [] },
];

export const financers = [
  { id: "FIN00125", name: "Patel Finance Services", owner: "Suresh Patel", customers: "250", loans: "180", plan: "Premium", usage: "850 / 1000", status: "Active" as Status },
  { id: "FIN00124", name: "Sharma Credit House", owner: "Vikas Sharma", customers: "125", loans: "95", plan: "Standard", usage: "640 / 750", status: "Active" as Status },
  { id: "FIN00123", name: "Maa Lakshmi Finance", owner: "Anita Gupta", customers: "48", loans: "32", plan: "Basic", usage: "180 / 250", status: "Trial" as Status },
  { id: "FIN00122", name: "Quick Money Point", owner: "Arun Yadav", customers: "86", loans: "64", plan: "Standard", usage: "720 / 750", status: "Suspended" as Status },
];

export const billing = [
  { name: "Patel Finance Services", interest: "₹2,50,000", rate: "1%", charge: "₹2,500", collected: "₹2,500", outstanding: "₹0", status: "Paid" as Status },
  { name: "Sharma Credit House", interest: "₹1,80,000", rate: "1%", charge: "₹1,800", collected: "₹1,000", outstanding: "₹800", status: "Partially Paid" as Status },
  { name: "Maa Lakshmi Finance", interest: "₹95,000", rate: "1%", charge: "₹950", collected: "₹0", outstanding: "₹950", status: "Pending" as Status },
];
