import { useEffect, useMemo, useState } from "react";
import { Ionicons } from "../../components/AppIcon";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Logo } from "../../components/Logo";
import { Badge, Button, Card, DataRow, Field, Grid, Header, IconBubble, KpiCard, Screen, SectionTitle, Segmented } from "../../components/ui";
import { customers, dashboardStats, duePayments, financerProfile, interestSchedules, ledger, loanStatus, loans, monthlyCollections, notifications, overdueAccounts, payments, supportTickets } from "../../data/mock";
import { colors, fonts, radii, shadows } from "../../theme/tokens";
import type { Accent, RootStackParamList, Status } from "../../types/navigation";
import { pageItems, platformApi } from "../../services/platformApi";
import { useAuth } from "../../auth/AuthContext";

type Props = NativeStackScreenProps<RootStackParamList, "FinancerApp">;
type Page = "Dashboard" | "Customers" | "Loans" | "Payments" | "Interest Schedule" | "Due & Overdue" | "Customer Ledger" | "Notifications" | "Reports" | "Service Charge" | "Support" | "Settings";
type Sheet = null | "addCustomer" | "editCustomer" | "customer" | "createLoan" | "loan" | "payment" | "reschedule" | "sms";
type CustomerRecord = (typeof customers)[number];
type LoanRecord = (typeof loans)[number];

const menu: { label: Page; displayLabel?: string; icon: keyof typeof Ionicons.glyphMap; badge?: number }[] = [
  { label: "Dashboard", icon: "grid-outline" }, { label: "Customers", icon: "people-outline" }, { label: "Loans", icon: "wallet-outline" },
  { label: "Payments", icon: "card-outline" }, { label: "Customer Ledger", icon: "document-text-outline" }, { label: "Reports", icon: "bar-chart-outline" },
  { label: "Service Charge", icon: "receipt-outline", badge: 1 }, { label: "Settings", icon: "settings-outline" },
];

const formatCurrency = (value: number) => `₹${value.toLocaleString("en-IN")}`;

export function FinancerAppScreen({ navigation }: Props) {
  const { logout } = useAuth();
  void logout;
  const [page, setPage] = useState<Page>("Dashboard"); const [menuOpen, setMenuOpen] = useState(false); const [sheet, setSheet] = useState<Sheet>(null);
  const [customerItems, setCustomerItems] = useState<CustomerRecord[]>(() => customers.map((item) => ({ ...item })));
  const [loanItems, setLoanItems] = useState<LoanRecord[]>(() => loans.map((item) => ({ ...item })));
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord>(customers[0]!);
  const [selectedLoan, setSelectedLoan] = useState<LoanRecord>(loans[0]!);
  useEffect(() => {
    void Promise.all([platformApi.customers.all(), platformApi.loans.all()]).then(([customerPayload, loanPayload]) => {
      const liveCustomers = pageItems(customerPayload).map((item: any) => ({ id: item.customerNumber ?? item.id, apiId: item.id, name: item.fullName ?? item.name, mobile: item.mobile ?? item.phone ?? "", loans: Number(item.activeLoanCount ?? item.loanCount ?? 0), outstanding: Number(item.outstandingPrincipal ?? item.outstanding ?? 0), due: item.nextDueDate ? String(item.nextDueDate).slice(0, 10) : "—", status: item.status ?? "Active", city: item.city ?? "" })) as CustomerRecord[];
      const liveLoans = pageItems(loanPayload).map((item: any) => ({ id: item.loanNumber ?? item.id, apiId: item.id, customer: item.customerName ?? item.customer, principal: Number(item.principal ?? item.principalAmount ?? 0), rate: `${item.interestRate ?? item.annualInterestRate ?? 0}%`, frequency: item.interestCollectionFrequency ?? item.collectionFrequency ?? "Monthly", outstanding: Number(item.outstandingPrincipal ?? item.outstanding ?? 0), nextDue: item.nextDueDate ? String(item.nextDueDate).slice(0, 10) : "—", status: item.status ?? "Active" })) as LoanRecord[];
      setCustomerItems(liveCustomers); setLoanItems(liveLoans); if (liveCustomers[0]) setSelectedCustomer(liveCustomers[0]); if (liveLoans[0]) setSelectedLoan(liveLoans[0]);
    }).catch((reason) => Alert.alert("Unable to load portfolio", reason instanceof Error ? reason.message : "Please try again."));
  }, []);
  const navigate = (next: Page) => { setPage(next); setMenuOpen(false); };
  const openCustomer = (customer: CustomerRecord) => { setSelectedCustomer(customer); setSheet("customer"); };
  const openLoan = (loan: LoanRecord) => { setSelectedLoan(loan); setSheet("loan"); };
  const quickTabs: Page[] = ["Dashboard", "Customers", "Loans", "Payments"];
  const addCustomer = (name: string) => setCustomerItems((old) => [{ id: `CUST-${String(108 + old.length - customers.length).padStart(3, "0")}`, name, mobile: "+91 00000 00000", loans: 0, outstanding: 0, due: "—", status: "Active", city: "Ahmedabad" }, ...old]);
  const addLoan = (record: Omit<LoanRecord, "id" | "status" | "outstanding" | "nextDue">) => setLoanItems((old) => [{ ...record, id: `LN${String(133 + old.length - loans.length).padStart(6, "0")}`, outstanding: record.principal, nextDue: "14-Sep-2026", status: "Active" }, ...old]);
  return <View style={styles.app}><SafeAreaView edges={["top"]} style={styles.topbar}><Pressable onPress={() => setMenuOpen(true)} style={styles.menuButton}><Ionicons name="menu" size={23} color={colors.dark} /></Pressable><Logo size={33} /><View style={styles.topActions}><Pressable onPress={() => navigate("Notifications")}><Ionicons name="notifications-outline" size={22} color={colors.dark} /><View style={styles.notificationDot} /></Pressable><View style={styles.avatar}><Text style={styles.avatarText}>SP</Text></View></View></SafeAreaView><View style={styles.body}>{renderPage(page, navigate, setSheet, openCustomer, openLoan, customerItems, loanItems)}</View><View style={styles.bottomNav}>{quickTabs.map((tab) => { const active = page === tab; const item = menu.find((m) => m.label === tab)!; return <Pressable key={tab} onPress={() => navigate(tab)} style={styles.navItem}><Ionicons name={item.icon} size={21} color={active ? colors.cyan : colors.subtle} /><Text style={[styles.navText, active && styles.navTextActive]}>{tab}</Text></Pressable>; })}<Pressable onPress={() => setMenuOpen(true)} style={styles.navItem}><Ionicons name="apps-outline" size={21} color={colors.subtle} /><Text style={styles.navText}>More</Text></Pressable></View><MenuModal visible={menuOpen} current={page} onClose={() => setMenuOpen(false)} onNavigate={navigate} onLogout={() => navigation.replace("FinancerLogin")} /><FlowModal sheet={sheet} setSheet={setSheet} customer={selectedCustomer} loan={selectedLoan} onAddCustomer={addCustomer} onAddLoan={addLoan} /></View>;
}

function renderPage(page: Page, navigate: (page: Page) => void, setSheet: (sheet: Sheet) => void, openCustomer: (customer: CustomerRecord) => void, openLoan: (loan: LoanRecord) => void, customerItems: CustomerRecord[], loanItems: LoanRecord[]) {
  switch (page) {
    case "Dashboard": return <Dashboard navigate={navigate} setSheet={setSheet} />;
    case "Customers": return <Customers setSheet={setSheet} openCustomer={openCustomer} records={customerItems} />;
    case "Loans": return <Loans setSheet={setSheet} openLoan={openLoan} records={loanItems} />;
    case "Payments": return <Payments setSheet={setSheet} />;
    case "Interest Schedule": return <InterestSchedule setSheet={setSheet} />;
    case "Due & Overdue": return <DueOverdue setSheet={setSheet} />;
    case "Customer Ledger": return <Ledger />;
    case "Notifications": return <Notifications />;
    case "Reports": return <Reports />;
    case "Service Charge": return <ServiceCharge />;
    case "Support": return <Support />;
    case "Settings": return <Settings />;
  }
}

