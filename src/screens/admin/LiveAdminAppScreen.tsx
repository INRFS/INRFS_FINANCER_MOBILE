import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, type RouteProp } from "@react-navigation/native";
import { Ionicons } from "../../components/AppIcon";
import { Badge, Button, Card, DataRow, Field, Grid, Header, KpiCard, Screen } from "../../components/ui";
import { Logo } from "../../components/Logo";
import { useAuth } from "../../auth/AuthContext";
import { pageItems, platformApi } from "../../services/platformApi";
import { AdminCollectionsScreen } from "./AdminCollectionsScreen";
import { AdminSystemSettings } from "./AdminSystemSettings";
import { AdminServiceChargesScreen } from "./AdminServiceChargesScreen";
import { AdminNotificationsScreen } from "./AdminNotificationsScreen";
import { AdminSupportScreen } from "./AdminSupportScreen";
import { AdminReportsScreen } from "./AdminReportsScreen";
import { AdminSmsUsagePanel, AdminSubscriptionsPanel } from "./AdminPlatformManagementScreen";
import { AdminMonthlyBillingParity } from "./AdminMonthlyBillingParity";
import { AdminFinancerDetailsParity } from "./AdminFinancerDetailsParity";
import { colors, fonts, radii } from "../../theme/tokens";
import type { RootStackParamList } from "../../types/navigation";
import { localDateOnly } from "../../utils/date";
import { formatInr } from "../../utils/format";

type Page = "Dashboard" | "Financers" | "Billing" | "Collections" | "More";
type MorePage = "Service Charges" | "Subscriptions" | "SMS Usage" | "Reports" | "Notifications" | "Settings" | "Support";
type Action = "assign" | "promise" | "followup" | "call" | "payment" | null;
const money = formatInr;
const today = () => localDateOnly();

export function LiveAdminAppScreen() {
  const { logout, user, hasRole } = useAuth();
  const route = useRoute<RouteProp<RootStackParamList, "AdminApp">>();
  const section = route.params?.section?.toLowerCase();
  const canManageFinancers = hasRole("SuperAdmin", "Admin");
  const canManageBilling = hasRole("SuperAdmin", "Admin", "FinanceOfficer", "CollectionAgent");
  const sectionTarget = useMemo<{ page: Page; more?: MorePage; usage?: boolean }>(() => {
    if (section === "financers") return { page: "Financers" };
    if (section === "financer-usage") return { page: "Financers", usage: true };
    if (section === "monthly-billing" && canManageBilling) return { page: "Billing" };
    if (section === "collections" && canManageBilling) return { page: "Collections" };
    const more: Record<string, MorePage> = { "service-charges": "Service Charges", reports: "Reports", notifications: "Notifications", settings: "Settings", support: "Support" };
    return more[section ?? ""] ? { page: "More", more: more[section ?? ""] } : { page: "Dashboard" };
  }, [canManageBilling, section]);
  const [page, setPage] = useState<Page>(sectionTarget.page);
  const [moreSection, setMoreSection] = useState<MorePage>(sectionTarget.more ?? "Reports");
  useEffect(() => { setPage(sectionTarget.page); if (sectionTarget.more) setMoreSection(sectionTarget.more); }, [sectionTarget]);
  const pages: Page[] = ["Dashboard", "Financers", ...(canManageBilling ? ["Billing", "Collections"] as Page[] : []), "More"];
  return <View style={styles.app}><SafeAreaView edges={["top"]} style={styles.top}><Logo size={34}/><Text style={styles.portal}>ADMIN</Text><Text style={styles.user}>{user?.fullName ?? user?.email}</Text><Pressable onPress={() => void logout()}><Ionicons name="log-out-outline" size={23} color={colors.muted}/></Pressable></SafeAreaView><View style={styles.body}>{page === "Dashboard" ? <Dashboard go={setPage} canManageBilling={canManageBilling}/> : page === "Financers" ? <Financers canManage={canManageFinancers} initialFinancerId={route.params?.financerId} initialUsage={sectionTarget.usage}/> : page === "Billing" && canManageBilling ? <Billing/> : page === "Collections" && canManageBilling ? <AdminCollectionsScreen/> : <AdminMore initialSection={moreSection}/>}</View><View style={styles.nav}>{pages.map((item) => <Pressable key={item} style={styles.navItem} onPress={() => setPage(item)}><Ionicons name={item === "Dashboard" ? "grid-outline" : item === "Financers" ? "people-outline" : item === "Billing" ? "receipt-outline" : item === "Collections" ? "call-outline" : "menu"} size={20} color={page === item ? colors.purple : colors.subtle}/><Text style={[styles.navText, page === item && styles.active]}>{item}</Text></Pressable>)}</View></View>;
}

