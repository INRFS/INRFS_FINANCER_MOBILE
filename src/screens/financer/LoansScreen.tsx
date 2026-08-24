import React, { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, ScrollView, Text, View, Modal, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, DataRow, Field, Header, Screen, Segmented, KpiCard, Grid, Badge } from "../../components/ui";
import { pageItems, platformApi } from "../../services/platformApi";
import { RemoteState, useRemote } from "./shared";
import { s } from "./styles";
import { Ionicons } from "../../components/AppIcon";
import { colors, fonts } from "../../theme/tokens";
import { interestForDays, rateForDays, monthlyPeriodDays, formatInterestAmount } from "./loanInterest";

const rupees = (v: unknown) => `₹${Number(v ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const dateOnly = () => new Date().toISOString().slice(0, 10);

const addLoanDuration = (startDate: string, value: string, unit: string) => {
  if (!startDate || Number(value) <= 0) return '';
  const parts = startDate.split('-');
  if (parts.length !== 3) return '';
  const [year, month, day] = parts.map(Number) as [number, number, number];
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

const dateDays = (from: string, to: string) => from && to ? Math.round((new Date(`${to}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime()) / 86400000) : 0;
const firstInterestDue = (form: any, maturity: string) => {
  const candidate = form.interestFrequency === 'Daily' ? addLoanDuration(form.dateGiven, "1", 'Days')
    : form.interestFrequency === 'Weekly' ? addLoanDuration(form.dateGiven, "1", 'Weeks')
      : form.interestFrequency === 'Monthly' ? addLoanDuration(form.dateGiven, "1", 'Months') : maturity;
  return candidate && maturity && candidate < maturity ? candidate : maturity;
};

