import React, { useCallback, useMemo, useState, useEffect } from "react";
import { Alert, FlatList, Pressable, ScrollView, Text, View, Modal, StyleSheet, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { Button, Card, DataRow, Field, Header, Screen, Segmented, SectionTitle, Badge, IconBubble, KpiCard, Grid } from "../../components/ui";
import { pageItems, platformApi } from "../../services/platformApi";
import { RemoteState, useRemote } from "./shared";
import { s } from "./styles";
import { Ionicons } from "../../components/AppIcon";
import { colors, fonts, radii, spacing } from "../../theme/tokens";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { downloadAndShareDocument, pickAndUploadDocument, pickDocument, uploadPickedDocument } from "../../services/nativeDocuments";

const todayISO = () => new Date(Date.now() + 330 * 60 * 1000).toISOString().slice(0, 10);

const formatCurrency = (v: unknown) => `â‚¹${Number(v ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const toNumber = (value: unknown) => { const n = Number(String(value ?? '').replace(/[â‚¹,\s]/g, '')); return Number.isFinite(n) ? n : 0; };
const getInitial = (name: string) => name?.trim()?.charAt(0)?.toUpperCase() || 'C';

const formatDate = (value: string | null | undefined) => {
  if (!value || value === '-') return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const addLoanDuration = (startDate: string, value: string, unit: string) => {
  if (!startDate || Number(value) <= 0) return '';
  const parts = startDate.split('-').map(Number);
  const year = parts[0] || 0;
  const month = parts[1] || 1;
  const day = parts[2] || 1;
  const date = new Date(year, month - 1, day);
  if (unit === 'Days') date.setDate(date.getDate() + Number(value));
  else if (unit === 'Weeks') date.setDate(date.getDate() + Number(value) * 7);
  else {
    const targetDay = date.getDate();
    date.setDate(1); date.setMonth(date.getMonth() + Number(value));
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    date.setDate(Math.min(targetDay, lastDay));
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export function CustomersScreen() {
  const loadCustomersData = useCallback(async () => {
    const [custPayload, loanPayload, payPayload, prodPayload, schedPayload] = await Promise.all([
      platformApi.customers.all(),
      platformApi.loans.all(),
      platformApi.payments.all(),
      platformApi.loans.products(),
      platformApi.payments.allSchedules(),
    ]);
    const products = pageItems(prodPayload);
    const loanGroups = new Map<string, any[]>();
    const loanCustomer = new Map<string, string>();
    const schedulesByLoan = new Map<string, any[]>();
    
    pageItems(schedPayload).forEach(sched => {
      const g = schedulesByLoan.get(sched.loanId) || [];
      g.push(sched);
      schedulesByLoan.set(sched.loanId, g);
    });

    pageItems(loanPayload).forEach(loan => {
      loanCustomer.set(loan.id, loan.customerId);
      const g = loanGroups.get(loan.customerId) || [];
      g.push({ ...loan, schedules: schedulesByLoan.get(loan.id) || [] });
      loanGroups.set(loan.customerId, g);
    });

    const paymentGroups = new Map<string, any[]>();
    pageItems(payPayload).forEach(pay => {
      const customerId = loanCustomer.get(pay.loanId);
      if (!customerId) return;
      const g = paymentGroups.get(customerId) || [];
      g.push(pay);
      paymentGroups.set(customerId, g);
    });

    const items = pageItems(custPayload).map(cust => {
      const loans = loanGroups.get(cust.id) || [];
      const payments = paymentGroups.get(cust.id) || [];
      const activeLoans = loans.filter(l => l.status === 'Active' || l.status === 'Due' || l.status === 'Overdue').length;
      const outstanding = loans.reduce((sum, l) => sum + Number(l.outstanding || 0), 0);
      const nextDue = loans
        .filter(l => l.status !== 'Closed' && l.nextDue && l.nextDue !== '-')
        .map(l => l.nextDue)
        .sort()[0] || '-';
        
      return { ...cust, loans, payments, activeLoans, outstanding, nextDue };
    });

    return { items, products };
  }, []);

  const state = useRemote(loadCustomersData, { items: [], products: [] });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isAdding, setIsAdding] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const rows = useMemo(() => {
    return (state.data?.items ?? []).filter((x: any) => {
      const matchSearch = `${x.fullName || x.name} ${x.phone || x.mobile} ${x.customerNumber || x.id}`.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "All" || x.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [state.data, search, statusFilter]);

  if (isAdding) {
    return <AddCustomerWizard onCancel={() => setIsAdding(false)} onSaved={async () => { setIsAdding(false); await state.refresh(); }} />;
  }

  const totalCustomers = state.data?.items?.length || 0;
  const activeCustomers = state.data?.items?.filter((c: any) => c.status === 'Active').length || 0;
  const overdueCustomers = state.data?.items?.filter((c: any) => c.status === 'Overdue').length || 0;

  return (
    <Screen>
      <Header
        title="Customers"
        subtitle="Manage your customers and their loan accounts."
        action={<Button label="Add" icon="add" onPress={() => setIsAdding(true)} />}
      />

      <Grid>
        <KpiCard label="Total Customers" value={String(totalCustomers)} accent="cyan" icon="people-outline" />
        <KpiCard label="Active Customers" value={String(activeCustomers)} accent="green" icon="checkmark-circle-outline" />
        <KpiCard label="New This Month" value="12" accent="purple" icon="person-add-outline" />
        <KpiCard label="Overdue Customers" value={String(overdueCustomers)} accent="error" icon="alert-circle-outline" />
      </Grid>

      <View style={{ gap: 12, marginTop: 8 }}>
        <View style={localStyles.searchWrap}>
          <View style={localStyles.searchIcon}>
            <Ionicons name="search" size={20} color={colors.subtle} />
          </View>
          <TextInput
            style={localStyles.searchInput}
            placeholder="Search by name, phone or ID"
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={colors.subtle}
          />
        </View>
        <Segmented
          options={["All", "Active", "Due", "Overdue", "Closed"]}
          value={statusFilter}
          onChange={setStatusFilter}
        />
      </View>

      <RemoteState {...state} retry={() => void state.refresh()} />

      <FlatList
        data={rows}
        keyExtractor={x => x.id}
        contentContainerStyle={{ paddingBottom: 80, gap: 14, paddingTop: 14 }}
        renderItem={({ item: x }) => (
          <Card style={{ padding: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <View style={localStyles.avatar}>
                <Text style={localStyles.avatarText}>{getInitial(x.fullName || x.name)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.dark }}>{x.fullName || x.name}</Text>
                <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.muted, marginTop: 2 }}>{x.customerNumber || x.id}  Â·  {x.phone || x.mobile}</Text>
              </View>
              <Badge status={x.status || "Active"} />
            </View>

            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 16, backgroundColor: colors.background, padding: 12, borderRadius: radii.md }}>
              <View>
                <Text style={localStyles.metricLabel}>Active Loans</Text>
                <Text style={localStyles.metricValue}>{x.activeLoans}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={localStyles.metricLabel}>Outstanding</Text>
                <Text style={localStyles.metricValue}>{formatCurrency(x.outstanding)}</Text>
              </View>
            </View>
            
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={localStyles.metricLabel}>Next Due</Text>
              <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.dark }}>{x.nextDue === '-' ? 'No upcoming due' : formatDate(x.nextDue)}</Text>
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button style={{ flex: 1 }} label="View" variant="secondary" onPress={() => setSelectedCustomer(x)} />
              <Button style={{ flex: 1 }} label="Edit" variant="ghost" onPress={() => Alert.alert("Edit", "Please use View -> Edit instead for full details.")} />
            </View>
          </Card>
        )}
        ListEmptyComponent={
          !state.loading ? (
            <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 40 }}>
              <Ionicons name="people-outline" size={48} color={colors.border} />
              <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.muted, marginTop: 12 }}>No customers found</Text>
            </View>
          ) : null
        }
      />

      {selectedCustomer && (
        <CustomerDetailsModal 
          customer={selectedCustomer} 
          products={state.data?.products ?? []}
          close={() => setSelectedCustomer(null)} 
          refreshList={() => void state.refresh()} 
        />
      )}
    </Screen>
  );
}

function CustomerDetailsModal({ customer, products, close, refreshList }: { customer: any, products: any[], close: () => void, refreshList: () => void }) {
  const [tab, setTab] = useState("Overview");
  const insets = useSafeAreaInsets();
  
  const [isEditCustomerOpen, setIsEditCustomerOpen] = useState(false);
  const [isAddLoanOpen, setIsAddLoanOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.border }}>
          <Pressable onPress={close} style={{ padding: 8, marginLeft: -8 }}>
            <Ionicons name="arrow-back" size={24} color={colors.dark} />
          </Pressable>
          <Text style={{ fontFamily: fonts.bold, fontSize: 17, color: colors.dark }}>Customer Details</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
          <View style={{ padding: 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 20 }}>
              <View style={[localStyles.avatar, { width: 56, height: 56, borderRadius: 28 }]}>
                <Text style={[localStyles.avatarText, { fontSize: 22 }]}>{getInitial(customer.fullName || customer.name)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 20, color: colors.dark }}>{customer.fullName || customer.name}</Text>
                <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.muted, marginTop: 4 }}>{customer.customerNumber || customer.id}  Â·  <Badge status={customer.status || "Active"} /></Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
              <Button style={{ flex: 1, minWidth: "30%" }} label="Edit" variant="secondary" icon="document-text-outline" onPress={() => setIsEditCustomerOpen(true)} />
              <Button style={{ flex: 1, minWidth: "30%" }} label="Add Loan" icon="add" onPress={() => setIsAddLoanOpen(true)} />
              <Button style={{ flex: 1, minWidth: "30%" }} label="Payment" variant="secondary" icon="wallet-outline" onPress={() => setIsPaymentOpen(true)} />
            </View>

            <Segmented options={["Overview", "Loans", "Payments", "Schedule", "Ledger", "Documents"]} value={tab} onChange={setTab} />
          </View>

          <View style={{ paddingHorizontal: 20 }}>
            {tab === "Overview" && <OverviewTab customer={customer} />}
            {tab === "Loans" && <LoansTab loans={customer.loans || []} />}
            {tab === "Payments" && <PaymentsTab payments={customer.payments || []} />}
            {tab === "Schedule" && <ScheduleTab loans={customer.loans || []} />}
            {tab === "Ledger" && <LedgerTab customer={customer} />}
            {tab === "Documents" && <CustomerDocuments customer={customer} />}
          </View>
        </ScrollView>
      </View>

      {isEditCustomerOpen && <EditCustomerModal customer={customer} close={() => setIsEditCustomerOpen(false)} refreshList={refreshList} />}
      {isAddLoanOpen && <AddLoanModal customer={customer} products={products} close={() => setIsAddLoanOpen(false)} refreshList={refreshList} />}
      {isPaymentOpen && <RecordPaymentModal customer={customer} close={() => setIsPaymentOpen(false)} refreshList={refreshList} />}
    </Modal>
  );
}

// ... more components below
function OverviewTab({ customer }: { customer: any }) {
  return (
    <View style={{ gap: 16 }}>
      <Card style={{ padding: 16 }}>
        <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.dark, marginBottom: 16 }}>Personal Information</Text>
        <DataRow title="Email" subtitle={customer.email || "-"} />
        <DataRow title="Date of Birth" subtitle={customer.dateOfBirth || customer.dob || "-"} />
        <DataRow title="Gender" subtitle={customer.gender || "-"} />
        <DataRow title="Aadhaar" subtitle={customer.aadhaar || "-"} />
        <DataRow title="PAN" subtitle={customer.pan || "-"} />
      </Card>
      
      <Card style={{ padding: 16 }}>
        <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.dark, marginBottom: 16 }}>Address</Text>
        <DataRow title="Address Line 1" subtitle={customer.addressLine1 || "-"} />
        <DataRow title="Address Line 2" subtitle={customer.addressLine2 || "-"} />
        <DataRow title="City" subtitle={customer.city || "-"} />
        <DataRow title="State" subtitle={customer.state || "-"} />
        <DataRow title="PIN Code" subtitle={customer.postalCode || customer.pinCode || "-"} />
      </Card>
    </View>
  );
}

function LoansTab({ loans }: { loans: any[] }) {
  if (!loans.length) return <EmptyState icon="cash-outline" message="No loan accounts for this customer." />;
  return (
    <View style={{ gap: 12 }}>
      {loans.map(loan => (
        <Card key={loan.id} style={{ padding: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.dark }}>{loan.displayId || loan.loanNumber || loan.id}</Text>
            <Badge status={loan.status || "Active"} />
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
            <View style={{ width: "45%" }}><Text style={localStyles.metricLabel}>Principal</Text><Text style={localStyles.metricValue}>{formatCurrency(loan.principal)}</Text></View>
            <View style={{ width: "45%" }}><Text style={localStyles.metricLabel}>Rate</Text><Text style={localStyles.metricValue}>{loan.annualInterestRate || loan.rate}%</Text></View>
            <View style={{ width: "45%" }}><Text style={localStyles.metricLabel}>Frequency</Text><Text style={localStyles.metricValue}>{loan.interestCollectionFrequency || loan.frequency}</Text></View>
            <View style={{ width: "45%" }}><Text style={localStyles.metricLabel}>Start Date</Text><Text style={localStyles.metricValue}>{formatDate(loan.startDate)}</Text></View>
            <View style={{ width: "45%" }}><Text style={localStyles.metricLabel}>Next Due</Text><Text style={localStyles.metricValue}>{formatDate(loan.nextDue)}</Text></View>
          </View>
        </Card>
      ))}
    </View>
  );
}

function PaymentsTab({ payments }: { payments: any[] }) {
  if (!payments.length) return <EmptyState icon="wallet-outline" message="No payments recorded." />;
  return (
    <View style={{ gap: 12 }}>
      {payments.map(payment => (
        <Card key={payment.id} style={{ padding: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.dark }}>{formatDate(payment.receivedAt || payment.date)}</Text>
            <Badge status={payment.status || "Success"} />
          </View>
          <Text style={{ fontFamily: fonts.bold, fontSize: 18, color: colors.dark, marginBottom: 8 }}>{formatCurrency(payment.amount)}</Text>
          <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.muted }}>Method: {payment.mode || payment.method}</Text>
          <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.muted }}>Reference: {payment.externalReference || payment.reference || "-"}</Text>
        </Card>
      ))}
    </View>
  );
}

function ScheduleTab({ loans }: { loans: any[] }) {
  const rows = loans.flatMap((loan) => (loan.schedules || []).map((schedule: any) => ({ ...schedule, loanNumber: loan.displayId || loan.id })));
  if (!rows.length) return <EmptyState icon="calendar-outline" message="No scheduled dues." />;
  return (
    <View style={{ gap: 12 }}>
      {rows.map((row: any) => (
        <Card key={row.id} style={{ padding: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.dark }}>{row.loanNumber}</Text>
            <Badge status={row.status || "Due"} />
          </View>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.muted, marginBottom: 8 }}>Due: {formatDate(row.dueDate)}</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <View><Text style={localStyles.metricLabel}>Interest Due</Text><Text style={localStyles.metricValue}>{formatCurrency(row.interestDue)}</Text></View>
            <View><Text style={localStyles.metricLabel}>Principal Due</Text><Text style={localStyles.metricValue}>{formatCurrency(row.principalDue)}</Text></View>
            <View><Text style={localStyles.metricLabel}>Total Due</Text><Text style={localStyles.metricValue}>{formatCurrency(row.remainingAmount ?? row.balance ?? row.totalDue)}</Text></View>
          </View>
        </Card>
      ))}
    </View>
  );
}

function LedgerTab({ customer }: { customer: any }) {
  const load = useCallback(() => platformApi.customers.ledger(customer.id), [customer.id]);
  const state = useRemote(load, { items: [] } as any);

  if (state.loading) return <Text style={{ textAlign: "center", color: colors.muted, marginTop: 20 }}>Loading ledger...</Text>;
  const entries = pageItems(state.data);
  
  if (!entries.length) return <EmptyState icon="document-text-outline" message="No ledger entries." />;
  return (
    <View style={{ gap: 12 }}>
      {entries.map((entry: any) => (
        <Card key={entry.id} style={{ padding: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.muted }}>{formatDate(entry.date || entry.createdAt)}</Text>
            <Badge status={entry.status || "Completed"} />
          </View>
          <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.dark, marginBottom: 8 }}>{entry.description || entry.type}</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            {entry.debit ? <Text style={{ fontFamily: fonts.bold, color: colors.error }}>Debit: {formatCurrency(entry.debit)}</Text> : <Text />}
            {entry.credit ? <Text style={{ fontFamily: fonts.bold, color: colors.green }}>Credit: {formatCurrency(entry.credit)}</Text> : <Text />}
            <Text style={{ fontFamily: fonts.bold, color: colors.dark }}>Bal: {formatCurrency(entry.balance)}</Text>
          </View>
        </Card>
      ))}
    </View>
  );
}

function CustomerDocuments({ customer }: { customer: any }) {
  const load = useCallback(() => platformApi.documents.listForCustomer(customer.id), [customer.id]);
  const state = useRemote(load, { items: [] } as any);
  
  const upload = async () => {
    try {
      await pickAndUploadDocument("Other", { customerId: customer.id });
      await state.refresh();
    } catch (e) {
      Alert.alert("Upload failed", e instanceof Error ? e.message : "Error");
    }
  };
  
  return (
    <View style={{ gap: 12 }}>
      <Button label="Upload Document" icon="add" onPress={() => void upload()} />
      <RemoteState {...state} retry={() => void state.refresh()} />
      {pageItems(state.data).map((x: any) => (
        <Card key={x.id} style={{ padding: 16 }}>
          <DataRow title={x.originalFileName ?? x.fileName ?? "Document"} subtitle={`${x.category ?? ""} Â· ${x.status ?? ""}`} />
          <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
            <Button style={{ flex: 1 }} label="Open" variant="secondary" onPress={() => void downloadAndShareDocument(x.id, x.originalFileName)} />
            <Button style={{ flex: 1 }} label="Delete" variant="danger" onPress={async () => {
              try { await platformApi.documents.remove(x.id); await state.refresh(); } 
              catch (e) { Alert.alert("Error", "Could not delete"); }
            }} />
          </View>
        </Card>
      ))}
      {pageItems(state.data).length === 0 && !state.loading && <EmptyState icon="folder-outline" message="No documents uploaded." />}
    </View>
  );
}

function EmptyState({ icon, message }: { icon: any, message: string }) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 40 }}>
      <Ionicons name={icon} size={48} color={colors.border} />
      <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.muted, marginTop: 12 }}>{message}</Text>
    </View>
  );
}
function EditCustomerModal({ customer, close, refreshList }: { customer: any, close: () => void, refreshList: () => void }) {
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(customer.fullName || customer.name || "");
  const [phone, setPhone] = useState(customer.phone || customer.mobile || "");
  const [city, setCity] = useState(customer.city || "");
  const [stateName, setStateName] = useState(customer.state || "");
  const [pinCode, setPinCode] = useState(customer.postalCode || customer.pinCode || "");

  const save = async () => {
    if (!name.trim() || !phone.trim() || !city.trim() || !stateName.trim() || !pinCode.trim()) {
      return Alert.alert("Missing Fields", "Please complete all required fields.");
    }
    setBusy(true);
    try {
      await platformApi.customers.update(customer.id, {
        fullName: name.trim(),
        phone: phone.trim(),
        city: city.trim(),
        state: stateName.trim(),
        postalCode: pinCode.trim(),
      });
      refreshList();
      close();
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Error saving");
    } finally {
      setBusy(false);
    }
  };

  const insets = useSafeAreaInsets();
  return (
    <Modal visible transparent animationType="slide" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={{ backgroundColor: colors.background, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, maxHeight: "90%", paddingBottom: insets.bottom }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 17, color: colors.dark }}>Edit Customer</Text>
              <Pressable onPress={close}><Ionicons name="close" size={24} color={colors.subtle} /></Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
              <Field label="Full Name *" value={name} onChangeText={setName} />
              <Field label="Mobile *" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
              <Field label="City *" value={city} onChangeText={setCity} />
              <Field label="State *" value={stateName} onChangeText={setStateName} />
              <Field label="PIN Code *" value={pinCode} onChangeText={setPinCode} keyboardType="number-pad" />
              <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
                <Button style={{ flex: 1 }} label="Cancel" variant="secondary" onPress={close} disabled={busy} />
                <Button style={{ flex: 1 }} label="Save Changes" onPress={() => void save()} loading={busy} />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function AddLoanModal({ customer, products, close, refreshList }: { customer: any, products: any[], close: () => void, refreshList: () => void }) {
  const [busy, setBusy] = useState(false);
  const [principal, setPrincipal] = useState("");
  const [rate, setRate] = useState("18");
  const [durationValue, setDurationValue] = useState("12");
  const [durationUnit, setDurationUnit] = useState("Months");
  const [collectionFreq, setCollectionFreq] = useState("Monthly");
  const [startDate, setStartDate] = useState(todayISO());

  const save = async () => {
    const p = toNumber(principal);
    if (p <= 0 || !durationValue) return Alert.alert("Error", "Please enter valid loan details.");
    
    setBusy(true);
    try {
      const product = products.find(x => x.isActive !== false) || products[0];
      if (!product) throw new Error("No active loan product.");
      if (p < Number(product.minimumPrincipal) || p > Number(product.maximumPrincipal)) {
         throw new Error(`Principal must be between ${formatCurrency(product.minimumPrincipal)} and ${formatCurrency(product.maximumPrincipal)}`);
      }
      await platformApi.loans.create({
        customerId: customer.id,
        loanProductId: product.id,
        principal: p,
        annualInterestRate: toNumber(rate),
        tenureMonths: Math.max(product.minimumTenureMonths || 1, 1),
        startDate,
        durationValue: toNumber(durationValue),
        durationUnit,
        interestRate: toNumber(rate),
        interestRateBasis: 'PerMonth',
        interestCollectionFrequency: collectionFreq
      });
      refreshList();
      close();
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Error saving");
    } finally {
      setBusy(false);
    }
  };

  const insets = useSafeAreaInsets();
  return (
    <Modal visible transparent animationType="slide" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={{ backgroundColor: colors.background, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, maxHeight: "90%", paddingBottom: insets.bottom }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 17, color: colors.dark }}>Add Loan</Text>
              <Pressable onPress={close}><Ionicons name="close" size={24} color={colors.subtle} /></Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
              <Field label="Principal Amount (â‚¹) *" value={principal} onChangeText={setPrincipal} keyboardType="number-pad" placeholder="e.g. 10000" />
              <Field label="Monthly Interest Rate (%) *" value={rate} onChangeText={setRate} keyboardType="decimal-pad" />
              <View style={{ gap: 8 }}>
                <Text style={localStyles.metricLabel}>Duration Unit</Text>
                <Segmented options={["Days", "Weeks", "Months"]} value={durationUnit} onChange={setDurationUnit} />
              </View>
              <Field label={`Number of ${durationUnit} *`} value={durationValue} onChangeText={setDurationValue} keyboardType="number-pad" />
              <View style={{ gap: 8 }}>
                <Text style={localStyles.metricLabel}>Collection Frequency</Text>
                <Segmented options={["Daily", "Weekly", "Monthly", "AtMaturity"]} value={collectionFreq} onChange={setCollectionFreq} />
              </View>
              <Field label="Start Date *" value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" />
              <Field label="Maturity Date" value={addLoanDuration(startDate, durationValue, durationUnit)} editable={false} />
              <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
                <Button style={{ flex: 1 }} label="Cancel" variant="secondary" onPress={close} disabled={busy} />
                <Button style={{ flex: 1 }} label="Add Loan" onPress={() => void save()} loading={busy} />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
function RecordPaymentModal({ customer, close, refreshList }: { customer: any, close: () => void, refreshList: () => void }) {
  const [busy, setBusy] = useState(false);
  const activeLoans = (customer.loans || []).filter((l: any) => l.status !== 'Closed');
  const [loanId, setLoanId] = useState(activeLoans.length > 0 ? activeLoans[0].id : "");
  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("Interest");
  const [method, setMethod] = useState("UPI");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const save = async () => {
    const a = toNumber(amount);
    if (a <= 0 || !loanId) return Alert.alert("Error", "Please enter valid payment details.");
    
    setBusy(true);
    try {
      const modeMap: any = { PhonePe: 'Upi', 'Google Pay': 'Upi', UPI: 'Upi', 'Bank Transfer': 'BankTransfer' };
      await platformApi.payments.record({
        loanId,
        paymentScheduleId: null,
        amount: a,
        receivedAt: new Date(`${date || todayISO()}T12:00:00`).toISOString(),
        mode: modeMap[method] || method,
        externalReference: reference || null,
        notes: notes || null
      });
      refreshList();
      close();
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Error saving");
    } finally {
      setBusy(false);
    }
  };

  const insets = useSafeAreaInsets();
  return (
    <Modal visible transparent animationType="slide" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={{ backgroundColor: colors.background, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, maxHeight: "90%", paddingBottom: insets.bottom }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 17, color: colors.dark }}>Record Payment</Text>
              <Pressable onPress={close}><Ionicons name="close" size={24} color={colors.subtle} /></Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
              {activeLoans.length === 0 ? (
                <Text style={{ color: colors.error }}>No active loans available for this customer.</Text>
              ) : (
                <>
                  <View style={{ gap: 8 }}>
                    <Text style={localStyles.metricLabel}>Loan</Text>
                    {/* Simplified for mobile: assume activeLoans handles it via selection, but for now we just show a label since there might be no Select component in ui.tsx. Let's use Segmented if small or a simple mapping */}
                    <Segmented options={activeLoans.map((l: any) => l.displayId || l.id).slice(0, 3)} value={activeLoans.find((l: any) => l.id === loanId)?.displayId || activeLoans.find((l: any) => l.id === loanId)?.id} onChange={(v) => { const l = activeLoans.find((al: any) => (al.displayId || al.id) === v); if (l) setLoanId(l.id); }} />
                  </View>
                  <Field label="Payment Date *" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
                  <Field label="Amount Received (â‚¹) *" value={amount} onChangeText={setAmount} keyboardType="number-pad" />
                  <View style={{ gap: 8 }}>
                    <Text style={localStyles.metricLabel}>Payment Type</Text>
                    <Segmented options={["Interest", "Principal", "Principal + Interest"]} value={type} onChange={setType} />
                  </View>
                  <View style={{ gap: 8 }}>
                    <Text style={localStyles.metricLabel}>Payment Method</Text>
                    <Segmented options={["UPI", "Cash", "Bank Transfer", "Cheque"]} value={method} onChange={setMethod} />
                  </View>
                  <Field label="Transaction Reference" value={reference} onChangeText={setReference} />
                  <Field label="Notes" value={notes} onChangeText={setNotes} multiline />

                  <View style={{ padding: 16, backgroundColor: colors.cyanSoft, borderRadius: radii.md, gap: 8 }}>
                     <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={localStyles.metricLabel}>Amount Due</Text><Text style={{ fontFamily: fonts.bold }}>{formatCurrency(customer.outstanding)}</Text></View>
                     <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={localStyles.metricLabel}>Received</Text><Text style={{ fontFamily: fonts.bold, color: colors.green }}>{formatCurrency(amount)}</Text></View>
                     <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={localStyles.metricLabel}>New Outstanding</Text><Text style={{ fontFamily: fonts.bold, color: colors.orange }}>{formatCurrency(Math.max(0, customer.outstanding - toNumber(amount)))}</Text></View>
                  </View>

                  <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
                    <Button style={{ flex: 1 }} label="Cancel" variant="secondary" onPress={close} disabled={busy} />
                    <Button style={{ flex: 1 }} label="Save Payment" onPress={() => void save()} loading={busy} />
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function AddCustomerWizard({ onCancel, onSaved }: { onCancel: () => void, onSaved: () => Promise<void> }) {
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("Other");
  const [houseNumber, setHouseNumber] = useState("");
  const [street, setStreet] = useState("");
  const [area, setArea] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [pan, setPan] = useState("");
  const [aadhaarDoc, setAadhaarDoc] = useState<any>(null);
  const [panDoc, setPanDoc] = useState<any>(null);
  const [addressProof, setAddressProof] = useState<any>(null);
  const [photograph, setPhotograph] = useState<any>(null);

  const save = async () => {
    if (!name.trim() || !phone.trim() || !city.trim() || !stateName.trim() || !pinCode.trim()) {
      return Alert.alert("Missing Fields", "Please complete all required fields.");
    }
    setBusy(true);
    try {
      const created = await platformApi.customers.create({
        fullName: name.trim(),
        dateOfBirth: dob || null,
        gender,
        phone: phone.trim(),
        email: email.trim() || null,
        addressLine1: `${houseNumber} ${street}`.trim(),
        addressLine2: area.trim(),
        city: city.trim(),
        state: stateName.trim(),
        postalCode: pinCode.trim(),
        aadhaar: aadhaar.trim() || null,
        pan: pan.trim() || null
      });
      const uploads = [[aadhaarDoc, "Aadhaar"], [panDoc, "Pan"], [addressProof, "AddressProof"], [photograph, "Photograph"]].filter(([doc]) => doc !== null);
      await Promise.all(uploads.map(([doc, category]) => uploadPickedDocument(doc, category as string, { customerId: created.id })));
      await onSaved();
    } catch (e) {
      Alert.alert("Customer not saved", e instanceof Error ? e.message : "Error saving");
    } finally {
      setBusy(false);
    }
  };

  const handlePick = async (setter: (v: any) => void) => {
    try {
      const doc = await pickDocument();
      if (doc) setter(doc);
    } catch (e) {
      Alert.alert("Picker Error", "Could not select document.");
    }
  };

  return (
    <Screen>
      <Header title={`Add Customer (Step ${step}/4)`} action={<Button label="Cancel" variant="ghost" onPress={onCancel} />} />
      <ScrollView contentContainerStyle={{ paddingBottom: 100, gap: 16 }}>
        {step === 1 && (
          <Card>
            <Text style={{ fontFamily: fonts.bold, fontSize: 16, marginBottom: 12 }}>Personal Information</Text>
            <View style={{ gap: 16 }}>
              <Field label="Full name *" value={name} onChangeText={setName} />
              <Field label="Mobile *" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
              <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
              <Field label="Date of birth" value={dob} onChangeText={setDob} placeholder="YYYY-MM-DD" />
              <View style={{ gap: 8 }}><Text style={localStyles.metricLabel}>Gender</Text><Segmented options={["Male", "Female", "Other"]} value={gender} onChange={setGender} /></View>
            </View>
            <Button label="Next: Address" onPress={() => setStep(2)} style={{ marginTop: 20 }} />
          </Card>
        )}
        {step === 2 && (
          <Card>
            <Text style={{ fontFamily: fonts.bold, fontSize: 16, marginBottom: 12 }}>Address Details</Text>
            <View style={{ gap: 16 }}>
              <Field label="House Number" value={houseNumber} onChangeText={setHouseNumber} />
              <Field label="Street" value={street} onChangeText={setStreet} />
              <Field label="Area/Village" value={area} onChangeText={setArea} />
              <Field label="City *" value={city} onChangeText={setCity} />
              <Field label="State *" value={stateName} onChangeText={setStateName} />
              <Field label="PIN Code *" value={pinCode} onChangeText={setPinCode} keyboardType="number-pad" />
            </View>
            <View style={{ flexDirection: "row", marginTop: 20, gap: 12 }}>
              <Button style={{ flex: 1 }} label="Back" variant="secondary" onPress={() => setStep(1)} />
              <Button style={{ flex: 1 }} label="Next: KYC" onPress={() => setStep(3)} />
            </View>
          </Card>
        )}
        {step === 3 && (
          <Card>
            <Text style={{ fontFamily: fonts.bold, fontSize: 16, marginBottom: 12 }}>KYC Details</Text>
            <View style={{ gap: 16 }}>
              <Field label="Aadhaar Number" value={aadhaar} onChangeText={setAadhaar} keyboardType="number-pad" />
              <Field label="PAN" value={pan} onChangeText={setPan} autoCapitalize="characters" />
            </View>
            <View style={{ flexDirection: "row", marginTop: 20, gap: 12 }}>
              <Button style={{ flex: 1 }} label="Back" variant="secondary" onPress={() => setStep(2)} />
              <Button style={{ flex: 1 }} label="Next: Documents" onPress={() => setStep(4)} />
            </View>
          </Card>
        )}
        {step === 4 && (
          <Card>
            <Text style={{ fontFamily: fonts.bold, fontSize: 16, marginBottom: 12 }}>Documents (Optional)</Text>
            <View style={{ gap: 16 }}>
              <Text style={{ color: colors.muted }}>Select documents to attach to this customer profile.</Text>
              <Button label={aadhaarDoc ? `Selected: ${aadhaarDoc.name}` : "Select Aadhaar Document"} variant="secondary" onPress={() => void handlePick(setAadhaarDoc)} />
              <Button label={panDoc ? `Selected: ${panDoc.name}` : "Select PAN Document"} variant="secondary" onPress={() => void handlePick(setPanDoc)} />
              <Button label={addressProof ? `Selected: ${addressProof.name}` : "Select Address Proof"} variant="secondary" onPress={() => void handlePick(setAddressProof)} />
              <Button label={photograph ? `Selected: ${photograph.name}` : "Select Photograph"} variant="secondary" onPress={() => void handlePick(setPhotograph)} />
            </View>
            <View style={{ flexDirection: "row", marginTop: 20, gap: 12 }}>
              <Button style={{ flex: 1 }} label="Back" variant="secondary" onPress={() => setStep(3)} disabled={busy} />
              <Button style={{ flex: 1 }} label="Save Customer" loading={busy} onPress={() => void save()} />
            </View>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

const localStyles = StyleSheet.create({
  searchWrap: { flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: 12, height: 44 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: "100%", fontFamily: fonts.regular, fontSize: 14, color: colors.dark },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.cyanSoft, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.cyan, fontFamily: fonts.bold, fontSize: 18 },
  metricLabel: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12, marginBottom: 4 },
  metricValue: { color: colors.dark, fontFamily: fonts.bold, fontSize: 14 }
});