function Dashboard({ navigate, setSheet }: { navigate: (page: Page) => void; setSheet: (sheet: Sheet) => void }) {
  const kpis: [string, string, Accent, keyof typeof Ionicons.glyphMap][] = [
    ["Total Customers", String(dashboardStats.totalCustomers), "cyan", "people-outline"],
    ["Active Loans", String(dashboardStats.activeLoans), "purple", "wallet-outline"],
    ["Total Amount Given", formatCurrency(dashboardStats.totalGiven), "green", "cash-outline"],
    ["Principal Outstanding", formatCurrency(dashboardStats.principalOutstanding), "orange", "card-outline"],
  ];
  return <Screen>
    <Header title="Good Evening, Suresh 👋" subtitle="Here's your loan and customer overview for today · 10-Sep-2026" action={<Pressable onPress={() => navigate("Notifications")}><Ionicons name="notifications-outline" size={22} color={colors.dark} /></Pressable>} />
    <Grid>{kpis.map(([label, value, accent, icon]) => <KpiCard key={label} label={label} value={value} accent={accent} icon={icon} />)}</Grid>
    <Card><SectionTitle>Collection Overview</SectionTitle><Text style={styles.meta}>Monthly interest collections vs expected</Text><View style={styles.chart}>{monthlyCollections.map((item) => <View key={item.month} style={styles.barWrap}><View style={styles.barPair}><View style={[styles.bar, { height: Math.max(32, item.expected / 400), backgroundColor: "#DDE5EE" }]} /><View style={[styles.bar, { height: Math.max(32, item.collected / 400), backgroundColor: colors.cyan }]} /></View><Text style={styles.barLabel}>{item.month}</Text></View>)}</View><View style={styles.legend}><Text style={styles.meta}>● Expected</Text><Text style={[styles.meta, { color: colors.cyan }]}>● Collected</Text></View></Card>
    <Card><SectionTitle>Loan Status</SectionTitle><Text style={styles.meta}>Distribution of 180 active loans</Text>{loanStatus.map((item) => <DataRow key={item.label} title={item.label} amount={String(item.value)} status={item.status} />)}</Card>
    <Card><SectionTitle action={<Button label="View all" variant="ghost" onPress={() => navigate("Due & Overdue")} />}>Upcoming & Due Payments</SectionTitle><Text style={styles.meta}>Immediate payments requiring collection action</Text>{duePayments.map((item) => <DataRow key={item.id} title={item.customer} subtitle={`${item.loan} · ${item.due}`} amount={formatCurrency(item.amount)} status={item.status} onPress={() => setSheet("payment")} />)}</Card>
  </Screen>;
}