export function LoansScreen() {
  const load = useCallback(async () => {
    const [loans, customers, products] = await Promise.all([
      platformApi.loans.all(), 
      platformApi.customers.all(), 
      platformApi.loans.products()
    ]);
    return { loans: pageItems(loans), customers: pageItems(customers), products: pageItems(products) };
  }, []);
  
  const state = useRemote(load, { loans: [], customers: [], products: [] } as any);
  
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All Types");
  
  const [isAdding, setIsAdding] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<any>(null);

  const rows = useMemo(() => {
    return state.data.loans.filter((x: any) => {
      const matchSearch = `${x.loanNumber} ${x.customerName ?? x.customerId}`.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "All" || x.status === statusFilter;
      const xType = x.type || x.collectionType || "";
      const matchType = typeFilter === "All Types" || xType === typeFilter;
      return matchSearch && matchStatus && matchType;
    });
  }, [state.data.loans, search, statusFilter, typeFilter]);

  const activeLoansCount = state.data.loans.filter((x: any) => x.status === "Active").length;
  const closedLoansCount = state.data.loans.filter((x: any) => x.status === "Closed").length;
  const overdueLoansCount = state.data.loans.filter((x: any) => x.status === "Overdue").length;

  return (
    <Screen>
      <Header 
        title="Loans" 
        subtitle="Manage and track all loan accounts." 
        action={<Button label="New Loan" icon="add" onPress={() => setIsAdding(true)}/>}
      />

      <Grid>
        <KpiCard label="Total Loans" value={String(state.data.loans.length)} icon="cash-outline" accent="cyan" />
        <KpiCard label="Active Loans" value={String(activeLoansCount)} icon="checkmark-circle" accent="green" />
        <KpiCard label="Closed Loans" value={String(closedLoansCount)} icon="time-outline" accent="cyan" />
        <KpiCard label="Overdue Loans" value={String(overdueLoansCount)} icon="warning-outline" accent="error" />
      </Grid>

      <View style={s.gap}>
        <Field label="Search" value={search} onChangeText={setSearch} placeholder="Search loan ID or customer..."/>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, paddingHorizontal: 20 }}>
          <View style={{ flexDirection: "row", gap: 8, paddingRight: 40 }}>
            <Segmented options={["All", "Active", "Due", "Overdue", "Closed"]} value={statusFilter} onChange={setStatusFilter}/>
            <Segmented options={["All Types", "Daily Collection", "Weekly Collection", "Monthly Interest"]} value={typeFilter} onChange={setTypeFilter}/>
          </View>
        </ScrollView>
      </View>
      
      <RemoteState {...state} retry={() => void state.refresh()}/>
      
      <FlatList
        data={rows}
        keyExtractor={x => x.id}
        contentContainerStyle={{ paddingBottom: 80, gap: 14, paddingTop: 14 }}
        renderItem={({ item: x }) => (
          <Card>
            <View style={s.between}>
              <View style={s.flex}>
                <Text style={[s.title, { color: colors.cyan }]}>{x.loanNumber ?? x.id}</Text>
                <Text style={s.meta}>{x.customerName ?? x.customerId}</Text>
                {(x.type || x.collectionType) && <Text style={[s.meta, { fontSize: 11 }]}>{x.type || x.collectionType}</Text>}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Badge status={x.status || 'Active'} />
              </View>
            </View>

            <View style={[s.row, { marginTop: 12, justifyContent: 'space-between' }]}>
              <View>
                <Text style={s.meta}>Principal</Text>
                <Text style={s.balance}>{rupees(x.principal)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={s.meta}>Outstanding</Text>
                <Text style={[s.balance, { color: colors.cyan }]}>{rupees(x.principalOutstanding ?? x.principal)}</Text>
              </View>
            </View>

            <View style={[s.row, { marginTop: 8, justifyContent: 'space-between' }]}>
              <View>
                <Text style={s.meta}>Interest Rate</Text>
                <Text style={s.label}>{x.interestRate}%</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={s.meta}>Next Due</Text>
                <Text style={s.label}>{x.nextDue || "No upcoming due"}</Text>
              </View>
            </View>

            <View style={[s.row, { marginTop: 12 }]}>
              <Button style={s.flex} label="View Details" variant="secondary" icon="eye-outline" onPress={() => setSelectedLoan(x)}/>
            </View>
          </Card>
        )}
      />

      <Modal visible={selectedLoan !== null} animationType="slide" onRequestClose={() => setSelectedLoan(null)}>
        {selectedLoan && (
          <Screen>
            <Header 
              title={selectedLoan.loanNumber ?? selectedLoan.id} 
              subtitle={selectedLoan.customerName ?? selectedLoan.customerId} 
              action={<Badge status={selectedLoan.status || "Active"} />} 
            />
            <ScrollView contentContainerStyle={s.gap}>
              <Card>
                <Text style={s.label}>Loan Summary</Text>
                <DataRow title="Principal Amount" amount={rupees(selectedLoan.principal)} />
                <DataRow title="Outstanding Balance" amount={rupees(selectedLoan.principalOutstanding ?? selectedLoan.principal)} />
                <DataRow title="Interest Scheme" amount={`${selectedLoan.interestRate}%`} />
                <DataRow title="Collection Type" amount={selectedLoan.type || selectedLoan.collectionType || "-"} />
                <DataRow title="Payment Method" amount={selectedLoan.paymentMethod || "-"} />
                <DataRow title="Date Given" amount={selectedLoan.dateGiven || selectedLoan.startDate || "-"} />
                <DataRow title="Status" amount={selectedLoan.status || "Active"} />
              </Card>
              <Button label="Close" onPress={() => setSelectedLoan(null)} />
            </ScrollView>
          </Screen>
        )}
      </Modal>

      <Modal visible={isAdding} animationType="slide" onRequestClose={() => setIsAdding(false)}>
        <AddLoanWizard 
          customers={state.data.customers} 
          products={state.data.products} 
          onCancel={() => setIsAdding(false)} 
          onSaved={async () => { setIsAdding(false); await state.refresh(); }} 
        />
      </Modal>

    </Screen>
  );
}

