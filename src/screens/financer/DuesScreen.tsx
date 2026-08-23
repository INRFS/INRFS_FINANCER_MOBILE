import React, { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, ScrollView, Text, View } from "react-native";
import { Button, Card, Field, Header, Screen, Segmented } from "../../components/ui";
import { pageItems, platformApi } from "../../services/platformApi";
import { RemoteState, useRemote } from "./shared";
import { s } from "./styles";

const rupees = (v: unknown) => `₹${Number(v ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const dateOnly = () => new Date().toISOString().slice(0, 10);

export function DuesScreen() {
  const load = useCallback(() => platformApi.payments.allSchedules(), []); 
  const state = useRemote(load, { items: [] } as any); 
  
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  
  const [selected, setSelected] = useState<any>(null);
  const [actionKind, setActionKind] = useState<"payment" | "reschedule" | null>(null);

  const rows = useMemo(() => {
    return pageItems(state.data).filter((x: any) => {
      const q = search.toLowerCase();
      const matchSearch = !q || `${x.customerName} ${x.loanNumber}`.toLowerCase().includes(q);
      const matchStatus = statusFilter === "All" || x.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [state.data, search, statusFilter]);

  if (actionKind) {
    return <ActionWizard 
      item={selected} 
      kind={actionKind} 
      onCancel={() => setActionKind(null)} 
      onSaved={async () => { setActionKind(null); await state.refresh(); }} 
    />;
  }

  return (
    <Screen>
      <Header title="Payments & Dues" subtitle="Manage schedules and record payments" action={<Button label="Refresh" variant="ghost" onPress={() => void state.refresh()}/>}/>
      
      <View style={s.gap}>
        <Field label="Search" value={search} onChangeText={setSearch} placeholder="Customer name, loan number"/>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Segmented 
            options={["All", "Pending", "Overdue", "Success", "Partial"]} 
            value={statusFilter} 
            onChange={setStatusFilter}
          />
        </ScrollView>
      </View>

      <RemoteState {...state} retry={() => void state.refresh()}/>

      <FlatList
        data={rows}
        keyExtractor={x => x.id}
        contentContainerStyle={{ paddingBottom: 80 }}
        renderItem={({ item: x }) => {
          const isSettled = x.status === "Success" || x.status === "Paid";
          return (
            <Card>
              <View style={s.between}>
                <View style={s.flex}>
                  <Text style={s.title}>{x.customerName ?? "Unknown Customer"}</Text>
                  <Text style={s.meta}>{x.loanNumber} · Due {String(x.dueDate).slice(0, 10)}</Text>
                </View>
                <View>
                  <Text style={s.balance}>{rupees(x.amountDue ?? x.interestDue ?? x.outstandingAmount)}</Text>
                  <Text style={[s.meta, { textAlign: "right" }]}>{x.status}</Text>
                </View>
              </View>
              
              {!isSettled && (
                <View style={[s.row, { marginTop: 12 }]}>
                  <Button style={s.flex} label="Record Payment" onPress={() => { setSelected(x); setActionKind("payment"); }}/>
                  <Button style={s.flex} label="Reschedule" variant="secondary" onPress={() => { setSelected(x); setActionKind("reschedule"); }}/>
                </View>
              )}
            </Card>
          );
        }}
      />
    </Screen>
  );
}

function ActionWizard({ item, kind, onCancel, onSaved }: { item: any, kind: "payment" | "reschedule", onCancel: () => void, onSaved: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  
  // Payment fields
  const [amount, setAmount] = useState(String(item.amountDue ?? item.outstandingAmount ?? ""));
  const [method, setMethod] = useState("Cash");
  const [notes, setNotes] = useState("");
  
  // Reschedule fields
  const [date, setDate] = useState(dateOnly());
  const [reason, setReason] = useState("");

  const submit = async () => {
    setBusy(true);
    try {
      if (kind === "payment") {
        await platformApi.payments.record({ 
          loanId: item.loanId, 
          paymentScheduleId: item.id, 
          amount: Number(amount), 
          receivedAt: new Date().toISOString(), 
          mode: method, 
          externalReference: null, 
          notes: notes.trim() 
        });
      } else {
        await platformApi.payments.reschedule(item.id, { 
          newDueDate: date, 
          reason: reason.trim() 
        });
      }
      await onSaved();
    } catch (e) {
      Alert.alert("Action failed", e instanceof Error ? e.message : "Error saving");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Header title={kind === "payment" ? "Record Payment" : "Reschedule Due"} action={<Button label="Cancel" variant="ghost" onPress={onCancel}/>}/>
      <ScrollView contentContainerStyle={s.gap}>
        <Card>
          <Text style={s.label}>Target</Text>
          <Text style={s.title}>{item.customerName}</Text>
          <Text style={s.meta}>{item.loanNumber} · Original Due: {String(item.dueDate).slice(0, 10)}</Text>
        </Card>

        <Card>
          {kind === "payment" ? (
            <View style={s.gap}>
              <Field label="Amount Received (₹)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad"/>
              <Text style={s.meta}>Payment Method</Text>
              <Segmented options={["Cash", "Bank Transfer", "UPI"]} value={method} onChange={setMethod}/>
              <Field label="Notes (Optional)" value={notes} onChangeText={setNotes} multiline/>
            </View>
          ) : (
            <View style={s.gap}>
              <Field label="New Due Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD"/>
              <Field label="Reason for Reschedule" value={reason} onChangeText={setReason} multiline/>
            </View>
          )}
        </Card>
        
        <Button label={kind === "payment" ? "Confirm Payment" : "Confirm Reschedule"} loading={busy} onPress={() => void submit()}/>
      </ScrollView>
    </Screen>
  );
}