function AdminMore({ initialSection }: { initialSection?: MorePage }) {
  const { hasRole } = useAuth();
  const allowed: MorePage[] = ["Reports"];
  // Subscriptions and SMS Usage are intentionally hidden until those modules are enabled.
  if (hasRole("SuperAdmin", "Admin")) allowed.unshift("Service Charges");
  if (hasRole("SuperAdmin", "Admin")) allowed.push("Notifications", "Settings");
  if (hasRole("SuperAdmin", "Admin", "SupportAgent")) allowed.push("Support");
  const labels = Array.from(new Set(allowed));
  const authorizedInitial = initialSection && labels.includes(initialSection) ? initialSection : labels[0] ?? "Reports";
  const [section, setSection] = useState<MorePage>(authorizedInitial);
  useEffect(() => { setSection(authorizedInitial); }, [authorizedInitial]);
  return <Screen><Header title={section} subtitle="Role-authorized administration workflow"/><View style={styles.gap}><View><Text style={styles.muted}>Available for your assigned web portal roles</Text></View></View>{labels.length > 1 ? <View style={styles.gap}><ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={styles.row}>{labels.map(label => <Button key={label} label={label} variant={section === label ? "primary" : "secondary"} accent="purple" onPress={() => setSection(label)}/>)}</View></ScrollView></View> : null}{section === "Service Charges" ? <ServiceCharges/> : section === "Subscriptions" ? <AdminSubscriptionsPanel/> : section === "SMS Usage" ? <AdminSmsUsagePanel/> : section === "Notifications" ? <AdminNotifications/> : section === "Settings" ? <AdminSettings/> : section === "Support" ? <AdminSupport/> : <AdminReports/>}</Screen>;
}

function AdminReports() { return <AdminReportsScreen/>; }
function ServiceCharges() { return <AdminServiceChargesScreen/>; }
function AdminNotifications() { return <AdminNotificationsScreen/>; }
function AdminSettings() { return <AdminSystemSettings/>; }
function AdminSupport() { return <AdminSupportScreen/>; }

function useLoad<T>(loader: () => Promise<T>, initial: T) {
  const [data, setData] = useState(initial); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const load = useCallback(async () => { setLoading(true); setError(""); try { setData(await loader()); } catch (reason) { setError(reason instanceof Error ? reason.message : "Request failed"); } finally { setLoading(false); } }, [loader]);
  useEffect(() => { void load(); }, [load]); return { data, loading, error, load };
}
function State({ loading, error, retry }: { loading: boolean; error: string; retry: () => void }) { if (loading) return <Card><Text style={styles.muted}>Loading…</Text></Card>; if (error) return <Card><Text style={styles.error}>{error}</Text><Button label="Retry" variant="secondary" onPress={retry}/></Card>; return null; }