function Customers({ setSheet, openCustomer, records }: { setSheet: (sheet: Sheet) => void; openCustomer: (customer: CustomerRecord) => void; records: CustomerRecord[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const filtered = records.filter((customer) => {
    const matchesSearch = `${customer.name}${customer.mobile}${customer.id}${customer.city}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (status === "All" || customer.status === status);
  });
  return <Screen>
    <Header title="Customers" subtitle="Manage your customers and their loan accounts." action={<Button label="Add Customer" icon="add" onPress={() => setSheet("addCustomer")} />} />
    <Grid><KpiCard label="Total Customers" value={String(records.length)} accent="cyan" icon="people-outline" /><KpiCard label="Active Customers" value={String(records.filter((item) => item.status === "Active").length)} accent="green" icon="checkmark-circle-outline" /><KpiCard label="New This Month" value="12" accent="cyan" icon="person-add-outline" /><KpiCard label="With Overdue" value={String(records.filter((item) => item.status === "Overdue").length)} accent="error" icon="alert-circle-outline" /></Grid>
    <Field label="Search" placeholder="Search by customer name, phone, city or ID" value={search} onChangeText={setSearch} />
    <Segmented options={["All", "Active", "Due", "Overdue", "Closed"]} value={status} onChange={setStatus} />
    <Card>{filtered.map((customer) => <DataRow key={customer.id} title={customer.name} subtitle={`${customer.id} · ${customer.mobile} · ${customer.city} · ${customer.loans} active loan${customer.loans === 1 ? "" : "s"} · Due ${customer.due}`} amount={formatCurrency(customer.outstanding)} status={customer.status} onPress={() => openCustomer(customer)} />)}{filtered.length === 0 ? <Empty label="No customers match your search and status filters." /> : null}</Card>
  </Screen>;
}

function Loans({ setSheet, openLoan, records }: { setSheet: (sheet: Sheet) => void; openLoan: (loan: LoanRecord) => void; records: LoanRecord[] }) {
  const [status, setStatus] = useState("All");
  const [type, setType] = useState("All");
  const [search, setSearch] = useState("");
  const filtered = records.filter((loan) => {
    const matchesSearch = `${loan.id}${loan.customer}${loan.frequency}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (status === "All" || loan.status === status) && (type === "All" || loan.frequency === type);
  });
  return <Screen>
    <Header title="Loans" subtitle="Manage and track all loan accounts." action={<Button label="New Loan" icon="add" accent="purple" onPress={() => setSheet("createLoan")} />} />
    <Grid><KpiCard label="Total Loans" value={String(records.length)} accent="cyan" icon="wallet-outline" /><KpiCard label="Active Loans" value={String(records.filter((item) => item.status === "Active").length)} accent="green" icon="checkmark-circle-outline" /><KpiCard label="Closed Loans" value={String(records.filter((item) => item.status === "Closed").length)} accent="cyan" icon="time-outline" /><KpiCard label="Overdue Loans" value={String(records.filter((item) => item.status === "Overdue").length)} accent="error" icon="alert-circle-outline" /></Grid>
    <Field label="Search" placeholder="Search loan ID, customer or collection type" value={search} onChangeText={setSearch} />
    <Segmented options={["All", "Active", "Due", "Overdue", "Closed"]} value={status} onChange={setStatus} />
    <Segmented options={["All", "Daily Collection", "Weekly Collection", "Monthly Interest"]} value={type} onChange={setType} />
    <Card>{filtered.map((loan) => <DataRow key={loan.id} title={`${loan.id} · ${loan.customer}`} subtitle={`${loan.frequency} · ${loan.rate} · Outstanding ${formatCurrency(loan.outstanding)} · Due ${loan.nextDue}`} amount={formatCurrency(loan.principal)} status={loan.status} onPress={() => openLoan(loan)} />)}{filtered.length === 0 ? <Empty label="No loans match your filters." /> : null}</Card>
  </Screen>;
}

function Payments({ setSheet: _setSheet }: { setSheet: (sheet: Sheet) => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  void loading;
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [date, setDate] = useState("");
  const filtered = items.filter((payment) => `${payment.id}${payment.loanId}${payment.customer}${payment.customerId}`.toLowerCase().includes(search.toLowerCase()) && (status === "All" || payment.status === status) && (!date || payment.dueDate === date));
  const collected = items.filter((item) => item.status === "Success").reduce((sum, item) => sum + item.amount, 0);
  const pending = items.filter((item) => item.status === "Pending").reduce((sum, item) => sum + item.amount, 0);
  const overdue = items.filter((item) => item.status === "Overdue").reduce((sum, item) => sum + item.amount, 0);
  const load = async () => {
    setLoading(true); setError("");
    try { const payload = await platformApi.payments.allSchedules(); setItems(pageItems(payload).map((item: any) => ({ ...item, loanIdRaw: item.loanId, customer: item.customerName ?? item.customer, customerId: item.customerNumber ?? item.customerId, loanId: item.loanNumber ?? item.loanId, dueDate: String(item.dueDate).slice(0, 10), amount: Number(item.amountDue ?? item.amount ?? 0), status: item.status === "Paid" ? "Success" : item.status, method: item.paymentMode ?? item.method }))); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load payments."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const record = async (id: string) => { const payment = items.find((item) => item.id === id); if (!payment) return; try { await platformApi.payments.record({ loanId: payment.loanIdRaw ?? payment.loanId, paymentScheduleId: payment.id, amount: Number(payment.amount), receivedAt: new Date().toISOString(), mode: "Cash", externalReference: null, notes: "Recorded from mobile" }); await load(); Alert.alert("Payment recorded", "The payment and monthly billing totals were updated."); } catch (reason) { Alert.alert("Payment not recorded", reason instanceof Error ? reason.message : "Please try again."); } };
  const reschedule = async (id: string) => { try { await platformApi.payments.reschedule(id, { newDueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), reason: "Rescheduled from mobile" }); await load(); } catch (reason) { Alert.alert("Unable to reschedule", reason instanceof Error ? reason.message : "Please try again."); } };
  return <Screen>
    <Header title="Payments & Interest Schedule" subtitle="Monitor collections, interest dues and payment transactions by date." />
    {error ? <Card><Text style={{ color: colors.error }}>{error}</Text><Button label="Retry" variant="secondary" onPress={() => void load()} /></Card> : null}
    <Grid><KpiCard label="Total Collected" value={formatCurrency(collected)} accent="green" icon="checkmark-circle-outline" /><KpiCard label="This Month" value={formatCurrency(collected)} accent="cyan" icon="calendar-outline" /><KpiCard label="Pending Collection" value={formatCurrency(pending)} accent="yellow" icon="time-outline" /><KpiCard label="Overdue Collection" value={formatCurrency(overdue)} accent="error" icon="alert-circle-outline" /></Grid>
    <Field label="Search" placeholder="Search loan ID, customer or customer ID" value={search} onChangeText={setSearch} />
    <Field label="Due Date (YYYY-MM-DD)" placeholder="2026-08-14" value={date} onChangeText={setDate} />
    <Segmented options={["All", "Success", "Pending", "Overdue", "Rescheduled"]} value={status} onChange={setStatus} />
    <Card><SectionTitle>Payment Activity</SectionTitle><Text style={styles.meta}>{filtered.length} records grouped by due date</Text>{filtered.map((payment) => <View key={payment.id} style={styles.paymentRecord}><DataRow title={`${payment.loanId} · ${payment.customer}`} subtitle={`${payment.customerId} · Due ${payment.dueDate}${payment.method ? ` · ${payment.method}` : ""}`} amount={formatCurrency(payment.amount)} status={payment.status} />{payment.status !== "Success" ? <View style={styles.twoButtons}><Button label="Record Payment" style={styles.flex} onPress={() => record(payment.id)} /><Button label="Reschedule" variant="secondary" style={styles.flex} onPress={() => reschedule(payment.id)} /></View> : <Button label="View Details" variant="ghost" onPress={() => Alert.alert("Payment Details", `${payment.id}\n${payment.customer}\n${formatCurrency(payment.amount)} via ${payment.method}`)} />}</View>)}{filtered.length === 0 ? <Empty label="No payment records match the selected filters." /> : null}</Card>
  </Screen>;
}

function InterestSchedule({ setSheet }: { setSheet: (sheet: Sheet) => void }) { const [tab, setTab] = useState("All"); const rows = tab === "All" ? interestSchedules : interestSchedules.filter((item) => item.status === tab); const scheduled = interestSchedules.reduce((sum, item) => sum + item.amount, 0); return <Screen><Header title="Interest Schedule" subtitle="Track interest due dates across every active loan." /><Grid><KpiCard label="Scheduled Interest" value={formatCurrency(scheduled)} accent="purple" icon="calendar-outline" /><KpiCard label="Due & Overdue" value={formatCurrency(interestSchedules.filter((item) => item.status !== "Upcoming").reduce((sum, item) => sum + item.amount, 0))} accent="orange" icon="alert-circle-outline" /></Grid><Segmented options={["All", "Due", "Overdue", "Upcoming"]} value={tab} onChange={setTab} /><Card><SectionTitle>Interest Accounts</SectionTitle>{rows.map((item) => <DataRow key={item.loanId} title={`${item.loanId} · ${item.customer}`} subtitle={`Principal ${formatCurrency(item.principal)} · ${item.rate} · Due ${item.due}`} amount={formatCurrency(item.amount)} status={item.status} onPress={item.status !== "Upcoming" ? () => setSheet("payment") : undefined} />)}{rows.length === 0 ? <Empty label="No interest entries in this category." /> : null}</Card></Screen>; }

function DueOverdue({ setSheet }: { setSheet: (sheet: Sheet) => void }) { const [tab, setTab] = useState("All"); const allRows = [...overdueAccounts, ...duePayments]; const rows = tab === "All" ? allRows : allRows.filter((item) => item.status === tab); return <Screen><Header title="Due & Overdue" subtitle="Prioritise collections and follow up without losing context." /><Grid><KpiCard label="Due Today" value={formatCurrency(dashboardStats.interestDueToday)} accent="orange" icon="calendar-outline" /><KpiCard label="Overdue" value={formatCurrency(dashboardStats.overdueAmount)} accent="error" icon="alert-circle-outline" /></Grid><Segmented options={["All", "Due", "Overdue", "Upcoming"]} value={tab} onChange={setTab} />{rows.map((item) => <Card key={item.id}><View style={styles.dueTop}><View style={styles.flex}><Text style={styles.rowTitle}>{item.customer}</Text><Text style={styles.meta}>{item.loan} · {item.due} · {item.days}</Text></View><Badge status={item.status} /></View><Text style={styles.dueAmount}>{formatCurrency(item.amount)}</Text><View style={styles.twoButtons}><Button label="Record Payment" style={styles.flex} onPress={() => setSheet("payment")} /><Button label="Reschedule" variant="secondary" style={styles.flex} onPress={() => setSheet("reschedule")} /></View><Button label="Send Reminder" icon="chatbubble-outline" variant="ghost" onPress={() => setSheet("sms")} /></Card>)}{rows.length === 0 ? <Empty label="No collection items in this category." /> : null}</Screen>; }

function normalizeLedgerPayload(payload: any, fallbackCustomer: any, fallbackEntries: any[] = []) {
  const entries = Array.isArray(payload?.entries) ? payload.entries : pageItems(payload);
  const customer = payload?.customer ?? fallbackCustomer ?? null;
  return {
    customer,
    entries: (entries.length ? entries : fallbackEntries).map((item: any, index: number) => ({
      id: item.id ?? `ledger-${index}`,
      transactionAt: item.transactionAt ?? item.occurredAt ?? item.date ?? item.transactionDate,
      transactionNumber: item.transactionNumber ?? item.transactionId ?? item.reference ?? item.id ?? `TXN-${index + 1}`,
      type: item.type ?? item.description ?? item.transactionType ?? "Ledger entry",
      debit: Number(item.debit ?? item.debitAmount ?? 0),
      credit: Number(item.credit ?? item.creditAmount ?? 0),
      balance: Number(item.balance ?? item.closingBalance ?? item.runningBalance ?? 0),
      status: item.status,
    })),
  };
}

function formatLedgerDate(value: any) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function buildCsv(rows: any[]) {
  const data = [
    ["Date", "Transaction", "Description", "Debit", "Credit", "Balance"],
    ...rows.map((item) => [item.transactionAt, item.transactionNumber, item.type, item.debit, item.credit, item.balance]),
  ];
  return data.map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\r\n");
}

function Ledger() {
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [ledgerData, setLedgerData] = useState<{ customer: any; entries: any[] }>({ customer: null, entries: [] });
  const [search, setSearch] = useState("");
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoadingCustomers(true);
    platformApi.customers.all()
      .then((payload) => {
        if (!mounted) return;
        const items = pageItems(payload);
        setCustomersList(items);
        setSelectedId((current) => current || items[0]?.id || "");
      })
      .catch((reason) => mounted && setError(reason instanceof Error ? reason.message : "Unable to load customers."))
      .finally(() => mounted && setLoadingCustomers(false));
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    let mounted = true;
    setLoadingLedger(true);
    setError("");
    platformApi.customers.ledger(selectedId, { pageSize: 500 })
      .then((payload) => {
        if (!mounted) return;
        const selected = customersList.find((item) => item.id === selectedId);
        setLedgerData(normalizeLedgerPayload(payload, selected));
      })
      .catch((reason) => mounted && setError(reason instanceof Error ? reason.message : "Unable to load ledger."))
      .finally(() => mounted && setLoadingLedger(false));
    return () => { mounted = false; };
  }, [selectedId, customersList]);

  const filteredCustomers = useMemo(() => {
    const value = search.trim().toLowerCase();
    return customersList.filter((item) => !value || [item.fullName, item.customerNumber, item.phone].some((field) => String(field || "").toLowerCase().includes(value)));
  }, [customersList, search]);

  const totals = useMemo(() => ledgerData.entries.reduce((sum, item) => ({
    debit: sum.debit + Number(item.debit || 0),
    credit: sum.credit + Number(item.credit || 0),
  }), { debit: 0, credit: 0 }), [ledgerData.entries]);

  const selectedCustomer = ledgerData.customer ?? customersList.find((item) => item.id === selectedId);
  const currentBalance = ledgerData.entries.length
    ? Number(ledgerData.entries[ledgerData.entries.length - 1].balance || totals.debit - totals.credit)
    : totals.debit - totals.credit;

  const exportCsv = async () => {
    if (!ledgerData.entries.length) return;
    try {
      await Share.share({
        title: `${selectedCustomer?.customerNumber || "customer"}-ledger.csv`,
        message: buildCsv(ledgerData.entries),
      });
    } catch (reason) {
      Alert.alert("Export failed", reason instanceof Error ? reason.message : "Unable to share the ledger CSV.");
    }
  };

  return <Screen>
    <Header title="Customer Ledger" subtitle="Review the authoritative transaction history for each customer." />
    {error ? <Card><Text style={styles.error}>{error}</Text></Card> : null}
    <Field label="Search customers" value={search} onChangeText={setSearch} placeholder="Name, customer number or phone" />
    <Card>
      <SectionTitle>Customers</SectionTitle>
      {loadingCustomers ? <Text style={styles.meta}>Loading customers…</Text> : filteredCustomers.length ? filteredCustomers.map((item) => {
        const active = selectedId === item.id;
        return <Pressable key={item.id} onPress={() => setSelectedId(item.id)} style={[styles.customerLedgerItem, active && styles.customerLedgerItemActive]}>
          <View style={styles.largeAvatar}><Text style={styles.largeAvatarText}>{String(item.fullName || "C").charAt(0).toUpperCase()}</Text></View>
          <View style={styles.flex}><Text style={styles.rowTitle}>{item.fullName || "Unnamed customer"}</Text><Text style={styles.meta}>{item.customerNumber || item.id} · {item.phone || "—"}</Text></View>
          {active ? <Ionicons name="checkmark-circle" size={21} color={colors.cyan} /> : null}
        </Pressable>;
      }) : <Text style={styles.meta}>No customers found.</Text>}
    </Card>

    {selectedCustomer ? <>
      <Card><View style={styles.profileHero}><View style={styles.largeAvatar}><Text style={styles.largeAvatarText}>{String(selectedCustomer.fullName || "C").charAt(0).toUpperCase()}</Text></View><View style={styles.flex}><Text style={styles.formTitle}>{selectedCustomer.fullName || "Select a customer"}</Text><Text style={styles.meta}>{selectedCustomer.customerNumber || selectedCustomer.id} · {selectedCustomer.phone || "—"}</Text></View></View></Card>
      <Grid>
        <KpiCard label="Total Disbursed" value={formatCurrency(totals.debit)} accent="cyan" />
        <KpiCard label="Total Received" value={formatCurrency(totals.credit)} accent="green" />
        <KpiCard label="Current Balance" value={formatCurrency(currentBalance)} accent="orange" />
      </Grid>
      <Card>
        <SectionTitle action={<Button label="Export CSV" icon="download-outline" variant="secondary" onPress={() => void exportCsv()} disabled={!ledgerData.entries.length} />}>Ledger Entries</SectionTitle>
        {loadingLedger ? <Text style={styles.meta}>Loading ledger…</Text> : ledgerData.entries.length ? ledgerData.entries.map((item, index) => <Card key={item.id ?? index} style={styles.ledgerEntryCard}>
          <View style={styles.dueTop}><View style={styles.flex}><Text style={styles.rowTitle}>{formatLedgerDate(item.transactionAt)}</Text><Text style={styles.meta}>{item.transactionNumber}</Text></View><Text style={styles.summaryValue}>{formatCurrency(item.balance)}</Text></View>
          <Text style={styles.meta}>{item.type}</Text>
          <View style={styles.ledgerAmounts}><Text style={styles.ledgerDebit}>Debit {item.debit ? formatCurrency(item.debit) : "—"}</Text><Text style={styles.ledgerCredit}>Credit {item.credit ? formatCurrency(item.credit) : "—"}</Text></View>
        </Card>) : <Empty label="No ledger transactions found." />}
      </Card>
    </> : null}
  </Screen>;
}
function Notifications() { const [read, setRead] = useState<number[]>(notifications.filter((item) => !item.unread).map((item) => item.id)); const [category, setCategory] = useState("All"); const items = category === "All" ? notifications : notifications.filter((item) => item.category === category); return <Screen><Header title="Notifications" subtitle="Updates across loans, payments and billing." action={<Button label="Mark all read" variant="ghost" onPress={() => setRead(notifications.map((item) => item.id))} />} /><Segmented options={["All", "Overdue", "Payments", "Loans", "System"]} value={category} onChange={setCategory} />{items.map((item) => { const isRead = read.includes(item.id); const accent: Accent = item.category === "Overdue" ? "error" : item.category === "Payments" ? "green" : item.category === "Loans" ? "purple" : "cyan"; return <Pressable key={item.id} onPress={() => setRead((old) => old.includes(item.id) ? old.filter((id) => id !== item.id) : [...old, item.id])}><Card style={[styles.notification, isRead && styles.readNotification]}><IconBubble icon={accent === "error" ? "alert-circle-outline" : accent === "green" ? "checkmark-circle-outline" : accent === "purple" ? "wallet-outline" : "information-circle-outline"} accent={accent} /><View style={styles.flex}><View style={styles.notificationTitle}><Text style={styles.rowTitle}>{item.title}</Text><Badge status={item.category === "Overdue" ? "Overdue" : item.category === "Payments" ? "Paid" : "Active"} /></View><Text style={styles.meta}>{item.body}</Text><Text style={styles.time}>{item.time}</Text></View>{!isRead ? <View style={styles.unread} /> : null}</Card></Pressable>; })}</Screen>; }

type ReportTab = "Customers" | "Loans" | "Payments" | "Interest" | "Overdue" | "Customer Statement";
function Reports() {
  const [tab, setTab] = useState<ReportTab>("Customers");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [statementCustomer, setStatementCustomer] = useState("Ramesh Kumar");
  const query = search.trim().toLowerCase();
  const rows = tab === "Customers" ? customers.filter((item) => `${item.name} ${item.id} ${item.mobile}`.toLowerCase().includes(query) && (status === "All" || item.status === status))
    : tab === "Loans" ? loans.filter((item) => `${item.id} ${item.customer}`.toLowerCase().includes(query) && (status === "All" || item.status === status))
    : tab === "Payments" ? payments.filter((item) => `${item.id} ${item.loanId} ${item.customer}`.toLowerCase().includes(query) && (status === "All" || item.status === status))
    : tab === "Interest" ? interestSchedules.filter((item) => `${item.loanId} ${item.customer}`.toLowerCase().includes(query) && (status === "All" || item.status === status))
    : tab === "Overdue" ? overdueAccounts.filter((item) => `${item.loan} ${item.customer}`.toLowerCase().includes(query))
    : ledger;
  const statusOptions = tab === "Customers" || tab === "Loans" ? ["All", "Active", "Due", "Overdue", "Closed"] : tab === "Payments" ? ["All", "Paid"] : tab === "Interest" ? ["All", "Due", "Overdue", "Upcoming"] : ["All"];
  const total = tab === "Customers" ? customers.reduce((sum, item) => sum + item.outstanding, 0)
    : tab === "Loans" ? (rows as typeof loans).reduce((sum, item) => sum + item.outstanding, 0)
    : tab === "Payments" ? (rows as typeof payments).reduce((sum, item) => sum + item.amount, 0)
    : tab === "Interest" ? (rows as typeof interestSchedules).reduce((sum, item) => sum + item.amount, 0)
    : tab === "Overdue" ? (rows as typeof overdueAccounts).reduce((sum, item) => sum + item.amount, 0) : customers.find((item) => item.name === statementCustomer)?.outstanding ?? 0;
  return <Screen><Header title="Reports" subtitle="Generate and export detailed business reports." action={<Button label="Export" icon="download-outline" onPress={() => Alert.alert("Report exported", `${tab} report with ${rows.length} records is ready.`)} />} /><Segmented options={["Customers", "Loans", "Payments", "Interest", "Overdue", "Customer Statement"]} value={tab} onChange={(value) => { setTab(value as ReportTab); setStatus("All"); setSearch(""); }} />{tab === "Customer Statement" ? <Segmented options={customers.map((item) => item.name)} value={statementCustomer} onChange={setStatementCustomer} /> : <><Field label="Search" placeholder={`Search ${tab.toLowerCase()} report`} value={search} onChangeText={setSearch} /><Segmented options={statusOptions} value={status} onChange={setStatus} /></>}<Grid><KpiCard label={tab === "Overdue" ? "Overdue Accounts" : tab === "Customer Statement" ? "Transactions" : "Records"} value={String(rows.length)} accent="cyan" /><KpiCard label={tab === "Customer Statement" ? "Outstanding" : "Total Amount"} value={formatCurrency(total)} accent={tab === "Overdue" ? "error" : "purple"} /></Grid><Card><SectionTitle>{tab} Data</SectionTitle>{tab === "Customers" ? (rows as typeof customers).map((item) => <DataRow key={item.id} title={item.name} subtitle={`${item.id} · ${item.mobile} · ${item.city} · ${item.loans} loans`} amount={formatCurrency(item.outstanding)} status={item.status} />) : tab === "Loans" ? (rows as typeof loans).map((item) => <DataRow key={item.id} title={`${item.id} · ${item.customer}`} subtitle={`${item.frequency} · ${item.rate} · Due ${item.nextDue}`} amount={formatCurrency(item.outstanding)} status={item.status} />) : tab === "Payments" ? (rows as typeof payments).map((item) => <DataRow key={item.id} title={`${item.id} · ${item.customer}`} subtitle={`${item.loanId} · ${item.date} · ${item.method}`} amount={formatCurrency(item.amount)} status={item.status} />) : tab === "Interest" ? (rows as typeof interestSchedules).map((item) => <DataRow key={item.loanId} title={`${item.loanId} · ${item.customer}`} subtitle={`${item.rate} · Due ${item.due}`} amount={formatCurrency(item.amount)} status={item.status} />) : tab === "Overdue" ? (rows as typeof overdueAccounts).map((item) => <DataRow key={item.id} title={`${item.loan} · ${item.customer}`} subtitle={`${item.due} · ${item.days}`} amount={formatCurrency(item.amount)} status={item.status} />) : ledger.map((item, index) => <DataRow key={index} {...item} />)}{rows.length === 0 ? <Empty label="No records match the selected filters." /> : null}</Card></Screen>;
}

function ServiceCharge() { const history: [string, string, string, Status][] = [["August 2026", "₹28,500 interest", "₹285", "Pending"], ["July 2026", "₹24,000 interest", "₹240", "Paid"], ["June 2026", "₹22,000 interest", "₹220", "Paid"], ["May 2026", "₹24,500 interest", "₹245", "Paid"], ["April 2026", "₹21,000 interest", "₹210", "Paid"]]; return <Screen><Header title="INRFS Service Charge" subtitle="Your monthly service charge based on interest collected." /><Card style={styles.chargeCard}><View style={styles.dueTop}><View><Text style={styles.meta}>Current billing period</Text><Text style={styles.chargeMonth}>August 2026</Text></View><Badge status="Pending" /></View><View style={styles.formula}><Text style={styles.formulaValue}>₹28,500</Text><Text style={styles.formulaOperator}>× 1% =</Text><Text style={[styles.formulaValue, { color: colors.purple }]}>₹285</Text></View><Text style={styles.meta}>Interest collected × service charge = amount payable</Text></Card><Card style={styles.warning}><Ionicons name="warning-outline" color={colors.orange} size={23} /><View style={styles.flex}><Text style={styles.rowTitle}>Operations-managed collection</Text><Text style={styles.meta}>Our operations team will contact you shortly. Do not pay through any other channel.</Text></View></Card><Button label="Contact Operations" icon="call-outline" variant="secondary" onPress={() => Alert.alert("Request received", "Our team will contact +91 98765 43210 shortly.")} /><Card><SectionTitle>Service Charge History</SectionTitle>{history.map(([month, interest, amount, status]) => <DataRow key={month} title={month} subtitle={`${interest} · 1% charge`} amount={amount} status={status} onPress={() => Alert.alert(`${month} Statement`, `${interest}\nAmount payable: ${amount}\nStatus: ${status}`)} />)}</Card></Screen>; }

function Support() { const [priority, setPriority] = useState("Medium"); const [subject, setSubject] = useState(""); const [message, setMessage] = useState(""); const [submitted, setSubmitted] = useState(false); if (submitted) return <Screen contentStyle={styles.center}><IconBubble icon="checkmark-circle-outline" accent="green" size={72} /><Text style={styles.authTitle}>Ticket Submitted!</Text><Text style={styles.authSub}>Ticket #TKT1025 has been created. Our support team will contact you.</Text><Button label="Back to Support" onPress={() => setSubmitted(false)} /></Screen>; return <Screen><Header title="Support" subtitle="Create a request and track earlier conversations." /><Card style={styles.contactCard}><IconBubble icon="headset-outline" accent="cyan" /><View style={styles.flex}><Text style={styles.rowTitle}>INRFS Support Desk</Text><Text style={styles.meta}>Typical response within one business day</Text></View></Card><SectionTitle>New Ticket</SectionTitle><Card style={styles.formCard}><Field label="Subject" placeholder="Briefly describe your issue" value={subject} onChangeText={setSubject} /><Text style={styles.label}>Priority</Text><Segmented options={["Low", "Medium", "High", "Urgent"]} value={priority} onChange={setPriority} /><Field label="Message" placeholder="Describe your issue in detail..." multiline value={message} onChangeText={setMessage} /><Button label="Submit Support Ticket" onPress={() => subject.trim() && message.trim() ? setSubmitted(true) : Alert.alert("Complete the form", "Subject and message are required.")} /></Card><SectionTitle>Previous Tickets</SectionTitle><Card>{supportTickets.map((ticket) => <DataRow key={ticket.id} title={ticket.subject} subtitle={`${ticket.id} · ${ticket.category} · ${ticket.date}`} status={ticket.status} />)}</Card></Screen>; }

function Settings() { return <Screen><Header title="Settings" subtitle="Manage your account and preferences." /><Card style={styles.formCard}><View style={styles.profileHero}><View style={styles.largeAvatar}><Text style={styles.largeAvatarText}>S</Text></View><View style={styles.flex}><Text style={styles.formTitle}>{financerProfile.name}</Text><Text style={styles.meta}>{financerProfile.plan} · {financerProfile.businessName}</Text></View></View><Field label="Full Name" defaultValue={financerProfile.name} /><Field label="Business Name" defaultValue={financerProfile.businessName} /><Field label="Mobile Number" defaultValue={financerProfile.mobile} keyboardType="phone-pad" /><Field label="Email Address" defaultValue={financerProfile.email} keyboardType="email-address" /><Field label="City" defaultValue={financerProfile.city} /><Field label="State" defaultValue={financerProfile.state} /><Button label="Save Changes" onPress={() => Alert.alert("Saved", "Profile changes saved successfully.")} /></Card></Screen>; }

function MenuModal({ visible, current, onClose, onNavigate, onLogout }: { visible: boolean; current: Page; onClose: () => void; onNavigate: (page: Page) => void; onLogout: () => void }) { return <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}><Pressable style={styles.overlay} onPress={onClose}><Pressable style={styles.menuSheet} onPress={() => undefined}><View style={styles.sheetHandle} /><Logo size={40} /><ScrollView contentContainerStyle={styles.menuList}>{menu.map((item) => { const active = current === item.label; return <Pressable key={item.label} onPress={() => onNavigate(item.label)} style={[styles.menuRow, active && styles.menuRowActive]}><Ionicons name={item.icon} size={20} color={active ? colors.cyan : colors.muted} /><Text style={[styles.menuLabel, active && { color: colors.cyan }]}>{item.displayLabel ?? item.label}</Text>{item.badge ? <View style={styles.menuBadge}><Text style={styles.menuBadgeText}>{item.badge}</Text></View> : null}</Pressable>; })}</ScrollView><View style={styles.profileRow}><View style={styles.avatar}><Text style={styles.avatarText}>S</Text></View><View style={styles.flex}><Text style={styles.rowTitle}>Suresh Patel</Text><Text style={styles.meta}>Patel Finance</Text></View><Pressable onPress={onLogout}><Ionicons name="log-out-outline" size={23} color={colors.muted} /></Pressable></View></Pressable></Pressable></Modal>; }

function FlowModal({ sheet, setSheet, customer, loan, onAddCustomer, onAddLoan }: { sheet: Sheet; setSheet: (sheet: Sheet) => void; customer: CustomerRecord; loan: LoanRecord; onAddCustomer: (name: string) => void; onAddLoan: (record: Omit<LoanRecord, "id" | "status" | "outstanding" | "nextDue">) => void }) { const close = () => setSheet(null); return <Modal visible={sheet !== null} transparent animationType="slide" onRequestClose={close}><View style={styles.overlay}><SafeAreaView style={styles.flowSheet} edges={["bottom"]}><View style={styles.sheetHeader}><Text style={styles.sheetTitle}>{sheetTitle(sheet)}</Text><Pressable onPress={close}><Ionicons name="close" size={24} color={colors.muted} /></Pressable></View><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.flowBody}>{sheet === "addCustomer" ? <AddCustomer onDone={close} onAdd={onAddCustomer} /> : sheet === "editCustomer" ? <EditCustomer customer={customer} onDone={close} /> : sheet === "customer" ? <CustomerDetail customer={customer} setSheet={setSheet} /> : sheet === "createLoan" ? <CreateLoan customer={customer} onDone={close} onCreate={onAddLoan} /> : sheet === "loan" ? <LoanDetail loan={loan} setSheet={setSheet} /> : sheet === "payment" ? <RecordPayment loan={loan} onDone={close} /> : sheet === "reschedule" ? <Reschedule setSheet={setSheet} /> : sheet === "sms" ? <Sms onDone={close} /> : null}</ScrollView></SafeAreaView></View></Modal>; }
function sheetTitle(sheet: Sheet) { return sheet === "addCustomer" ? "Add Customer" : sheet === "editCustomer" ? "Edit Customer" : sheet === "customer" ? "Customer Details" : sheet === "createLoan" ? "Create New Loan" : sheet === "loan" ? "Loan Details" : sheet === "payment" ? "Record Payment" : sheet === "reschedule" ? "Reschedule Payment" : sheet === "sms" ? "Send Notification" : ""; }

function AddCustomer({ onDone, onAdd }: { onDone: () => void; onAdd: (name: string) => void }) { const [step, setStep] = useState(1); const [name, setName] = useState(""); const titles = ["Personal Information", "Address", "KYC", "Documents"]; const next = () => step < 4 ? setStep(step + 1) : name.trim() ? (onAdd(name.trim()), Alert.alert("Customer added", `${name} was added successfully.`), onDone()) : Alert.alert("Name required", "Return to step 1 and enter a customer name."); return <View style={styles.formCard}><View style={styles.progress}>{titles.map((_, i) => <View key={i} style={[styles.progressDot, i + 1 <= step && styles.progressActive]}><Text style={[styles.progressText, i + 1 <= step && { color: colors.white }]}>{i + 1}</Text></View>)}</View><Text style={styles.formTitle}>Step {step}: {titles[step - 1]}</Text>{step === 1 ? <><Field label="Full Name" placeholder="Ramesh Kumar" value={name} onChangeText={setName} /><Field label="Mobile Number" placeholder="+91 98765 43210" keyboardType="phone-pad" /><Field label="Email" placeholder="ramesh@example.com" keyboardType="email-address" /><Field label="Date of Birth" placeholder="15-Jan-1985" /><Field label="Gender" placeholder="Male / Female / Other" /></> : null}{step === 2 ? <><Field label="House / Flat Number" placeholder="B-204" /><Field label="Street" placeholder="Gandhi Road" /><Field label="Area" placeholder="Navrangpura" /><Field label="City" placeholder="Ahmedabad" /><Field label="State" placeholder="Gujarat" /><Field label="PIN Code" placeholder="380009" keyboardType="number-pad" /></> : null}{step === 3 ? <><Field label="Aadhaar Number" placeholder="1234 5678 9012" keyboardType="number-pad" /><Field label="PAN Number" placeholder="ABCDE1234F" autoCapitalize="characters" /></> : null}{step === 4 ? ["Aadhaar", "PAN", "Address Proof", "Photograph", "Other Documents"].map((d) => <Pressable key={d} onPress={() => Alert.alert("Document selected", `${d} attached locally for this demo.`)} style={styles.upload}><Ionicons name="cloud-upload-outline" size={22} color={colors.cyan} /><Text style={styles.rowTitle}>{d}</Text><Text style={styles.link}>Upload</Text></Pressable>) : null}<View style={styles.twoButtons}>{step > 1 ? <Button label="Back" variant="secondary" style={styles.flex} onPress={() => setStep(step - 1)} /> : null}<Button label={step === 4 ? "Add Customer" : "Continue"} style={styles.flex} onPress={next} /></View></View>; }

function EditCustomer({ customer, onDone }: { customer: CustomerRecord; onDone: () => void }) { return <View style={styles.formCard}><Field label="Full Name" defaultValue={customer.name} /><Field label="Mobile Number" defaultValue={customer.mobile} keyboardType="phone-pad" /><Field label="Email" defaultValue={`${customer.name.toLowerCase().replaceAll(" ", ".")}@example.com`} keyboardType="email-address" /><Field label="Date of Birth" defaultValue="15-Jan-1985" /><Field label="Gender" defaultValue="Male" /><Field label="City" defaultValue={customer.city} /><Button label="Save Changes" onPress={() => { Alert.alert("Customer updated", `${customer.name}'s details were updated successfully.`); onDone(); }} /></View>; }

function CustomerDetail({ customer, setSheet }: { customer: CustomerRecord; setSheet: (sheet: Sheet) => void }) { const [tab, setTab] = useState("Overview"); const customerLoans = loans.filter((loan) => loan.customer === customer.name); const customerPayments = payments.filter((payment) => payment.customer === customer.name); return <View style={styles.formCard}><View style={styles.profileHero}><View style={styles.largeAvatar}><Text style={styles.largeAvatarText}>{customer.name.split(" ").map((part) => part[0]).join("")}</Text></View><View style={styles.flex}><Text style={styles.formTitle}>{customer.name}</Text><Text style={styles.meta}>{customer.id} · {customer.mobile} · {customer.city}</Text><Badge status={customer.status} /></View></View><View style={styles.twoButtons}><Button label="Add Loan" style={styles.flex} onPress={() => setSheet("createLoan")} /><Button label="Edit" variant="secondary" style={styles.flex} onPress={() => setSheet("editCustomer")} /></View><Segmented options={["Overview", "Loans", "Payments", "Ledger"]} value={tab} onChange={setTab} /><Card><SectionTitle>{tab}</SectionTitle>{tab === "Overview" ? <><DataRow title="Outstanding Principal" amount={formatCurrency(customer.outstanding)} /><DataRow title="Active Loans" amount={String(customer.loans)} /><DataRow title="Next Due" amount={customer.due} status={customer.status === "Overdue" ? "Overdue" : customer.status === "Due" ? "Due" : undefined} /><DataRow title="Customer Status" amount={customer.status} status={customer.status} /></> : tab === "Loans" ? customerLoans.length ? customerLoans.map((loan) => <DataRow key={loan.id} title={loan.id} subtitle={`${loan.rate} · ${loan.frequency} · Due ${loan.nextDue}`} amount={formatCurrency(loan.principal)} status={loan.status} />) : <Empty label="No loans for this customer." /> : tab === "Payments" ? customerPayments.length ? customerPayments.map((payment) => <DataRow key={payment.id} title={payment.id} subtitle={`${payment.loanId} · ${payment.date} · ${payment.method}`} amount={formatCurrency(payment.amount)} status={payment.status} />) : <Empty label="No payments for this customer." /> : ledger.map((entry, index) => <DataRow key={index} {...entry} />)}</Card></View>; }

function CreateLoan({ customer, onDone, onCreate }: { customer: CustomerRecord; onDone: () => void; onCreate: (record: Omit<LoanRecord, "id" | "status" | "outstanding" | "nextDue">) => void }) { const [frequency, setFrequency] = useState("Monthly"); const [method, setMethod] = useState("UPI"); const [amount, setAmount] = useState("10000"); const [rate, setRate] = useState("10"); const calculated = useMemo(() => (Number(amount || 0) * Number(rate || 0) / 100).toLocaleString("en-IN"), [amount, rate]); const submit = () => { const principal = Number(amount); if (!principal || principal <= 0) return Alert.alert("Invalid amount", "Enter a valid loan amount."); onCreate({ customer: customer.name, principal, rate: `${rate}% ${frequency}`, frequency: frequency === "Monthly" ? "Monthly Interest" : `${frequency} Collection` }); Alert.alert("Loan created", `A new ${frequency.toLowerCase()} loan was created for ${customer.name} via ${method}.`); onDone(); }; return <View style={styles.formCard}><Field label="Selected Customer" defaultValue={`${customer.name} · ${customer.id}`} editable={false} /><Field label="Amount Given (₹)" value={amount} onChangeText={setAmount} keyboardType="number-pad" /><Field label="Date Given" defaultValue="12-Aug-2026" /><Text style={styles.label}>Payment Method</Text><Segmented options={["PhonePe", "Google Pay", "UPI", "Bank Transfer", "Cash", "Cheque", "Other"]} value={method} onChange={setMethod} /><Text style={styles.formTitle}>Interest Configuration</Text><View style={styles.frequency}>{["Daily", "Weekly", "Monthly"].map((f) => <Pressable key={f} onPress={() => setFrequency(f)} style={[styles.freqCard, frequency === f && styles.freqSelected]}><Ionicons name={f === "Daily" ? "sunny-outline" : f === "Weekly" ? "calendar-outline" : "calendar-number-outline"} size={23} color={frequency === f ? colors.cyan : colors.muted} /><Text style={[styles.freqText, frequency === f && { color: colors.cyan }]}>{f}</Text></Pressable>)}</View><Field label="Interest Rate (%)" value={rate} onChangeText={setRate} keyboardType="decimal-pad" /><Card style={styles.calcCard}><View style={styles.accentLine} /><DataRow title="Principal" amount={`₹${Number(amount || 0).toLocaleString("en-IN")}`} /><DataRow title="Interest Rate" amount={`${rate || 0}%`} /><DataRow title="Frequency" amount={frequency} /><DataRow title="Payment Method" amount={method} /><View style={styles.calcTotal}><Text style={styles.meta}>Calculated Interest</Text><Text style={styles.calcValue}>₹{calculated}</Text><Text style={styles.calcPeriod}>PER {frequency.toUpperCase().replace("LY", "")}</Text></View></Card><View style={styles.examples}>{[["Daily", "0.5%", "₹50 / Day"], ["Weekly", "3.5%", "₹350 / Week"], ["Monthly", "10%", "₹1,000 / Month"]].map((x) => <View key={x[0]} style={styles.example}><Text style={styles.rowTitle}>{x[0]}</Text><Text style={styles.meta}>₹10,000 · {x[1]}</Text><Text style={styles.exampleValue}>{x[2]}</Text></View>)}</View><Button label="Create Loan" accent="purple" onPress={submit} /></View>; }

function LoanDetail({ loan, setSheet }: { loan: LoanRecord; setSheet: (sheet: Sheet) => void }) { const [tab, setTab] = useState("Overview"); const loanPayments = payments.filter((payment) => payment.loanId === loan.id); const interest = Math.round(loan.principal * Number.parseFloat(loan.rate) / 100); return <View style={styles.formCard}><View style={styles.dueTop}><View><Text style={styles.formTitle}>{loan.id}</Text><Text style={styles.meta}>{loan.customer}</Text></View><Badge status={loan.status} /></View><Grid><KpiCard label="Principal" value={formatCurrency(loan.principal)} accent="cyan" /><KpiCard label="Interest Rate" value={loan.rate} accent="purple" /><KpiCard label="Collection Type" value={loan.frequency.replace(" Collection", "")} accent="orange" /><KpiCard label="Outstanding" value={formatCurrency(loan.outstanding)} accent="green" /></Grid><View style={styles.twoButtons}><Button label="Record Payment" style={styles.flex} onPress={() => setSheet("payment")} /><Button label="Reschedule" variant="secondary" style={styles.flex} onPress={() => setSheet("reschedule")} /></View><Segmented options={["Overview", "Interest Schedule", "Payments", "Ledger"]} value={tab} onChange={setTab} /><Card><SectionTitle>{tab}</SectionTitle>{tab === "Interest Schedule" ? <><DataRow title={loan.nextDue} subtitle={loan.rate} amount={formatCurrency(interest)} status={loan.status === "Active" ? "Due" : loan.status} /></> : tab === "Payments" ? loanPayments.length ? loanPayments.map((payment) => <DataRow key={payment.id} title={payment.id} subtitle={`${payment.date} · ${payment.method}`} amount={formatCurrency(payment.amount)} status={payment.status} />) : <Empty label="No payments recorded for this loan." /> : tab === "Ledger" ? ledger.map((entry, index) => <DataRow key={index} {...entry} />) : <><DataRow title="Principal Amount" amount={formatCurrency(loan.principal)} /><DataRow title="Outstanding Balance" amount={formatCurrency(loan.outstanding)} /><DataRow title="Interest Scheme" amount={loan.rate} /><DataRow title="Collection Type" amount={loan.frequency} /><DataRow title="Next Due" amount={loan.nextDue} status={loan.status} /></>}</Card></View>; }

function RecordPayment({ loan, onDone }: { loan: LoanRecord; onDone: () => void }) { const dueAmount = Math.round(loan.principal * Number.parseFloat(loan.rate) / 100); const [type, setType] = useState("Interest"); const [method, setMethod] = useState("UPI"); const [amount, setAmount] = useState(String(dueAmount)); const outstanding = Math.max(0, dueAmount - Number(amount || 0)); return <View style={styles.formCard}><Field label="Customer / Loan" defaultValue={`${loan.customer} · ${loan.id}`} editable={false} /><Field label="Payment Date" defaultValue="12-Aug-2026" /><Field label="Amount Received (₹)" value={amount} onChangeText={setAmount} keyboardType="number-pad" /><Text style={styles.label}>Payment Type</Text><Segmented options={["Interest", "Principal", "Principal + Interest"]} value={type} onChange={setType} /><Text style={styles.label}>Payment Method</Text><Segmented options={["Cash", "UPI", "PhonePe", "Google Pay", "Bank Transfer"]} value={method} onChange={setMethod} /><Field label="Transaction Reference" placeholder="Optional" /><Field label="Notes" placeholder="Optional notes..." multiline /><Card style={styles.summaryCard}><DataRow title="Amount Due" amount={formatCurrency(dueAmount)} /><DataRow title="Amount Received" amount={`₹${Number(amount || 0).toLocaleString("en-IN")}`} /><DataRow title="Outstanding" amount={`₹${outstanding.toLocaleString("en-IN")}`} /><DataRow title="Method" amount={method} /><View style={styles.dueTop}><Text style={styles.rowTitle}>Status</Text><Badge status={outstanding === 0 ? "Paid" : "Partially Paid"} /></View></Card><Button label="Record Payment" onPress={() => { Alert.alert("Payment recorded", `${formatCurrency(Number(amount || 0))} was recorded for ${loan.id}.`); onDone(); }} /></View>; }

function Reschedule({ setSheet }: { setSheet: (sheet: Sheet) => void }) { const [reason, setReason] = useState("Customer requested additional 5 days."); return <View style={styles.formCard}><Card><DataRow title="Original Due Date" amount="10-Sep-2026" /><DataRow title="Interest" amount="₹1,000" /></Card><Field label="New Due Date" defaultValue="15-Sep-2026" /><Field label="Reason" multiline value={reason} onChangeText={setReason} /><Card style={styles.warning}><Ionicons name="warning-outline" size={22} color={colors.orange} /><Text style={[styles.meta, styles.flex]}>Original due date will remain in payment history.</Text></Card><Button label="Reschedule & Notify Customer" accent="orange" onPress={() => reason.trim() ? setSheet("sms") : Alert.alert("Reason required")} /></View>; }
function Sms({ onDone }: { onDone: () => void }) { return <View style={styles.formCard}><IconBubble icon="chatbubble-ellipses-outline" accent="cyan" size={62} /><Card><DataRow title="Customer" amount="Ramesh Kumar" /><DataRow title="Mobile" amount="+91 XXXXX XXXXX" /></Card><View><Text style={styles.label}>Message preview</Text><Card><Text style={styles.message}>Dear Ramesh, your interest payment of ₹1,000 has been rescheduled to 15-Sep-2026.</Text></Card></View><Button label="Send SMS" icon="send-outline" onPress={() => { Alert.alert("SMS sent", "Notification simulated successfully."); onDone(); }} /></View>; }
function Empty({ label }: { label: string }) { return <View style={styles.empty}><Ionicons name="folder-open-outline" size={33} color={colors.subtle} /><Text style={styles.meta}>{label}</Text></View>; }

const styles = StyleSheet.create({
  customerLedgerItem: { minHeight: 64, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: 10, flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 }, customerLedgerItemActive: { borderColor: colors.cyan, backgroundColor: colors.cyanSoft }, ledgerEntryCard: { padding: 12, marginTop: 8 }, ledgerAmounts: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 }, ledgerDebit: { color: colors.error, fontFamily: fonts.semibold, fontSize: 11 }, ledgerCredit: { color: colors.green ?? "#16A34A", fontFamily: fonts.semibold, fontSize: 11 }, error: { color: colors.error, fontFamily: fonts.medium, fontSize: 12, lineHeight: 18 },
  app: { flex: 1, backgroundColor: colors.background }, topbar: { minHeight: 62, paddingVertical: 8, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 10 }, menuButton: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: colors.background }, topActions: { marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 14 }, notificationDot: { position: "absolute", right: 0, top: 0, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.error }, avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.cyanSoft, alignItems: "center", justifyContent: "center" }, avatarText: { color: colors.cyan, fontFamily: fonts.bold, fontSize: 11 }, body: { flex: 1 }, bottomNav: { position: "absolute", left: 0, right: 0, bottom: 0, minHeight: 70, paddingBottom: 8, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: "row", ...shadows.card }, navItem: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3 }, navText: { color: colors.subtle, fontFamily: fonts.medium, fontSize: 9 }, navTextActive: { color: colors.cyan, fontFamily: fonts.semibold },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, action: { width: "47.8%", backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: 15, flexDirection: "row", alignItems: "center", gap: 10 }, actionText: { color: colors.dark, fontFamily: fonts.semibold, fontSize: 12, flex: 1 }, overdueBanner: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.errorSoft, borderColor: "#FECACA" }, overdueLabel: { color: colors.error, fontFamily: fonts.bold, fontSize: 9, letterSpacing: 0.8 }, overdueValue: { color: colors.error, fontFamily: fonts.extrabold, fontSize: 22, marginVertical: 2 }, chart: { height: 145, flexDirection: "row", justifyContent: "space-around", alignItems: "flex-end", paddingTop: 18 }, barWrap: { alignItems: "center", justifyContent: "flex-end", gap: 6 }, barPair: { flexDirection: "row", alignItems: "flex-end", gap: 3 }, bar: { width: 13, borderRadius: 4 }, barLabel: { color: colors.subtle, fontFamily: fonts.regular, fontSize: 10 }, legend: { flexDirection: "row", justifyContent: "center", gap: 14, marginTop: 10 }, meta: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11, lineHeight: 17 }, rowTitle: { color: colors.dark, fontFamily: fonts.semibold, fontSize: 13 }, dueTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }, dueAmount: { color: colors.dark, fontFamily: fonts.extrabold, fontSize: 24, marginVertical: 14 }, twoButtons: { flexDirection: "row", gap: 9 }, paymentRecord: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 8 }, flex: { flex: 1 }, ledgerSummary: { flexDirection: "row", justifyContent: "space-between", paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.border }, summaryValue: { color: colors.dark, fontFamily: fonts.extrabold, fontSize: 18, marginTop: 4 }, notification: { flexDirection: "row", alignItems: "center", gap: 12 }, readNotification: { opacity: 0.58 }, notificationTitle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }, time: { color: colors.subtle, fontFamily: fonts.regular, fontSize: 9, marginTop: 5 }, unread: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.cyan }, contactCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.cyanSoft, borderColor: "#BAE6FD" }, reportCard: { flexDirection: "row", alignItems: "flex-start", gap: 13 }, reportActions: { flexDirection: "row", gap: 8, marginTop: 12 }, chargeCard: { gap: 15 }, chargeMonth: { color: colors.dark, fontFamily: fonts.extrabold, fontSize: 20, marginTop: 3 }, formula: { paddingVertical: 18, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center", justifyContent: "space-around" }, formulaValue: { color: colors.dark, fontFamily: fonts.extrabold, fontSize: 18 }, formulaOperator: { color: colors.muted, fontFamily: fonts.medium, fontSize: 13 }, warning: { backgroundColor: "#FFF7ED", borderColor: "#FED7AA", flexDirection: "row", alignItems: "center", gap: 11 }, formCard: { gap: 16 }, center: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 }, authTitle: { color: colors.dark, fontFamily: fonts.bold, fontSize: 21, textAlign: "center" }, authSub: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, textAlign: "center" }, label: { color: "#374151", fontFamily: fonts.medium, fontSize: 13 },
  overlay: { flex: 1, backgroundColor: "rgba(23,32,51,0.45)", justifyContent: "flex-end" }, menuSheet: { maxHeight: "92%", backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18 }, sheetHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: 14 }, menuList: { paddingVertical: 16, gap: 4 }, menuRow: { minHeight: 45, borderRadius: radii.md, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 13 }, menuRowActive: { backgroundColor: colors.cyanSoft }, menuLabel: { flex: 1, color: colors.muted, fontFamily: fonts.medium, fontSize: 13 }, menuBadge: { minWidth: 21, height: 21, borderRadius: 11, backgroundColor: colors.error, alignItems: "center", justifyContent: "center" }, menuBadgeText: { color: colors.white, fontFamily: fonts.bold, fontSize: 10 }, profileRow: { flexDirection: "row", alignItems: "center", gap: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 15 },
  flowSheet: { maxHeight: "93%", backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24 }, sheetHeader: { minHeight: 58, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18 }, sheetTitle: { color: colors.dark, fontFamily: fonts.extrabold, fontSize: 18 }, flowBody: { padding: 18, paddingBottom: 35 }, progress: { flexDirection: "row", justifyContent: "space-between", position: "relative" }, progressDot: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.background, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center" }, progressActive: { backgroundColor: colors.cyan, borderColor: colors.cyan }, progressText: { color: colors.muted, fontFamily: fonts.bold, fontSize: 12 }, formTitle: { color: colors.dark, fontFamily: fonts.extrabold, fontSize: 17 }, upload: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 11, borderWidth: 1, borderStyle: "dashed", borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: 13 }, link: { marginLeft: "auto", color: colors.cyan, fontFamily: fonts.semibold, fontSize: 12 }, profileHero: { flexDirection: "row", alignItems: "center", gap: 13 }, largeAvatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.cyanSoft, alignItems: "center", justifyContent: "center" }, largeAvatarText: { color: colors.cyan, fontFamily: fonts.extrabold, fontSize: 18 }, frequency: { flexDirection: "row", gap: 8 }, freqCard: { flex: 1, height: 82, alignItems: "center", justifyContent: "center", gap: 7, borderWidth: 2, borderColor: colors.border, borderRadius: 10 }, freqSelected: { borderColor: colors.cyan, backgroundColor: colors.cyanSoft }, freqText: { color: colors.muted, fontFamily: fonts.semibold, fontSize: 11 }, calcCard: { overflow: "hidden", paddingTop: 20 }, accentLine: { position: "absolute", left: 0, top: 0, right: 0, height: 4, backgroundColor: colors.purple }, calcTotal: { alignItems: "center", paddingTop: 17 }, calcValue: { color: colors.cyan, fontFamily: fonts.extrabold, fontSize: 30, marginTop: 5 }, calcPeriod: { color: colors.purple, fontFamily: fonts.bold, fontSize: 9, letterSpacing: 1 }, examples: { gap: 8 }, example: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: 12 }, exampleValue: { color: colors.cyan, fontFamily: fonts.bold, fontSize: 14, marginTop: 4 }, summaryCard: { backgroundColor: colors.background }, message: { color: colors.dark, fontFamily: fonts.regular, fontSize: 13, lineHeight: 21 }, empty: { minHeight: 130, alignItems: "center", justifyContent: "center", gap: 8 },
});
