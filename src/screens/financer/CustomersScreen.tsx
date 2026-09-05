import React, { useCallback, useMemo, useState } from "react";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Alert, FlatList, Pressable, ScrollView, Text, View, Modal, StyleSheet, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { Button, Card, DataRow, Field, Header, Screen, Segmented, Badge, KpiCard, Grid } from "../../components/ui";
import { pageItems, platformApi } from "../../services/platformApi";
import { RemoteState, useRemote } from "./shared";
import { Ionicons } from "../../components/AppIcon";
import { colors, fonts, radii, spacing } from "../../theme/tokens";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { downloadAndShareDocument, pickAndUploadDocument, pickDocument, takePhoto, uploadPickedDocument } from "../../services/nativeDocuments";
import { localDateOnly } from "../../utils/date";
import { formatInr } from "../../utils/format";
import { collectionInterestForFrequency, totalInterestForDuration } from "./loanInterest";
import { resolveAddressByPin, suggestAddresses, type AddressMatch } from "../../utils/addressLookup";

const todayISO = () => localDateOnly();

const formatCurrency = formatInr;
const toNumber = (value: unknown) => { const n = Number(String(value ?? '').replace(/[₹,\s]/g, '')); return Number.isFinite(n) ? n : 0; };
const getInitial = (name: string) => name?.trim()?.charAt(0)?.toUpperCase() || 'C';