function Dashboard({ go, canManageBilling }: { go: (page: Page) => void; canManageBilling: boolean }) {
  const [usageSearch,setUsageSearch]=useState(""); const [usageStatus,setUsageStatus]=useState("All"); const [chargeStatus,setChargeStatus]=useState("All");
  const loader = useCallback(async () => {
    const [dashboard, financerPayload, billingPayload] = await Promise.all([platformApi.dashboard.admin(), platformApi.admin.allFinancers(), platformApi.admin.billing({ pageSize: 100 })]);
    const financers = pageItems(financerPayload); const month = new Date().toISOString().slice(0, 7);
    const invoices = pageItems(billingPayload).filter((item:any)=>String(item.periodStart??"").startsWith(month));
    const invoiceByFinancer=new Map(invoices.map((item:any)=>[item.financerId,item]));
    const usage=await Promise.all(financers.map(async(financer:any)=>{const detail=await platformApi.admin.financerUsage(financer.id);return {financerId:financer.id,financerNumber:financer.financerNumber,financerName:financer.displayName,status:financer.status,registrationDate:financer.createdAt,lastLogin:financer.lastLoginAt,customerCount:Number(detail.totalCustomers??0),loanCount:Number(detail.activeLoans??0)+Number(detail.overdueLoans??0),transactionCount:detail.upcomingPayments?.length??0,smsActivity:0,principalAmount:Number(detail.totalPrincipal??0),serviceChargeStatus:invoiceByFinancer.get(financer.id)?.status??"Not Generated"};}));
    const billing = invoices.reduce((sum:any,item:any)=>{const charge=Number(item.chargeAmount??0);const collected=Number(item.collectedAmount??0);const outstanding=Math.max(0,charge-collected);sum.interest+=Number(item.interestActivity??0);sum.generated+=charge;sum.collected+=collected;if(item.status==="Overdue")sum.overdue+=outstanding;else sum.pending+=outstanding;return sum;},{interest:0,generated:0,collected:0,pending:0,overdue:0});
    return { dashboard, totalFinancers: financers.length || dashboard.totalFinancers || 0, activeFinancers: financers.filter((item:any)=>item.status==="Active").length, inactiveFinancers: financers.filter((item:any)=>item.status!=="Active").length, billing, usage };
  }, []); const state = useLoad(loader, { dashboard: {}, totalFinancers: 0, activeFinancers: 0, inactiveFinancers: 0, billing: { interest:0,generated:0,collected:0,pending:0,overdue:0 }, usage:[] } as any); const d = state.data.dashboard; const billing=state.data.billing;
  const filteredUsage=state.data.usage.filter((item:any)=>{const term=usageSearch.trim().toLowerCase();return(!term||`${item.financerName} ${item.financerNumber??""} ${item.financerId}`.toLowerCase().includes(term))&&(usageStatus==="All"||item.status===usageStatus)&&(chargeStatus==="All"||item.serviceChargeStatus===chargeStatus);});
  const activity=(item:any)=>Math.min(100,Math.round(Math.min(item.customerCount/5,25)+Math.min(item.loanCount/4,25)+Math.min(item.transactionCount/30,25)+Math.min(item.smsActivity/500,25)));
  return <Screen><Header title="INRFS Admin" subtitle="Live platform overview"/><State {...state} retry={() => void state.load()}/><Grid><KpiCard label="Total Financers" value={String(state.data.totalFinancers)} accent="cyan"/><KpiCard label="Active Financers" value={String(state.data.activeFinancers)} accent="green"/><KpiCard label="Inactive Financers" value={String(state.data.inactiveFinancers)} accent="orange"/><KpiCard label="Total Customers" value={String(d.totalCustomers ?? 0)} accent="purple"/><KpiCard label="Total Loans" value={String(Number(d.activeLoans??0)+Number(d.overdueLoans??0))} accent="orange"/><KpiCard label="Total Principal" value={money(d.totalPrincipal)} accent="cyan"/><KpiCard label="Interest Activity" value={money(d.collections??d.interestCollected??d.totalInterestCollected)} accent="purple"/><KpiCard label="Monthly Service Charges" value={money(billing.generated)} accent="green"/></Grid><Card><Text style={styles.title}>Monthly Service Charge Overview</Text><DataRow title="This month's interest" amount={money(billing.interest)}/><DataRow title="Charges generated" amount={money(billing.generated)}/><DataRow title="Collected" amount={money(billing.collected)} status="Paid"/><DataRow title="Pending" amount={money(billing.pending)} status="Pending"/><DataRow title="Overdue" amount={money(billing.overdue)} status="Overdue"/></Card><Card><Text style={styles.title}>Collection mix</Text><DataRow title="Collected" amount={money(billing.collected)} status="Paid"/><DataRow title="Pending" amount={money(billing.pending)} status="Pending"/><DataRow title="Overdue" amount={money(billing.overdue)} status="Overdue"/>{(d.monthlyCollections??[]).map((item:any,index:number)=><DataRow key={`${item.month}-${index}`} title={item.month} amount={money(item.amount)}/>)}</Card><Card><Text style={styles.title}>Financer Usage Monitoring</Text><Text style={styles.muted}>Customer, loan, transaction and SMS activity for each financer.</Text><Field label="Search financer" value={usageSearch} onChangeText={setUsageSearch}/><Text style={styles.muted}>Financer status</Text><ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={styles.row}>{["All","Active","Inactive","Suspended"].map(value=><Button key={value} label={value} variant={usageStatus===value?"primary":"secondary"} accent="purple" onPress={()=>setUsageStatus(value)}/>)}</View></ScrollView><Text style={styles.muted}>Service charge status</Text><ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={styles.row}>{["All","Paid","Pending","Overdue","Partially Paid","Not Generated"].map(value=><Button key={value} label={value} variant={chargeStatus===value?"primary":"secondary"} accent="purple" onPress={()=>setChargeStatus(value)}/>)}</View></ScrollView><Text style={styles.muted}>{filteredUsage.length} financer records</Text>{filteredUsage.map((item:any)=><Card key={item.financerId}><DataRow title={item.financerName} subtitle={item.financerNumber??item.financerId} status={item.status}/><DataRow title="Customers" amount={String(item.customerCount)}/><DataRow title="Loans" amount={String(item.loanCount)}/><DataRow title="Transactions" amount={String(item.transactionCount)}/><DataRow title="SMS activity" amount={String(item.smsActivity)}/><DataRow title="Activity" amount={`${activity(item)}%`}/><DataRow title="Service charge" amount={item.serviceChargeStatus}/><DataRow title="Registration" amount={item.registrationDate?new Date(item.registrationDate).toLocaleDateString("en-IN"):"—"}/><DataRow title="Last login" amount={item.lastLogin?new Date(item.lastLogin).toLocaleString("en-IN"):"—"}/></Card>)}</Card>{canManageBilling ? <View style={styles.row}><Button label="Monthly Billing" accent="purple" style={styles.flex} onPress={() => go("Billing")}/><Button label="Collections" variant="secondary" style={styles.flex} onPress={() => go("Collections")}/></View> : <Button label="View Reports" variant="secondary" onPress={() => go("More")}/>}</Screen>;
}

