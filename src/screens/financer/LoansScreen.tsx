import React, { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, ScrollView, Text, View, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, DataRow, Field, Header, Screen, Segmented } from "../../components/ui";
import { pageItems, platformApi } from "../../services/platformApi";
import { RemoteState, useRemote } from "./shared";
import { s } from "./styles";
import { Ionicons } from "../../components/AppIcon";
import { colors, fonts } from "../../theme/tokens";

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
  const [isAdding, setIsAdding] = useState(false);

  const rows = useMemo(() => {
    return state.data.loans.filter((x: any) => {
      const matchSearch = `${x.loanNumber} ${x.customerName ?? x.customerId}`.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "All" || x.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [state.data.loans, search, statusFilter]);

  if (isAdding) {
    return <AddLoanWizard 
      customers={state.data.customers} 
      products={state.data.products} 
      onCancel={() => setIsAdding(false)} 
      onSaved={async () => { setIsAdding(false); await state.refresh(); }} 
    />;
  }

  return (
    <Screen>
      <Header 
        title="Loans" 
        subtitle="Applications, schedules and balances" 
        action={<Button label="New Loan" icon="add" onPress={() => setIsAdding(true)}/>}
      />
      <View style={s.gap}>
        <Field label="Search" value={search} onChangeText={setSearch} placeholder="Loan number, Customer name"/>
        <Segmented options={["All", "Active", "Closed", "Overdue"]} value={statusFilter} onChange={setStatusFilter}/>
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
                <Text style={s.title}>{x.loanNumber}</Text>
                <Text style={s.meta}>{x.customerName ?? x.customerId}</Text>
              </View>
              <View>
                <Text style={s.balance}>{rupees(x.principalOutstanding ?? x.principal)}</Text>
                <Text style={[s.meta, { textAlign: "right" }]}>{x.status}</Text>
              </View>
            </View>
            <View style={[s.row, { marginTop: 12 }]}>
              <Button style={s.flex} label="View Schedule" variant="secondary" onPress={() => Alert.alert("Schedule", "Routing to schedule view...")}/>
            </View>
          </Card>
        )}
      />
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
  const totalDays = dateDays(startDate, maturityDate);
  const estimatedTotalInterest = (Number(principal) * Number(rate) / 100 * 12 * totalDays) / 365;

  const save = async () => {
    if (!customerId || !principal || !duration) {
      return Alert.alert("Missing Fields", "Please select a customer and enter loan details.");
    }
    setBusy(true);
    try {
      await platformApi.loans.create({
        customerId,
        loanProductId: product?.id,
        principal: Number(principal),
        annualInterestRate: Number(rate),
        tenureMonths: durationUnit === "Months" ? Number(duration) : Math.max(1, Math.round(Number(duration) / 30)),
        startDate,
        durationValue: Number(duration),
        durationUnit,
        interestRate: Number(rate),
        interestRateBasis: "PerMonth",
        interestCollectionFrequency: frequency
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
      <Header title="Create Loan" action={<Button label="Cancel" variant="ghost" onPress={onCancel}/>}/>
      <ScrollView contentContainerStyle={s.gap}>
        <Card>
          <Text style={s.label}>Customer</Text>
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
            <Field label="Principal Amount (₹)" value={principal} onChangeText={setPrincipal} keyboardType="number-pad"/>
            <Field label="Interest Rate (% per month)" value={rate} onChangeText={setRate} keyboardType="decimal-pad"/>
            
            <View>
              <Text style={s.label}>Duration Unit</Text>
              <Segmented options={["Days", "Weeks", "Months"]} value={durationUnit} onChange={setDurationUnit}/>
            </View>
            <Field label="Duration Value" value={duration} onChangeText={setDuration} keyboardType="number-pad"/>
            
            <View>
              <Text style={s.label}>Collection Frequency</Text>
              <Segmented options={["Daily", "Weekly", "Monthly", "AtMaturity"]} value={frequency} onChange={setFrequency}/>
            </View>
            
            <Field label="Start Date" value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" />
          </View>
        </Card>
        
        <Card style={{ backgroundColor: `${colors.cyan}10` }}>
          <Text style={s.label}>Estimated Calculations</Text>
          <DataRow title="Maturity Date" amount={maturityDate || "-"} />
          <DataRow title="Total Duration" amount={`${totalDays} days`} />
          <DataRow title="Total Interest" amount={rupees(estimatedTotalInterest)} />
        </Card>
        
        <Button label="Create Loan Application" loading={busy} onPress={() => void save()}/>
      </ScrollView>

      {/* Customer Selector Modal */}
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