const formatDate = (value: string | null | undefined) => {
  if (!value || value === '-') return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getLoanStartDate = (loan: any) =>
  loan.startDate ?? loan.dateGiven ?? loan.disbursementDate ?? loan.disbursedAt ?? null;

const getLoanNextDueDate = (loan: any) => {
  const directDate = loan.nextDueDate ?? loan.nextDue;
  if (directDate && directDate !== '-') return directDate;

  return (loan.schedules ?? [])
    .filter((schedule: any) => !['Paid', 'Success', 'Cancelled'].includes(String(schedule.status)))
    .map((schedule: any) => schedule.dueDate)
    .filter(Boolean)
    .sort((a: string, b: string) => new Date(a).getTime() - new Date(b).getTime())[0] ?? null;
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

const firstInterestDue = (startDate: string, frequency: string, maturityDate: string) => {
  const candidate = frequency === 'Daily' ? addLoanDuration(startDate, '1', 'Days')
    : frequency === 'Weekly' ? addLoanDuration(startDate, '1', 'Weeks')
      : frequency === 'Monthly' ? addLoanDuration(startDate, '1', 'Months')
        : maturityDate;
  return candidate && maturityDate && candidate < maturityDate ? candidate : maturityDate;
};

const collectionInterestLabel = (frequency: string) => ({
  Daily: 'Estimated Interest per Day',
  Weekly: 'Estimated Interest per Week',
  Monthly: 'Estimated First Monthly Interest',
  AtMaturity: 'Estimated Interest at Maturity',
}[frequency] || 'Estimated Collection Interest');

const normalizeIndianMobile = (value: string) => {
  const digits = value.replace(/\D/g, '');
  return digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
};

const isValidAdultDate = (value: string) => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return false;
  const now = new Date();
  const cutoff = new Date(now.getFullYear() - 18, now.getMonth(), now.getDate());
  return date <= cutoff;
};

const validateCustomerStep = (step: number, form: {
  name: string; phone: string; email: string; dob: string; city: string;
  stateName: string; pinCode: string; aadhaar: string; pan: string; gender: string;
  houseNumber: string; street: string; area: string;
}) => {
  if (step === 1) {
    if (!form.name.trim()) return 'Full name is required.';
    if (!/^[A-Za-z][A-Za-z .'-]{1,99}$/.test(form.name.trim())) return 'Full name must contain 2 to 100 letters.';
    if (!/^[6-9]\d{9}$/.test(normalizeIndianMobile(form.phone))) return 'Enter a valid 10-digit Indian mobile number.';
    if (form.email.trim().length > 254 || (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))) return 'Enter a valid email address.';
    if (!isValidAdultDate(form.dob)) return 'Customer must have a valid date of birth and be at least 18 years old.';
    if (!['Male', 'Female', 'Other'].includes(form.gender)) return 'Select a gender.';
  }
  if (step === 2) {
    if (![form.houseNumber, form.street, form.area].some(value => value.trim())) return 'Enter at least one address detail: house number, street, or area.';
    if (!/^[A-Za-z][A-Za-z .'-]{1,99}$/.test(form.city.trim())) return 'City must contain 2 to 100 letters.';
    if (!/^[A-Za-z][A-Za-z .'-]{1,99}$/.test(form.stateName.trim())) return 'State must contain 2 to 100 letters.';
    if (!/^[1-9]\d{5}$/.test(form.pinCode.trim())) return 'Enter a valid 6-digit Indian PIN code.';
  }
  if (step === 3) {
    const aadhaar = form.aadhaar.replace(/\D/g, '');
    if (form.aadhaar.trim() && !/^[2-9]\d{11}$/.test(aadhaar)) return 'Aadhaar must contain 12 digits and cannot begin with 0 or 1.';
    if (form.pan.trim() && !/^[A-Z]{5}\d{4}[A-Z]$/.test(form.pan.trim().toUpperCase())) return 'PAN must use the format ABCDE1234F.';
  }
  return '';
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
        .filter(l => l.status !== 'Closed')
        .map(getLoanNextDueDate)
        .filter(Boolean)
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
  const [openSelectedForEdit, setOpenSelectedForEdit] = useState(false);

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
  const currentMonth = todayISO().slice(0, 7);
  const newCustomersThisMonth = state.data?.items?.filter((customer: any) =>
    String(customer.createdAt ?? customer.createdOn ?? customer.registrationDate ?? '').slice(0, 7) === currentMonth
  ).length || 0;

  return (
    <Screen scroll={false} contentStyle={{ paddingBottom: 0 }}>
      <FlatList
        data={rows}
        keyExtractor={x => x.id}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80, gap: 14 }}
        ListHeaderComponent={
          <View style={{ gap: spacing.xl }}>
            <Header
              title="Customers"
              subtitle="Manage your customers and their loan accounts."
              action={<Button label="Add" icon="add" onPress={() => setIsAdding(true)} />}
            />

            <Grid>
              <KpiCard label="Total Customers" value={String(totalCustomers)} accent="cyan" icon="people-outline" />
              <KpiCard label="Active Customers" value={String(activeCustomers)} accent="green" icon="checkmark-circle-outline" />
              <KpiCard label="Customers Added This Month" value={String(newCustomersThisMonth)} accent="purple" icon="person-add-outline" />
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
          </View>
        }
        renderItem={({ item: x }) => (
          <Card style={{ padding: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <View style={localStyles.avatar}>
                <Text style={localStyles.avatarText}>{getInitial(x.fullName || x.name)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.dark }}>{x.fullName || x.name}</Text>
                <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.muted, marginTop: 2 }}>{x.customerNumber || x.id} · {x.phone || x.mobile}</Text>
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
              <View><Text style={localStyles.metricLabel}>City</Text><Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.dark }}>{x.city || '-'}</Text></View>
              <View style={{ alignItems: "flex-end" }}><Text style={localStyles.metricLabel}>Next Due</Text><Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.dark }}>{x.nextDue === '-' ? 'No upcoming due' : formatDate(x.nextDue)}</Text></View>
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button style={{ flex: 1 }} label="View" variant="secondary" onPress={() => setSelectedCustomer(x)} />
              <Button style={{ flex: 1 }} label="Edit" variant="ghost" onPress={() => { setOpenSelectedForEdit(true); setSelectedCustomer(x); }} />
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
          initialEdit={openSelectedForEdit}
          close={() => { setSelectedCustomer(null); setOpenSelectedForEdit(false); }}
          refreshList={() => void state.refresh()} 
        />
      )}
    </Screen>
  );
}