function Financers({ canManage, initialFinancerId, initialUsage }: { canManage: boolean; initialFinancerId?: string; initialUsage?: boolean }) {
  const loader = useCallback(() => platformApi.admin.allFinancers(), []); const state = useLoad(loader, { items: [] } as any); const [search, setSearch] = useState(""); const [selectedDetails, setSelectedDetails] = useState<any>(null); const [hubTab, setHubTab] = useState(initialUsage ? "Usage Analytics" : "Financers"); const [deepLinkHandled, setDeepLinkHandled] = useState(false);
  const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false); const [name, setName] = useState(""); const [owner, setOwner] = useState(""); const [email, setEmail] = useState(""); const [phone, setPhone] = useState(""); const [address, setAddress] = useState(""); const [city, setCity] = useState(""); const [region, setRegion] = useState(""); const [postalCode, setPostalCode] = useState(""); const [rate, setRate] = useState("");
  const rows = pageItems(state.data).filter((x: any) => `${x.displayName}${x.legalName}${x.ownerName}${x.email}`.toLowerCase().includes(search.toLowerCase()));
  useEffect(() => {
    if (!initialFinancerId || deepLinkHandled || state.loading) return;
    const match = pageItems(state.data).find((item: any) => String(item.id) === initialFinancerId || String(item.financerNumber) === initialFinancerId);
    if (match) setSelectedDetails(match);
    setDeepLinkHandled(true);
  }, [deepLinkHandled, initialFinancerId, state.data, state.loading]);
  const change = (item: any, status: string) => {
    const isDeactivation = status === "Inactive";
    const financerName = item.displayName ?? item.legalName ?? "this financer";
    Alert.alert(
      isDeactivation ? "Deactivate financer?" : "Activate financer?",
      isDeactivation
        ? `${financerName} will lose access until the account is activated again.`
        : `${financerName} will regain access to the platform.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: isDeactivation ? "Deactivate" : "Activate",
          style: isDeactivation ? "destructive" : "default",
          onPress: () => {
            void (async () => {
              try {
                await platformApi.admin.changeFinancerStatus(item.id, {
                  status,
                  reason: `Status changed to ${status} from mobile administration`,
                });
                await state.load();
              } catch (reason) {
                Alert.alert("Unable to update", reason instanceof Error ? reason.message : "Try again");
              }
            })();
          },
        },
      ],
    );
  };
  const resetForm = () => { setName(""); setOwner(""); setEmail(""); setPhone(""); setAddress(""); setCity(""); setRegion(""); setPostalCode(""); setRate(""); };
  const create = async () => {
    const legalName = name.trim(); const ownerName = owner.trim(); const normalizedEmail = email.trim().toLowerCase();
    const mobile = phone.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, ""); const charge = Number(rate);
    if (!legalName || !ownerName || !normalizedEmail || !mobile || !address.trim() || !city.trim() || !region.trim() || !postalCode.trim() || !rate.trim()) return Alert.alert("Required fields", "Complete all financer details.");
    if (legalName.length < 2 || legalName.length > 200) return Alert.alert("Invalid business name", "Business name must contain 2 to 200 characters.");
    if (!/^[A-Za-z][A-Za-z .'-]{1,99}$/.test(ownerName)) return Alert.alert("Invalid owner name", "Owner name must contain 2 to 100 letters.");
    if (normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizedEmail)) return Alert.alert("Invalid email address");
    if (!/^[6-9]\d{9}$/.test(mobile)) return Alert.alert("Invalid mobile number", "Enter a valid 10-digit Indian mobile number.");
    if (address.trim().length < 5 || address.trim().length > 250) return Alert.alert("Invalid address", "Address must contain 5 to 250 characters.");
    if (!/^[A-Za-z][A-Za-z .'-]{1,99}$/.test(city.trim()) || !/^[A-Za-z][A-Za-z .'-]{1,99}$/.test(region.trim())) return Alert.alert("Invalid location", "City and state must contain 2 to 100 letters.");
    if (!/^[1-9]\d{5}$/.test(postalCode.trim())) return Alert.alert("Invalid postal code", "Enter a valid 6-digit Indian PIN code.");
    if (!Number.isFinite(charge) || charge < 0 || charge > 100) return Alert.alert("Invalid service charge", "Service charge must be between 0 and 100 percent.");
    setBusy(true); try { await platformApi.admin.createFinancer({ legalName, displayName: legalName, ownerName, email: normalizedEmail, phone: mobile, addressLine: address.trim(), city: city.trim(), state: region.trim(), postalCode: postalCode.trim(), taxNumber: null, registrationNumber: null, serviceChargePercentage: charge }); setOpen(false); resetForm(); await state.load(); } catch (e) { Alert.alert("Financer not created", e instanceof Error ? e.message : "Try again"); } finally { setBusy(false); }
  };
  if (hubTab === "Usage Analytics") return <Screen><Header title="Financer Usage Analytics" action={<Button label="Financers" variant="ghost" onPress={() => setHubTab("Financers")}/>}/><FinancerUsageAnalytics/></Screen>;
  if (selectedDetails) return <AdminFinancerDetailsParity item={selectedDetails} close={() => setSelectedDetails(null)}/>;
  return <Screen><Header title="Financers" subtitle="Accounts and platform access" action={<Button label="Usage" variant="secondary" accent="purple" onPress={() => setHubTab("Usage Analytics")}/>}/><Field label="Search" value={search} onChangeText={setSearch} placeholder="Business, owner or email"/><State {...state} retry={() => void state.load()}/>{rows.map((item: any) => <Card key={item.id}><DataRow title={item.displayName ?? item.legalName} subtitle={`${item.ownerName ?? ""} · ${item.email ?? ""}`} status={item.status}/><View style={{ flexDirection: "row", gap: 10, width: "100%" }}><Button style={styles.flex} label="View Details" accent="purple" variant="secondary" onPress={() => setSelectedDetails(item)}/>{canManage ? <Button style={styles.flex} label={item.status === "Active" ? "Deactivate" : "Activate"} variant={item.status === "Active" ? "danger" : "secondary"} onPress={() => void change(item, item.status === "Active" ? "Inactive" : "Active")}/> : null}</View></Card>)}<AdminSheet visible={canManage && open} title="Add financer" close={() => { setOpen(false); resetForm(); }}><Field label="Business / legal name *" value={name} onChangeText={setName} maxLength={200}/><Field label="Owner name *" value={owner} onChangeText={setOwner} maxLength={100}/><Field label="Email *" value={email} onChangeText={v=>setEmail(v.replace(/\s/g,""))} keyboardType="email-address" autoCapitalize="none" maxLength={254}/><Field label="Phone *" value={phone} onChangeText={v=>setPhone(v.replace(/\D/g,""))} keyboardType="phone-pad" maxLength={10}/><Field label="Address *" value={address} onChangeText={setAddress} maxLength={250}/><Field label="City *" value={city} onChangeText={setCity} maxLength={100}/><Field label="State *" value={region} onChangeText={setRegion} maxLength={100}/><Field label="Postal code *" value={postalCode} onChangeText={v=>setPostalCode(v.replace(/\D/g,""))} keyboardType="number-pad" maxLength={6}/><Field label="Service charge (%) *" value={rate} onChangeText={v=>setRate(v.replace(/[^\d.]/g,""))} keyboardType="decimal-pad" maxLength={6}/><Button loading={busy} label="Create financer" accent="purple" onPress={() => void create()}/></AdminSheet></Screen>;
}

// Retained temporarily as a reference while the field-specific parity panel is active.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function LegacyInlineFinancerDetails({ item, close }: { item: any; close: () => void }) {
  const loader = useCallback(async () => {
    const [customers, loans, transactions, usage] = await Promise.all([
      platformApi.customers.all({ financerId: item.id }),
      platformApi.loans.all({ financerId: item.id }),
      platformApi.payments.transactions({ financerId: item.id, pageSize: 200 }),
      platformApi.dashboard.admin({ financerId: item.id }),
    ]);
    return { customers: pageItems(customers), loans: pageItems(loans), transactions: pageItems(transactions), usage };
  }, [item.id]);
  const state = useLoad(loader, { customers: [], loans: [], transactions: [], usage: {} } as any);
  const [tab, setTab] = useState("Overview"); const [search, setSearch] = useState("");
  const rows = tab === "Customers" ? state.data.customers : tab === "Loans" ? state.data.loans : state.data.transactions;
  const filtered = rows.filter((row: any) => !search || JSON.stringify(row).toLowerCase().includes(search.toLowerCase()));
  return <Screen><Header title={item.displayName ?? item.legalName} subtitle={item.financerNumber ?? item.id} action={<Button label="Back" variant="ghost" onPress={close}/>}/><State {...state} retry={() => void state.load()}/><ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={styles.row}>{["Overview","Customers","Loans","Transactions","Service Charge"].map(value => <Button key={value} label={value} accent="purple" variant={tab === value ? "primary" : "secondary"} onPress={() => setTab(value)}/>)}</View></ScrollView>{tab === "Overview" ? <><Grid><KpiCard label="Customers" value={String(state.data.usage.totalCustomers ?? state.data.customers.length)} accent="cyan"/><KpiCard label="Active Loans" value={String(state.data.usage.activeLoans ?? state.data.loans.filter((loan:any)=>loan.status==="Active").length)} accent="purple"/><KpiCard label="Total Principal" value={money(state.data.usage.totalPrincipal)} accent="orange"/><KpiCard label="Interest Outstanding" value={money(state.data.usage.interestOutstanding)} accent="green"/></Grid><Card>{Object.entries(item).filter(([,value])=>typeof value!=="object").map(([key,value])=><DataRow key={key} title={key.replace(/([A-Z])/g," $1")} amount={String(value ?? "")}/>)}</Card></> : tab === "Service Charge" ? <Card><DataRow title="Platform fee" amount={`${Number(item.serviceChargePercentage ?? 1)}% of interest`}/><DataRow title="Interest collected" amount={money(state.data.usage.collections ?? state.data.usage.totalInterestCollected)}/><DataRow title="Service charges" amount={money(state.data.usage.serviceCharges ?? state.data.usage.totalServiceCharges)}/></Card> : <><Field label={`Search ${tab.toLowerCase()}`} value={search} onChangeText={setSearch}/>{filtered.map((row:any,index:number)=><Card key={row.id??index}>{Object.entries(row).filter(([,value])=>typeof value!=="object").slice(0,12).map(([key,value])=><DataRow key={key} title={key.replace(/([A-Z])/g," $1")} amount={String(value ?? "")}/>)}</Card>)}</>}</Screen>;
}

function FinancerUsageAnalytics() {
  const loader = useCallback(async () => {
    try {
      const payload = await platformApi.admin.billingUsage();
      return Array.isArray(payload) ? payload : pageItems(payload);
    } catch (error: any) {
      if (error?.status !== 404) throw error;
      const [financerPayload, invoicePayload, paymentPayload] = await Promise.all([platformApi.admin.allFinancers(), platformApi.admin.allInvoices(), platformApi.payments.all()]);
      const financers = pageItems(financerPayload); const invoices = pageItems(invoicePayload); const payments = pageItems(paymentPayload);
      const same = (a: unknown,b: unknown) => String(a??"").toLowerCase() === String(b??"").toLowerCase();
      return financers.map((financer:any) => { const related = invoices.filter((invoice:any)=>same(invoice.financerId,financer.id)); const generated=related.reduce((sum:number,x:any)=>sum+Number(x.chargeAmount??0),0); const collected=related.reduce((sum:number,x:any)=>sum+Number(x.collectedAmount??0),0); return { financerId:financer.id,financerNumber:financer.financerNumber,financerName:financer.displayName,status:financer.status,interestCollected:payments.filter((payment:any)=>same(payment.financerId,financer.id)&&[1,"completed","success"].includes(typeof payment.status==="string"?payment.status.toLowerCase():payment.status)).reduce((sum:number,x:any)=>sum+Number(x.interestAmount??0),0),feeGenerated:generated,feeCollected:collected,outstanding:Math.max(0,generated-collected),overdue:related.filter((x:any)=>x.status==="Overdue").reduce((sum:number,x:any)=>sum+Math.max(0,Number(x.chargeAmount??0)-Number(x.collectedAmount??0)),0)}; });
    }
  }, []);
  const state = useLoad(loader, [] as any[]); const [search,setSearch]=useState(""); const [details,setDetails]=useState<any>(null); const [detailLoading,setDetailLoading]=useState(false);
  const rows = state.data.map((item:any)=>({ id:item.financerId,displayId:item.financerNumber??item.financerId,name:item.financerName,status:item.status,interest:Number(item.interestCollected??0),generated:Number(item.feeGenerated??0),collected:Number(item.feeCollected??0),outstanding:Number(item.outstanding??0),overdue:Number(item.overdue??0) })).filter((row:any)=>`${row.name} ${row.displayId}`.toLowerCase().includes(search.toLowerCase()));
  const totals=rows.reduce((sum:any,row:any)=>({interest:sum.interest+row.interest,generated:sum.generated+row.generated,collected:sum.collected+row.collected,outstanding:sum.outstanding+row.outstanding}),{interest:0,generated:0,collected:0,outstanding:0});
  const open=async(row:any)=>{setDetailLoading(true);try{const payload=await platformApi.payments.all({financerId:row.id,pageSize:100});setDetails({row,payments:pageItems(payload).filter((payment:any)=>[1,"completed","success"].includes(typeof payment.status==="string"?payment.status.toLowerCase():payment.status))});}catch(e){Alert.alert("Payments unavailable",e instanceof Error?e.message:"Try again");}finally{setDetailLoading(false);}};
  return <View style={styles.gap}><Field label="Search financer" value={search} onChangeText={setSearch}/><State {...state} retry={() => void state.load()}/><Grid><KpiCard label="Interest Collected" value={money(totals.interest)} accent="cyan"/><KpiCard label="Platform Fee Generated" value={money(totals.generated)} accent="purple"/><KpiCard label="Platform Fee Collected" value={money(totals.collected)} accent="green"/><KpiCard label="Outstanding Fees" value={money(totals.outstanding)} accent="orange"/></Grid>{rows.map((row:any)=><Card key={row.id}><DataRow title={row.name} subtitle={row.displayId} amount={money(row.interest)} status={row.status}/><DataRow title="Fee generated" amount={money(row.generated)}/><DataRow title="Fee collected" amount={money(row.collected)}/><DataRow title="Outstanding" amount={money(row.outstanding)}/><DataRow title="Overdue" amount={money(row.overdue)}/><Button loading={detailLoading} label="Underlying Payments" variant="secondary" accent="purple" onPress={()=>void open(row)}/></Card>)}<AdminSheet visible={details!==null} title={`${details?.row?.name??"Financer"}: underlying payments`} close={()=>setDetails(null)}>{details?.payments?.map((payment:any)=><Card key={payment.id}><DataRow title={payment.paymentNumber??payment.id} subtitle={String(payment.receivedAt??"").slice(0,10)} amount={money(payment.amount)}/><DataRow title="Principal" amount={money(payment.principalAmount)}/><DataRow title="Interest" amount={money(payment.interestAmount)}/><DataRow title="Fees" amount={money(payment.feeAmount)}/></Card>)}</AdminSheet></View>;
}

function Billing() { return <AdminMonthlyBillingParity/>; }

// Retained only as reference while the grouped parity implementation above is active.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function LegacyBilling() {
  const loader = useCallback(() => platformApi.admin.allBilling(), []); const state = useLoad(loader, { items: [] } as any); const rows = pageItems(state.data);
  const [selected, setSelected] = useState<any>(null); const [action, setAction] = useState<"collect" | "credit" | null>(null); const [amount, setAmount] = useState(""); const [reference, setReference] = useState(""); const [reason, setReason] = useState(""); const [busy, setBusy] = useState(false);
  const totals = useMemo(() => rows.reduce((a: any, x: any) => ({ interest: a.interest + Number(x.applicableInterest ?? x.interestCollected ?? 0), charge: a.charge + Number(x.chargeAmount ?? x.inrfsCharge ?? 0), collected: a.collected + Number(x.collectedAmount ?? 0), outstanding: a.outstanding + Number(x.outstandingAmount ?? 0) }), { interest: 0, charge: 0, collected: 0, outstanding: 0 }), [rows]);
  const generate = async () => { setBusy(true); try { const financers = pageItems(await platformApi.admin.allFinancers()).filter((x: any) => x.status === "Active"); const now = new Date(); const periodStart = localDateOnly(new Date(now.getFullYear(), now.getMonth(), 1)); const periodEnd = localDateOnly(new Date(now.getFullYear(), now.getMonth() + 1, 0)); const results = await Promise.allSettled(financers.map((x: any) => platformApi.admin.generateInvoice({ financerId: x.id, periodStart, periodEnd }))); const failed = results.filter(x => x.status === "rejected").length; Alert.alert("Invoice generation complete", `${results.length - failed} generated or refreshed${failed ? ` · ${failed} failed` : ""}.`); await state.load(); } catch (e) { Alert.alert("Invoices not generated", e instanceof Error ? e.message : "Try again"); } finally { setBusy(false); } };
  const submit = async () => { if (!selected || !action || Number(amount) <= 0) return; setBusy(true); try { if (action === "collect") await platformApi.admin.collectInvoice(selected.id, { amount: Number(amount), reference: reference.trim() }); else await platformApi.admin.creditInvoice(selected.id, { creditAmount: Number(amount), reason: reason.trim() }); setAction(null); setSelected(null); await state.load(); } catch (e) { Alert.alert("Billing action failed", e instanceof Error ? e.message : "Try again"); } finally { setBusy(false); } };
  const openAction = (item: any, next: "collect" | "credit") => { setSelected(item); setAction(next); setAmount(String(item.outstandingAmount ?? item.chargeAmount ?? "")); setReference(""); setReason(""); };
  return <Screen><Header title="Monthly Billing" subtitle="Same billing cycles and settlement status as web" action={<Button loading={busy} label="Generate" accent="purple" onPress={() => void generate()}/>}/><State {...state} retry={() => void state.load()}/><Grid><KpiCard label="Applicable Interest" value={money(totals.interest)} accent="cyan"/><KpiCard label="INRFS Charge" value={money(totals.charge)} accent="purple"/><KpiCard label="Collected" value={money(totals.collected)} accent="green"/><KpiCard label="Outstanding" value={money(totals.outstanding)} accent="yellow"/></Grid>{rows.map((item: any) => <Card key={item.id}><View style={styles.between}><View style={styles.flex}><Text style={styles.title}>{item.financerName}</Text><Text style={styles.muted}>{item.billingMonth ?? `${item.cycleStart} – ${item.cycleEnd}`} · {item.serviceChargePercentage}%</Text></View><Badge status={item.settlementStatus ?? item.status}/></View><DataRow title="Applicable interest" amount={money(item.applicableInterest ?? item.interestCollected)}/><DataRow title="INRFS charge" amount={money(item.chargeAmount ?? item.inrfsCharge)}/><DataRow title="Collected" amount={money(item.collectedAmount)}/><DataRow title="Outstanding" amount={money(item.outstandingAmount)}/>{Number(item.outstandingAmount ?? 0) > 0 ? <View style={styles.row}><Button style={styles.flex} label="Collect" accent="purple" onPress={() => openAction(item, "collect")}/><Button style={styles.flex} label="Credit note" variant="secondary" onPress={() => openAction(item, "credit")}/></View> : null}</Card>)}<AdminSheet visible={action !== null} title={action === "collect" ? "Record collection" : "Issue credit note"} close={() => setAction(null)}><Field label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad"/>{action === "collect" ? <Field label="Payment reference" value={reference} onChangeText={setReference}/> : <Field label="Reason" value={reason} onChangeText={setReason} multiline/>}<Button loading={busy} label="Confirm" accent="purple" onPress={() => void submit()}/></AdminSheet></Screen>;
}

// Kept temporarily while the dedicated parity screen replaces this legacy implementation.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function Collections() {
  const loader = useCallback(() => platformApi.collections.list({ pageSize: 100 }), []); const state = useLoad(loader, { items: [] } as any); const [selected, setSelected] = useState<any>(null); const [action, setAction] = useState<Action>(null); const [date, setDate] = useState(today()); const [notes, setNotes] = useState(""); const [amount, setAmount] = useState("");
  const rows = pageItems(state.data); const open = (item: any, next: Action) => { setSelected(item); setAction(next); setDate(today()); setNotes(""); setAmount(String(item.actionableDue ?? item.due ?? "")); };
  const submit = async () => { if (!selected || !action) return; try { if (action === "payment") await platformApi.payments.record({ loanId: selected.id, paymentScheduleId: selected.paymentScheduleId, amount: Number(amount), receivedAt: new Date(`${date}T12:00:00`).toISOString(), mode: "Cash", externalReference: null, notes: notes || "Recorded by mobile collection operations" }); else await platformApi.collections.action(selected.id, { type: action === "promise" ? "PromiseToPay" : action === "followup" ? "FollowUpScheduled" : "CallCompleted", notes: notes || (action === "call" ? "Customer contacted" : "Scheduled from mobile"), promiseToPayDate: action === "promise" ? date : null, nextFollowUpDate: action === "followup" ? date : null, status: action === "promise" ? "PromiseToPay" : "Contacted" }); setAction(null); setSelected(null); await state.load(); } catch (reason) { Alert.alert("Action not saved", reason instanceof Error ? reason.message : "Try again"); } };
  const remind = async (item: any) => { try { await platformApi.collections.remind(item.id, { type: "PaymentReminder", notes: "Reminder queued from mobile collection operations" }); await state.load(); } catch (reason) { Alert.alert("Reminder not sent", reason instanceof Error ? reason.message : "Try again"); } };
  return <Screen><Header title="Collections" subtitle="Calls, promises, follow-ups and customer payments" action={<Button label="Refresh" variant="ghost" onPress={() => void state.load()}/>}/><State {...state} retry={() => void state.load()}/>{rows.map((item: any) => <Card key={item.id}><View style={styles.between}><View style={styles.flex}><Text style={styles.title}>{item.customer}</Text><Text style={styles.muted}>{item.financerName} · {item.loanNumber} · Due {String(item.dueDate).slice(0, 10)}</Text></View><Badge status={item.status ?? (item.daysPastDue > 0 ? "Overdue" : "Upcoming")}/></View><DataRow title="Outstanding" amount={money(item.due)}/>{item.latestActionType ? <Text style={styles.muted}>Latest: {item.latestActionType} · {item.latestActionNotes}</Text> : null}{item.promiseToPayDate ? <Text style={styles.muted}>Promise: {String(item.promiseToPayDate).slice(0, 10)}</Text> : null}<View style={styles.actions}><Button label="Promise" variant="secondary" onPress={() => open(item, "promise")}/><Button label="Follow-up" variant="secondary" onPress={() => open(item, "followup")}/><Button label="Call" variant="secondary" onPress={() => open(item, "call")}/><Button label="Payment" onPress={() => open(item, "payment")}/><Button label="Reminder" variant="ghost" onPress={() => void remind(item)}/></View></Card>)}<Modal visible={action !== null} transparent animationType="slide" onRequestClose={() => setAction(null)}><View style={styles.overlay}><SafeAreaView style={styles.sheet} edges={["bottom"]}><ScrollView contentContainerStyle={styles.form}><View style={styles.between}><Text style={styles.sheetTitle}>{action === "payment" ? "Record payment" : action === "call" ? "Record call outcome" : action === "promise" ? "Promise to pay" : "Schedule follow-up"}</Text><Pressable onPress={() => setAction(null)}><Ionicons name="close" size={24}/></Pressable></View>{action !== "call" ? <Field label={action === "payment" ? "Payment date" : "Date"} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD"/> : null}{action === "payment" ? <Field label="Amount received" value={amount} onChangeText={setAmount} keyboardType="decimal-pad"/> : null}<Field label={action === "call" ? "Customer response and call description" : "Notes"} value={notes} onChangeText={setNotes} multiline/><Button label="Save action" accent="purple" onPress={() => void submit()}/></ScrollView></SafeAreaView></View></Modal></Screen>;
}

function AdminSheet({ visible, title, close, children }: { visible: boolean; title: string; close: () => void; children: React.ReactNode }) {
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={close}><View style={styles.overlay}><SafeAreaView style={styles.sheet} edges={["bottom"]}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}><View style={styles.between}><Text style={styles.sheetTitle}>{title}</Text><Pressable onPress={close}><Ionicons name="close" size={24}/></Pressable></View>{children}</ScrollView></SafeAreaView></View></Modal>;
}

const styles = StyleSheet.create({ app: { flex: 1, backgroundColor: colors.background }, body: { flex: 1 }, top: { minHeight: 62, paddingHorizontal: 15, gap: 10, flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border }, portal: { color: colors.purple, fontFamily: fonts.bold, fontSize: 10, backgroundColor: colors.purpleSoft, padding: 6, borderRadius: radii.pill }, user: { flex: 1, color: colors.muted, fontFamily: fonts.medium, fontSize: 11, textAlign: "right" }, nav: { minHeight: 70, flexDirection: "row", backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border }, navItem: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4 }, navText: { color: colors.subtle, fontFamily: fonts.medium, fontSize: 9 }, active: { color: colors.purple }, muted: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11, lineHeight: 17 }, error: { color: colors.error, fontFamily: fonts.medium, fontSize: 12 }, title: { color: colors.dark, fontFamily: fonts.bold, fontSize: 14 }, between: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }, row: { flexDirection: "row", gap: 10 }, gap: { gap: 14 }, flex: { flex: 1 }, actions: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 8 }, overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,.45)" }, sheet: { maxHeight: "85%", backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24 }, form: { padding: 20, gap: 16 }, sheetTitle: { color: colors.dark, fontFamily: fonts.bold, fontSize: 19 } });