function AddLoanWizard({ customers, products, onCancel, onSaved }: { customers: any[], products: any[], onCancel: () => void, onSaved: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [principal, setPrincipal] = useState("10000");
  const [rate, setRate] = useState("18");
  const [duration, setDuration] = useState("12");
  const [durationUnit, setDurationUnit] = useState("Months");
  const [frequency, setFrequency] = useState("Monthly");
  const [startDate, setStartDate] = useState(dateOnly());

  const product = products.find((x: any) => x.isActive !== false) ?? products[0];
  const [isCustomerSelectorOpen, setIsCustomerSelectorOpen] = useState(false);
  
  const customerName = customers.find(x => x.id === customerId)?.fullName || "Select a customer";

  // Calculations mirroring web
  const maturityDate = addLoanDuration(startDate, duration, durationUnit);
  
  const amountNum = Number(principal) || 0;
  const rateNum = Number(rate) || 0;
  const monthlyDays = monthlyPeriodDays(startDate);

  const dailyRate = rateForDays(rateNum, 1);
  const weeklyRate = rateForDays(rateNum, 7);
  const monthlyRate = rateForDays(rateNum, monthlyDays);

  const dailyAmount = interestForDays(amountNum, rateNum, 1);
  const weeklyAmount = interestForDays(amountNum, rateNum, 7);
  const monthlyAmount = interestForDays(amountNum, rateNum, monthlyDays);

  const totalDays = dateDays(startDate, maturityDate);
  const estimatedTotalInterest = interestForDays(amountNum, rateNum, totalDays);
  
  const firstDue = firstInterestDue({ interestFrequency: frequency, dateGiven: startDate }, maturityDate);

  const save = async () => {
    if (!customerId || !principal || !duration || Number(principal) <= 0 || Number(duration) <= 0) {
      return Alert.alert("Missing Fields", "Please select a customer and enter valid loan details.");
    }
    if (!product) {
      return Alert.alert("No Product", "No active loan product is configured.");
    }
    setBusy(true);
    try {
      await platformApi.loans.create({
        customerId,
        loanProductId: product?.id,
        principal: Number(principal),
        annualInterestRate: Number(rate),
        interestRate: Number(rate),
        interestRateBasis: "PerMonth",
        interestCollectionFrequency: frequency,
        tenureMonths: durationUnit === "Months" ? Number(duration) : Math.max(product.minimumTenureMonths || 1, 1),
        durationValue: Number(duration),
        durationUnit,
        startDate,
      });
      await onSaved();
    } catch (e) {
      Alert.alert("Failed to create loan", e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Header title="Create New Loan" subtitle="Add a new loan account" action={<Button label="Cancel" variant="ghost" onPress={onCancel}/>}/>
      <ScrollView contentContainerStyle={s.gap}>
        <Card>
          <Text style={s.label}>Customer *</Text>
          <Button 
            variant="secondary" 
            label={customerName} 
            icon="people-outline"
            onPress={() => setIsCustomerSelectorOpen(true)} 
          />
        </Card>
        
        <Card>
          <Text style={s.label}>Loan Details</Text>
          <View style={s.gap}>
            <Field label="Principal Amount (₹) *" value={principal} onChangeText={setPrincipal} keyboardType="number-pad"/>
            <Field label="Interest Rate (% per month) *" value={rate} onChangeText={setRate} keyboardType="decimal-pad"/>
            
            <View>
              <Text style={s.label}>Duration Unit *</Text>
              <Segmented options={["Days", "Weeks", "Months"]} value={durationUnit} onChange={setDurationUnit}/>
            </View>
            <Field label="Duration Value *" value={duration} onChangeText={setDuration} keyboardType="number-pad"/>
            
            <View>
              <Text style={s.label}>Collection Frequency *</Text>
              <Segmented options={["Daily", "Weekly", "Monthly", "AtMaturity"]} value={frequency} onChange={setFrequency}/>
            </View>
            
            <Field label="Start Date *" value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" />
          </View>
        </Card>

        <Card>
          <Text style={s.label}>Interest Preview</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, paddingHorizontal: 20, paddingTop: 10 }}>
            <View style={{ flexDirection: "row", gap: 10, paddingRight: 40 }}>
              <View style={[styles.previewCard, frequency === "Daily" && styles.previewCardSelected]}>
                <Text style={styles.previewMeta}>Daily @ {(dailyRate % 1 === 0 ? dailyRate : dailyRate.toFixed(2))}%</Text>
                <Text style={styles.previewAmount}>{formatInterestAmount(dailyAmount)} <Text style={styles.previewSmall}>/Day</Text></Text>
              </View>
              <View style={[styles.previewCard, frequency === "Weekly" && styles.previewCardSelected]}>
                <Text style={styles.previewMeta}>Weekly @ {(weeklyRate % 1 === 0 ? weeklyRate : weeklyRate.toFixed(2))}%</Text>
                <Text style={styles.previewAmount}>{formatInterestAmount(weeklyAmount)} <Text style={styles.previewSmall}>/Week</Text></Text>
              </View>
              <View style={[styles.previewCard, frequency === "Monthly" && styles.previewCardSelected]}>
                <Text style={styles.previewMeta}>Monthly @ {(monthlyRate % 1 === 0 ? monthlyRate : monthlyRate.toFixed(2))}%</Text>
                <Text style={styles.previewAmount}>{formatInterestAmount(monthlyAmount)} <Text style={styles.previewSmall}>/Month</Text></Text>
              </View>
            </View>
          </ScrollView>
        </Card>
        
        <Card style={{ backgroundColor: `${colors.cyan}10` }}>
          <Text style={s.label}>Calculated Details</Text>
          <DataRow title="Maturity Date" amount={maturityDate || "-"} />
          <DataRow title="First Interest Due" amount={firstDue || "-"} />
          <DataRow title="Estimated Total Interest" amount={formatInterestAmount(estimatedTotalInterest)} />
        </Card>
        
        <Button label="Create Loan" loading={busy} onPress={() => void save()}/>
      </ScrollView>

      <Modal visible={isCustomerSelectorOpen} transparent animationType="slide" onRequestClose={() => setIsCustomerSelectorOpen(false)}>
        <View style={s.overlay}>
          <SafeAreaView edges={["bottom", "top"]} style={s.sheet}>
            <View style={s.between}>
              <Text style={s.sheetTitle}>Select Customer</Text>
              <Pressable onPress={() => setIsCustomerSelectorOpen(false)}><Ionicons name="close" size={25} /></Pressable>
            </View>
            <FlatList
              data={customers}
              keyExtractor={x => x.id}
              contentContainerStyle={{ padding: 20, gap: 10 }}
              renderItem={({ item }) => (
                <Pressable style={{ padding: 15, backgroundColor: "#f8fafc", borderRadius: 10, borderWidth: 1, borderColor: "#e2e8f0" }} onPress={() => {
                  setCustomerId(item.id);
                  setIsCustomerSelectorOpen(false);
                }}>
                  <Text style={{ fontFamily: fonts.semibold, fontSize: 16 }}>{item.fullName}</Text>
                  <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.muted }}>{item.phone} · {item.customerNumber}</Text>
                </Pressable>
              )}
            />
          </SafeAreaView>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  previewCard: {
    minWidth: 140,
    minHeight: 65,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: "#f9fbfd",
    justifyContent: "center",
  },
  previewCardSelected: {
    borderColor: colors.cyan,
    backgroundColor: `${colors.cyan}10`,
  },
  previewMeta: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 11,
    marginBottom: 4,
  },
  previewAmount: {
    color: colors.dark,
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  previewSmall: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 10,
  }
});
