import React, { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { Button, Card, DataRow, Field, Header, Screen, Segmented } from "../../components/ui";
import { pageItems, platformApi } from "../../services/platformApi";
import { RemoteState, useRemote } from "./shared";
import { s } from "./styles";

const rupees = (v: unknown) => `₹${Number(v ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const dateOnly = () => new Date().toISOString().slice(0, 10);

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
        contentContainerStyle={{ paddingBottom: 80 }}
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

  const product = products.find((x: any) => x.isActive !== false) ?? products[0];

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
        tenureMonths: durationUnit === "Months" ? Number(duration) : Number(duration) / 30, // Rough translation
        startDate: dateOnly(),
        durationValue: Number(duration),
        durationUnit,
        interestRate: Number(rate),
        interestRateBasis: "PerAnnum",
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
          <Text style={s.label}>Customer Selection</Text>
          <Segmented 
            options={customers.slice(0, 3).map(x => x.fullName) /* Simplification for layout space */} 
            value={customers.find(x => x.id === customerId)?.fullName ?? ""} 
            onChange={v => setCustomerId(customers.find(x => x.fullName === v)?.id ?? "")}
          />
          {customers.length > 3 && <Text style={s.meta}>...and {customers.length - 3} more (Search not fully wired in stub)</Text>}
        </Card>
        <Card>
          <Text style={s.label}>Loan Details</Text>
          <View style={s.gap}>
            <Field label="Principal Amount (₹)" value={principal} onChangeText={setPrincipal} keyboardType="number-pad"/>
            <Field label="Interest Rate (%)" value={rate} onChangeText={setRate} keyboardType="decimal-pad"/>
            
            <Text style={s.meta}>Duration Unit</Text>
            <Segmented options={["Days", "Weeks", "Months"]} value={durationUnit} onChange={setDurationUnit}/>
            <Field label="Duration Value" value={duration} onChangeText={setDuration} keyboardType="number-pad"/>
            
            <Text style={s.meta}>Collection Frequency</Text>
            <Segmented options={["Daily", "Weekly", "Monthly", "AtMaturity"]} value={frequency} onChange={setFrequency}/>
          </View>
          <Text style={[s.meta, { marginTop: 10 }]}>Calculations for interest based on {rate}% per annum will be evaluated server-side.</Text>
        </Card>
        <Button label="Create Loan Application" loading={busy} onPress={() => void save()}/>
      </ScrollView>
    </Screen>
  );
}