function CustomerDetailsModal({ customer, products, initialEdit = false, close, refreshList }: { customer: any, products: any[], initialEdit?: boolean, close: () => void, refreshList: () => void }) {
  const [tab, setTab] = useState("Overview");
  const [detailsCustomer, setDetailsCustomer] = useState(customer);
  const insets = useSafeAreaInsets();
  
  const [isEditCustomerOpen, setIsEditCustomerOpen] = useState(initialEdit);
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
                <Text style={[localStyles.avatarText, { fontSize: 22 }]}>{getInitial(detailsCustomer.fullName || detailsCustomer.name)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 20, color: colors.dark }}>{detailsCustomer.fullName || detailsCustomer.name}</Text>
                <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.muted, marginTop: 4 }}>{detailsCustomer.customerNumber || detailsCustomer.id} · <Badge status={detailsCustomer.status || "Active"} /></Text>
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
            {tab === "Overview" && <OverviewTab customer={detailsCustomer} />}
            {tab === "Loans" && <LoansTab loans={detailsCustomer.loans || []} />}
            {tab === "Payments" && <PaymentsTab payments={detailsCustomer.payments || []} />}
            {tab === "Schedule" && <ScheduleTab loans={detailsCustomer.loans || []} />}
            {tab === "Ledger" && <LedgerTab customer={detailsCustomer} />}
            {tab === "Documents" && <CustomerDocuments customer={detailsCustomer} />}
          </View>
        </ScrollView>
      </View>

      {isEditCustomerOpen && <EditCustomerModal customer={detailsCustomer} close={() => setIsEditCustomerOpen(false)} refreshList={refreshList} onUpdated={setDetailsCustomer} />}
      {isAddLoanOpen && <AddLoanModal
        customer={detailsCustomer}
        products={products}
        close={() => setIsAddLoanOpen(false)}
        onCreated={(loan) => {
          setDetailsCustomer((current: any) => ({
            ...current,
            loans: [...(current.loans || []).filter((item: any) => item.id !== loan.id), loan],
            activeLoans: Number(current.activeLoans ?? 0) + 1,
            outstanding: Number(current.outstanding ?? 0) + Number(loan.principalOutstanding ?? loan.principal ?? 0),
          }));
          setTab("Loans");
          refreshList();
        }}
      />}
      {isPaymentOpen && <RecordPaymentModal customer={detailsCustomer} close={() => setIsPaymentOpen(false)} refreshList={refreshList} />}
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
            <View style={{ width: "45%" }}><Text style={localStyles.metricLabel}>Start Date</Text><Text style={localStyles.metricValue}>{formatDate(getLoanStartDate(loan))}</Text></View>
            <View style={{ width: "45%" }}><Text style={localStyles.metricLabel}>Next Due</Text><Text style={localStyles.metricValue}>{formatDate(getLoanNextDueDate(loan))}</Text></View>
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
  const rows = loans.flatMap((loan) => (loan.schedules || []).map((schedule: any) => ({ ...schedule, loanNumber: loan.displayId || loan.loanNumber || loan.id })));
  if (!rows.length) return <EmptyState icon="calendar-outline" message="No scheduled dues." />;
  return (
    <View style={{ gap: 12 }}>
      {rows.map((row: any) => (
        <Card key={row.id} style={{ padding: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 8, gap: 10 }}>
            <Text style={{ flex: 1, fontFamily: fonts.bold, fontSize: 14, lineHeight: 20, color: colors.dark }} numberOfLines={2}>{row.loanNumber}</Text>
            <View style={{ flexShrink: 0 }}><Badge status={row.status || "Due"} /></View>
          </View>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.muted, marginBottom: 8 }}>Due: {formatDate(row.dueDate)}</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}><Text style={localStyles.metricLabel}>Interest Due</Text><Text style={localStyles.metricValue}>{formatCurrency(row.interestDue)}</Text></View>
            <View style={{ flex: 1 }}><Text style={localStyles.metricLabel}>Principal Due</Text><Text style={localStyles.metricValue}>{formatCurrency(row.principalDue)}</Text></View>
            <View style={{ flex: 1, alignItems: "flex-end" }}><Text style={localStyles.metricLabel}>Total Due</Text><Text style={localStyles.metricValue}>{formatCurrency(row.remainingAmount ?? row.balance ?? row.totalDue)}</Text></View>
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
  const entries = Array.isArray((state.data as any)?.entries)
    ? (state.data as any).entries
    : pageItems(state.data);
  
  if (!entries.length) return <EmptyState icon="document-text-outline" message="No ledger entries." />;
  return (
    <View style={{ gap: 12 }}>
      {entries.map((entry: any) => (
        <Card key={entry.id} style={{ padding: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.muted }}>{formatDate(entry.transactionAt || entry.date || entry.createdAt)}</Text>
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
          <DataRow title={x.originalFileName ?? x.fileName ?? "Document"} subtitle={`${x.category ?? ""} · ${x.status ?? ""}`} />
          <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
            <Button style={{ flex: 1 }} label="Open" variant="secondary" onPress={async () => {
              try {
                await downloadAndShareDocument(x.id, x.originalFileName ?? x.fileName);
              } catch (e) {
                Alert.alert("Document not opened", e instanceof Error ? e.message : "Download or viewer unavailable.");
              }
            }} />
            <Button style={{ flex: 1 }} label="Delete" variant="danger" onPress={() => Alert.alert(
              "Delete document?",
              `This will permanently delete ${x.originalFileName ?? x.fileName ?? "this document"}.`,
              [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: async () => {
                try { await platformApi.documents.remove(x.id); await state.refresh(); }
                catch { Alert.alert("Error", "Could not delete"); }
              } }],
            )} />
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
function EditCustomerModal({ customer, close, refreshList, onUpdated }: { customer: any, close: () => void, refreshList: () => void, onUpdated: (customer: any) => void }) {
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(customer.fullName || customer.name || "");
  const [phone, setPhone] = useState(customer.phone || customer.mobile || "");
  const [email, setEmail] = useState(customer.email || "");
  const [dob, setDob] = useState(String(customer.dateOfBirth || customer.dob || "").slice(0, 10));
  const [gender, setGender] = useState(customer.gender || "Select");
  const [houseNumber, setHouseNumber] = useState(customer.houseNumber || customer.addressLine1 || "");
  const [street, setStreet] = useState(customer.street || "");
  const [area, setArea] = useState(customer.area || customer.addressLine2 || "");
  const [city, setCity] = useState(customer.city || "");
  const [stateName, setStateName] = useState(customer.state || "");
  const [pinCode, setPinCode] = useState(customer.postalCode || customer.pinCode || "");
  const aadhaar = customer.aadhaarMasked || customer.aadhaar || "";
  const pan = customer.panMasked || customer.pan || "";

  const save = async () => {
    const validationForm = { name, phone, email, dob, gender, houseNumber, street, area, city, stateName, pinCode, aadhaar: "", pan: "" };
    for (const validationStep of [1, 2]) {
      const error = validateCustomerStep(validationStep, validationForm);
      if (error) return Alert.alert("Check customer details", error);
    }
    const mobile = normalizeIndianMobile(phone);
    setBusy(true);
    try {
      const updated = await platformApi.customers.update(customer.id, {
        fullName: name.trim(),
        dateOfBirth: dob,
        gender: gender === "Select" ? null : gender,
        phone: mobile,
        email: email.trim() || null,
        addressLine1: [houseNumber.trim(), street.trim()].filter(Boolean).join(', ') || area.trim(),
        addressLine2: area.trim() || null,
        city: city.trim(),
        state: stateName.trim(),
        postalCode: pinCode.trim(),
        status: customer.status || 'Active',
      });
      onUpdated({ ...customer, ...updated });
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
              <Field label="Full Name *" value={name} onChangeText={setName} maxLength={100} />
              <Field label="Mobile Number *" value={phone} onChangeText={value => setPhone(value.replace(/\D/g, ""))} keyboardType="phone-pad" maxLength={10} />
              <Field label="Email Address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" maxLength={254} />
              <Field label="Date of Birth *" value={dob} onChangeText={setDob} placeholder="YYYY-MM-DD" />
              <View style={{ gap: 8 }}>
                <Text style={localStyles.metricLabel}>Gender</Text>
                <Segmented options={["Select", "Male", "Female", "Other"]} value={gender} onChange={setGender} />
              </View>
              <Field label="House / Flat Number" value={houseNumber} onChangeText={setHouseNumber} />
              <Field label="Street" value={street} onChangeText={setStreet} />
              <Field label="Area" value={area} onChangeText={setArea} />
              <Field label="City *" value={city} onChangeText={setCity} maxLength={100} />
              <Field label="State *" value={stateName} onChangeText={setStateName} maxLength={100} />
              <Field label="PIN Code *" value={pinCode} onChangeText={value => setPinCode(value.replace(/\D/g, ""))} keyboardType="number-pad" maxLength={6} />
              <Field label="Aadhaar (identity changes require KYC)" value={aadhaar} editable={false} />
              <Field label="PAN (identity changes require KYC)" value={pan} editable={false} />
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

function AddLoanModal({ customer, products, close, onCreated }: { customer: any, products: any[], close: () => void, onCreated: (loan: any) => void }) {
  const product = products.find(x => x.isActive !== false) || products[0];
  const [busy, setBusy] = useState(false);
  const [principal, setPrincipal] = useState("");
  const [rate, setRate] = useState("");
  const [durationValue, setDurationValue] = useState("");
  const [durationUnit, setDurationUnit] = useState("Days");
  const [collectionFreq, setCollectionFreq] = useState("Daily");
  const [startDate, setStartDate] = useState("");
  const [adminCollectionMonitoring, setAdminCollectionMonitoring] = useState(false);

  const principalAmount = toNumber(principal);
  const monthlyRate = toNumber(rate);
  const maturityDate = addLoanDuration(startDate, durationValue, durationUnit);
  const firstDueDate = firstInterestDue(startDate, collectionFreq, maturityDate);
  const totalInterest = totalInterestForDuration(principalAmount, monthlyRate, durationValue, durationUnit);
  const collectionInterest = collectionInterestForFrequency(principalAmount, monthlyRate, collectionFreq, totalInterest);

  const save = async () => {
    const p = toNumber(principal);
    const periods=Number(durationValue);const parsedDate=new Date(`${startDate}T00:00:00Z`);
    if (!Number.isFinite(p)||p <= 0||p>1_000_000_000) return Alert.alert("Invalid principal", "Principal must be greater than 0 and not more than ₹1,000,000,000.");
    if (!Number.isInteger(periods)||periods<1||periods>3650) return Alert.alert("Invalid period", "Periods must be a whole number between 1 and 3650.");
    if (!rate.trim()||!Number.isFinite(monthlyRate)||monthlyRate < 0||monthlyRate>100) return Alert.alert("Invalid rate", "Monthly interest rate must be between 0 and 100 percent.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)||Number.isNaN(parsedDate.getTime())||parsedDate.toISOString().slice(0,10)!==startDate||!maturityDate) return Alert.alert("Invalid date", "Enter a real start date as YYYY-MM-DD.");
    
    setBusy(true);
    try {
      if (!product) throw new Error("No active loan product.");
      if (p < Number(product.minimumPrincipal) || p > Number(product.maximumPrincipal)) {
         throw new Error(`Principal must be between ${formatCurrency(product.minimumPrincipal)} and ${formatCurrency(product.maximumPrincipal)}`);
      }
      const createdLoan = await platformApi.loans.create({
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
        interestCollectionFrequency: collectionFreq,
        adminCollectionMonitoring
      });
      onCreated(createdLoan);
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
              <Field label="Principal Amount (₹) *" value={principal} onChangeText={v=>setPrincipal(v.replace(/[^\d.]/g,""))} keyboardType="decimal-pad" placeholder="e.g. 10000" maxLength={15}/>
              <Field label="Monthly Interest Rate (%) *" value={rate} onChangeText={v=>setRate(v.replace(/[^\d.]/g,""))} keyboardType="decimal-pad" maxLength={6}/>
              <View style={{ gap: 8 }}>
                <Text style={localStyles.metricLabel}>Loan Period Unit *</Text>
                <Segmented options={["Days", "Weeks", "Months"]} value={durationUnit} onChange={setDurationUnit} />
              </View>
              <Field label={`Number of ${durationUnit} *`} value={durationValue} onChangeText={v=>setDurationValue(v.replace(/\D/g,""))} keyboardType="number-pad" maxLength={4}/>
              <View style={{ gap: 8 }}>
                <Text style={localStyles.metricLabel}>Interest Collection *</Text>
                <Segmented options={["Daily", "Weekly", "Monthly", "AtMaturity"]} value={collectionFreq} onChange={setCollectionFreq} />
              </View>
              <Field label="Start Date *" value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" maxLength={10}/>
              <Field label="Maturity Date" value={maturityDate} editable={false} />
              <Field label="First Interest Due" value={firstDueDate} editable={false} />
              <Field label={collectionInterestLabel(collectionFreq)} value={formatCurrency(collectionInterest)} editable={false} />
              <Field label="Estimated Total Interest" value={formatCurrency(totalInterest)} editable={false} />
              <Card style={{ padding: 16, backgroundColor: colors.cyanSoft }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={{ fontFamily: fonts.medium, color: colors.muted }}>New outstanding</Text>
                  <Text style={{ fontFamily: fonts.bold, fontSize: 18, color: colors.dark }}>
                    {formatCurrency(toNumber(customer.outstanding) + principalAmount)}
                  </Text>
                </View>
              </Card>
              <Pressable onPress={() => setAdminCollectionMonitoring(value => !value)} style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, borderWidth: 1, borderColor: adminCollectionMonitoring ? colors.cyan : colors.border, borderRadius: radii.md, backgroundColor: adminCollectionMonitoring ? colors.cyanSoft : colors.white }}>
                <Ionicons name={adminCollectionMonitoring ? "checkbox" : "square-outline"} size={23} color={adminCollectionMonitoring ? colors.cyan : colors.muted} />
                <View style={{ flex: 1 }}><Text style={{ fontFamily: fonts.semibold, color: colors.dark }}>INRFS Admin collection monitoring</Text><Text style={{ fontFamily: fonts.regular, color: colors.muted, fontSize: 12, marginTop: 4 }}>Enable only if this loan should appear in the admin collection work queue.</Text></View>
              </Pressable>
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
  const [type, setType] = useState("Interest Only");
  const [method, setMethod] = useState("UPI");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const save = async () => {
    const a = toNumber(amount);
    const parsedDate=new Date(`${date}T00:00:00Z`);
    if (!Number.isFinite(a)||a <= 0 || !loanId) return Alert.alert("Invalid payment", "Select a loan and enter an amount greater than 0.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(parsedDate.getTime())||parsedDate.toISOString().slice(0,10)!==date||date>todayISO()) return Alert.alert("Invalid date", "Payment date must be a real date that is not in the future.");
    if(reference.trim().length>100)return Alert.alert("Invalid reference","Transaction reference cannot exceed 100 characters.");
    if(notes.trim().length>1000)return Alert.alert("Invalid notes","Notes cannot exceed 1000 characters.");
    
    setBusy(true);
    try {
      const modeMap: any = { PhonePe: 'Upi', 'Google Pay': 'Upi', UPI: 'Upi', 'Bank Transfer': 'BankTransfer' };
      await platformApi.payments.record({
        loanId,
        paymentScheduleId: null,
        amount: a,
        receivedAt: new Date(`${date || todayISO()}T12:00:00`).toISOString(),
        mode: modeMap[method] || method,
        paymentType: type === "Interest Only" ? "InterestOnly" : type === "Full Settlement" ? "FullSettlement" : "Regular",
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
                    <Segmented options={activeLoans.map((l: any) => l.loanNumber || l.displayId || l.id)} value={activeLoans.find((l: any) => l.id === loanId)?.loanNumber || activeLoans.find((l: any) => l.id === loanId)?.displayId || activeLoans.find((l: any) => l.id === loanId)?.id} onChange={(v) => { const l = activeLoans.find((al: any) => (al.loanNumber || al.displayId || al.id) === v); if (l) setLoanId(l.id); }} />
                  </View>
                  <Field label="Payment Date *" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" maxLength={10}/>
                  <Field label="Amount Received (₹) *" value={amount} onChangeText={v=>setAmount(v.replace(/[^\d.]/g,""))} keyboardType="decimal-pad" maxLength={15}/>
                  <View style={{ gap: 8 }}>
                    <Text style={localStyles.metricLabel}>Payment Type</Text>
                    <Segmented options={["Interest Only", "Regular", "Full Settlement"]} value={type} onChange={setType} />
                  </View>
                  <View style={{ gap: 8 }}>
                    <Text style={localStyles.metricLabel}>Payment Method</Text>
                    <Segmented options={["UPI", "Cash", "Bank Transfer", "Cheque"]} value={method} onChange={setMethod} />
                  </View>
                  <Field label="Transaction Reference" value={reference} onChangeText={setReference} maxLength={100}/>
                  <Field label="Notes" value={notes} onChangeText={setNotes} multiline maxLength={1000}/>

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
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [gender, setGender] = useState("");
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
  const [otherDocuments, setOtherDocuments] = useState<any>(null);
  const [citySuggestions, setCitySuggestions] = useState<AddressMatch[]>([]);
  const [stateSuggestions, setStateSuggestions] = useState<AddressMatch[]>([]);
  const [pinLookupMessage, setPinLookupMessage] = useState("");
  const [pinResolvedAddress, setPinResolvedAddress] = useState<AddressMatch | null>(null);

  const formForValidation = { name, phone, email, dob, gender, houseNumber, street, area, city, stateName, pinCode, aadhaar, pan };
  const maximumBirthDate = useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 18);
    return date;
  }, []);
  const selectedBirthDate = dob ? new Date(`${dob}T12:00:00`) : new Date(1990, 0, 1);
  const selectBirthDate = (_event: DateTimePickerEvent, date?: Date) => {
    setShowDobPicker(false);
    if (!date) return;
    setDob(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`);
  };

  const next = (targetStep: number) => {
    const error = validateCustomerStep(step, formForValidation);
    if (error) return Alert.alert("Check customer details", error);
    setStep(targetStep);
  };

  const updateCity = (value: string) => {
    setCity(value);
    setCitySuggestions(suggestAddresses(value, "city"));
    setStateSuggestions([]);
  };
  const updateState = (value: string) => {
    setStateName(value);
    setStateSuggestions(suggestAddresses(value, "state"));
    setCitySuggestions([]);
  };
  const updatePinCode = async (value: string) => {
    const digits = value.replace(/\D/g, "");
    setPinCode(digits);
    if (digits.length < 6 && pinResolvedAddress) {
      setCity(current => current === pinResolvedAddress.city ? "" : current);
      setStateName(current => current === pinResolvedAddress.state ? "" : current);
      setPinResolvedAddress(null);
    }
    setPinLookupMessage(digits.length === 6 ? "Looking up PIN…" : "");
    const match = await resolveAddressByPin(digits);
    if (match) {
      setPinResolvedAddress(match);
      setCity(match.city);
      setStateName(match.state);
      setCitySuggestions([]);
      setStateSuggestions([]);
      setPinLookupMessage("");
    } else if (digits.length === 6) {
      setPinLookupMessage("PIN not found. Enter city and state manually.");
    }
  };
  const selectCity = (match: AddressMatch) => {
    setCity(match.city);
    setStateName(match.state);
    setCitySuggestions([]);
  };
  const selectState = (match: AddressMatch) => {
    setStateName(match.state);
    setStateSuggestions([]);
  };

  const save = async () => {
    for (const validationStep of [1, 2, 3]) {
      const error = validateCustomerStep(validationStep, formForValidation);
      if (error) return Alert.alert("Check customer details", error);
    }
    if (!aadhaarDoc || !panDoc || !addressProof || !photograph) {
      return Alert.alert("Required documents", "Upload Aadhaar, PAN, address proof, and photograph before saving the customer.");
    }
    setBusy(true);
    try {
      const mobile = normalizeIndianMobile(phone);
      const created = await platformApi.customers.create({
        fullName: name.trim(),
        dateOfBirth: dob || null,
        gender,
        phone: mobile,
        email: email.trim().toLowerCase() || null,
        addressLine1: [houseNumber.trim(), street.trim()].filter(Boolean).join(', ') || area.trim(),
        addressLine2: area.trim() || null,
        city: city.trim(),
        state: stateName.trim(),
        postalCode: pinCode.trim(),
        aadhaar: aadhaar.replace(/\D/g, '') || null,
        pan: pan.trim().toUpperCase() || null
      });
      const uploads = [[aadhaarDoc, "Aadhaar"], [panDoc, "Pan"], [addressProof, "AddressProof"], [photograph, "Photograph"], [otherDocuments, "Other"]].filter(([doc]) => doc !== null);
      await Promise.all(uploads.map(([doc, category]) => uploadPickedDocument(doc, category as string, { customerId: created.id })));
      await onSaved();
    } catch (e) {
      Alert.alert("Customer not saved", e instanceof Error ? e.message : "Error saving");
    } finally {
      setBusy(false);
    }
  };

  const chooseDocumentSource = (label: string, setter: (value: any) => void, fileType = "*/*") => Alert.alert(label, "Choose how to add this document.", [
    { text: "Camera", onPress: () => void (async () => { try { const document = await takePhoto(label === "Photograph"); if (document) setter(document); } catch (error) { Alert.alert("Camera unavailable", error instanceof Error ? error.message : "Could not open the camera."); } })() },
    { text: "Folder / Files", onPress: () => void (async () => { try { const document = await pickDocument(fileType); if (document) setter(document); } catch { Alert.alert("Picker Error", "Could not select the document."); } })() },
    { text: "Cancel", style: "cancel" },
  ]);

  return (
    <Screen>
      <Header title={`Add Customer (Step ${step}/4)`} action={<Button label="Cancel" variant="ghost" onPress={onCancel} />} />
      <ScrollView contentContainerStyle={{ paddingBottom: 100, gap: 16 }}>
        {step === 1 && (
          <Card>
            <Text style={{ fontFamily: fonts.bold, fontSize: 16, marginBottom: 12 }}>Personal Information</Text>
            <View style={{ gap: 16 }}>
              <Field label="Full name *" value={name} onChangeText={setName} maxLength={100} />
              <Field label="Mobile *" value={phone} onChangeText={value => setPhone(value.replace(/\D/g, ""))} keyboardType="phone-pad" maxLength={10} />
              <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" maxLength={254} />
              <View style={{ gap: 7 }}>
                <Text style={localStyles.dateLabel}>Date of birth *</Text>
                <Pressable onPress={() => setShowDobPicker(true)} style={({ pressed }) => [localStyles.datePickerField, pressed && { opacity: 0.75 }]}>
                  <Text style={[localStyles.datePickerText, !dob && { color: colors.subtle }]}>{dob || "Select date of birth"}</Text>
                  <Ionicons name="calendar-outline" size={21} color={colors.cyan} />
                </Pressable>
                {showDobPicker ? <DateTimePicker value={selectedBirthDate} mode="date" display={Platform.OS === "ios" ? "spinner" : "calendar"} minimumDate={new Date(1900, 0, 1)} maximumDate={maximumBirthDate} onChange={selectBirthDate} /> : null}
              </View>
              <View style={{ gap: 8 }}><Text style={localStyles.metricLabel}>Gender</Text><Segmented options={["Male", "Female", "Other"]} value={gender} onChange={setGender} /></View>
            </View>
            <Button label="Next: Address" onPress={() => next(2)} style={{ marginTop: 20 }} />
          </Card>
        )}
        {step === 2 && (
          <Card>
            <Text style={{ fontFamily: fonts.bold, fontSize: 16, marginBottom: 12 }}>Address Details</Text>
            <View style={{ gap: 16 }}>
              <Field label="House Number" value={houseNumber} onChangeText={setHouseNumber} />
              <Field label="Street" value={street} onChangeText={setStreet} />
              <Field label="Area/Village" value={area} onChangeText={setArea} />
              <Field label="City *" value={city} onChangeText={updateCity} maxLength={100} />
              {citySuggestions.length > 0 ? <View style={localStyles.suggestions}>{citySuggestions.map(match => <Pressable key={`${match.pin}-${match.city}`} onPress={() => selectCity(match)} style={localStyles.suggestion}><Text style={localStyles.suggestionText}>{match.city}, {match.state} · {match.pin}</Text></Pressable>)}</View> : null}
              <Field label="State *" value={stateName} onChangeText={updateState} maxLength={100} />
              {stateSuggestions.length > 0 ? <View style={localStyles.suggestions}>{stateSuggestions.map(match => <Pressable key={`${match.pin}-${match.state}`} onPress={() => selectState(match)} style={localStyles.suggestion}><Text style={localStyles.suggestionText}>{match.state} · {match.city}</Text></Pressable>)}</View> : null}
              <Field label="PIN Code *" value={pinCode} onChangeText={value => void updatePinCode(value)} keyboardType="number-pad" maxLength={6} />
              {pinLookupMessage ? <Text style={{ color: colors.muted, fontSize: 12 }}>{pinLookupMessage}</Text> : null}
            </View>
            <View style={{ flexDirection: "row", marginTop: 20, gap: 12 }}>
              <Button style={{ flex: 1 }} label="Back" variant="secondary" onPress={() => setStep(1)} />
              <Button style={{ flex: 1 }} label="Next: KYC" onPress={() => next(3)} />
            </View>
          </Card>
        )}
        {step === 3 && (
          <Card>
            <Text style={{ fontFamily: fonts.bold, fontSize: 16, marginBottom: 12 }}>KYC Details</Text>
            <View style={{ gap: 16 }}>
              <Field label="Aadhaar Number" value={aadhaar} onChangeText={value => setAadhaar(value.replace(/\D/g, ""))} keyboardType="number-pad" maxLength={12} />
              <Field label="PAN" value={pan} onChangeText={value => setPan(value.replace(/\s/g, "").toUpperCase())} autoCapitalize="characters" maxLength={10} />
            </View>
            <View style={{ flexDirection: "row", marginTop: 20, gap: 12 }}>
              <Button style={{ flex: 1 }} label="Back" variant="secondary" onPress={() => setStep(2)} />
              <Button style={{ flex: 1 }} label="Next: Documents" onPress={() => next(4)} />
            </View>
          </Card>
        )}
        {step === 4 && (
          <Card>
            <Text style={{ fontFamily: fonts.bold, fontSize: 16, marginBottom: 12 }}>KYC Documents</Text>
            <View style={{ gap: 16 }}>
              <Text style={{ color: colors.muted }}>Aadhaar, PAN, address proof, and photograph are required. Other documents are optional.</Text>
              <Button label={aadhaarDoc ? `Selected: ${aadhaarDoc.name}` : "Select Aadhaar Document *"} variant="secondary" onPress={() => chooseDocumentSource("Aadhaar Document", setAadhaarDoc)} />
              <Button label={panDoc ? `Selected: ${panDoc.name}` : "Select PAN Document *"} variant="secondary" onPress={() => chooseDocumentSource("PAN Document", setPanDoc)} />
              <Button label={addressProof ? `Selected: ${addressProof.name}` : "Select Address Proof *"} variant="secondary" onPress={() => chooseDocumentSource("Address Proof", setAddressProof)} />
              <Button label={photograph ? `Selected: ${photograph.name}` : "Select Photograph *"} variant="secondary" onPress={() => chooseDocumentSource("Photograph", setPhotograph, "image/*")} />
              <Button label={otherDocuments ? `Selected: ${otherDocuments.name}` : "Select Other Document (Optional)"} variant="secondary" onPress={() => chooseDocumentSource("Other Document", setOtherDocuments)} />
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
  metricValue: { color: colors.dark, fontFamily: fonts.bold, fontSize: 14 },
  dateLabel: { color: colors.dark, fontFamily: fonts.semibold, fontSize: 13 },
  datePickerField: { minHeight: 54, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.white, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  suggestions: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, overflow: "hidden" },
  suggestion: { paddingHorizontal: 14, paddingVertical: 12, backgroundColor: colors.white, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  suggestionText: { color: colors.dark, fontFamily: fonts.medium, fontSize: 13 },
  datePickerText: { color: colors.dark, fontFamily: fonts.regular, fontSize: 14 }
});
