import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, FlatList, ScrollView, Text, View } from "react-native";
import { Button, Card, DataRow, Field, Grid, Header, KpiCard, Screen, Segmented } from "../../components/ui";
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
  const [dateFilter, setDateFilter] = useState("");
  
  const [selected, setSelected] = useState<any>(null);
  const [actionKind, setActionKind] = useState<"payment" | "reschedule" | null>(null);

  const normalized = useMemo(() => {
    return pageItems(state.data).map((x: any) => {
      const raw = String(x.status ?? "Pending").toLowerCase().replace(/[\s_-]/g, "");
      let status = raw === "paid" || raw === "completed" || raw === "success" ? "Success"
        : raw === "partiallypaid" || raw === "partial" ? "Partial"
          : raw === "rescheduled" ? "Rescheduled" : raw === "overdue" ? "Overdue" : "Pending";
      const dueDate = String(x.dueDate ?? "").slice(0, 10);
      if (status === "Pending" && dueDate && dueDate < dateOnly()) status = "Overdue";
      return { ...x, status };
    });
  }, [state.data]);

  const rows = useMemo(() => normalized.filter((x: any) => {
      const q = search.toLowerCase();
      const matchSearch = !q || `${x.customerName} ${x.loanNumber}`.toLowerCase().includes(q);
      const matchStatus = statusFilter === "All" || x.status === statusFilter;
      const matchDate = !dateFilter || String(x.dueDate ?? "").slice(0, 10) === dateFilter;
      return matchSearch && matchStatus && matchDate;
    }), [dateFilter, normalized, search, statusFilter]);

  const summary = useMemo(() => normalized.reduce((totals: any, item: any) => {
    const amount = Number(item.amountPaid ?? item.amount ?? item.amountDue ?? item.interestDue ?? 0);
    if (item.status === "Success") {
      totals.totalCollected += amount;
      const received = String(item.receivedAt ?? item.paymentDate ?? "").slice(0, 7);
      if (received === dateOnly().slice(0, 7)) totals.thisMonth += amount;
    } else if (item.status === "Pending") totals.pending += Number(item.amountDue ?? item.interestDue ?? 0);
    else if (item.status === "Overdue") totals.overdue += Number(item.amountDue ?? item.interestDue ?? 0);
    return totals;
  }, { totalCollected: 0, thisMonth: 0, pending: 0, overdue: 0 }), [normalized]);

  if (actionKind) {
    return <ActionWizard 
      item={selected} 
      kind={actionKind} 
      onCancel={() => setActionKind(null)} 
      onSaved={async () => { setActionKind(null); await state.refresh(); }} 
    />;
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        style={{ flex: 1 }}
        nestedScrollEnabled
        scrollEnabled
        data={rows}
        keyExtractor={x => x.id}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 120, gap: 14, flexGrow: 1 }}
        ListHeaderComponent={
          <View style={s.gap}>
            <Header title="Payments & Dues" subtitle="Manage schedules and record payments" action={<Button label="Refresh" variant="ghost" onPress={() => void state.refresh()}/>}/>
            <Grid>
              <KpiCard label="Total Collected" value={rupees(summary.totalCollected)} accent="cyan" />
              <KpiCard label="Collected This Month" value={rupees(summary.thisMonth)} accent="green" />
              <KpiCard label="Pending Collection" value={rupees(summary.pending)} accent="orange" />
              <KpiCard label="Overdue Collection" value={rupees(summary.overdue)} accent="error" />
            </Grid>
            <Field label="Search" value={search} onChangeText={setSearch} placeholder="Customer name, loan number"/>
            <Field label="Due Date" value={dateFilter} onChangeText={setDateFilter} placeholder="YYYY-MM-DD (optional)" />
            <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false}>
              <Segmented
                options={["All", "Pending", "Overdue", "Success", "Partial", "Rescheduled"]}
                value={statusFilter}
                onChange={setStatusFilter}
              />
            </ScrollView>
            <RemoteState {...state} retry={() => void state.refresh()}/>
          </View>
        }
        ListEmptyComponent={!state.loading ? <Text style={[s.meta, { textAlign: "center", marginTop: 24 }]}>No payment records match the current filters.</Text> : null}
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
              {isSettled ? <Button label="View Details" variant="ghost" onPress={() => Alert.alert("Payment Details", `${x.customerName ?? "Customer"}\n${x.loanNumber ?? ""}\n${rupees(x.amountPaid ?? x.amount ?? x.amountDue)} via ${x.method ?? x.mode ?? "Not recorded"}`)} /> : null}
            </Card>
          );
        }}
      />
    </View>
  );
}

function ActionWizard({ item, kind, onCancel, onSaved }: { item: any, kind: "payment" | "reschedule", onCancel: () => void, onSaved: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  
  // Payment fields
  const [amount, setAmount] = useState(String(item.amountDue ?? item.outstandingAmount ?? ""));
  const [method, setMethod] = useState("Cash");
  const [type, setType] = useState("InterestOnly");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentDate, setPaymentDate] = useState(dateOnly());
  const [settlementQuote, setSettlementQuote] = useState<any>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  
  // Reschedule fields
  const [date, setDate] = useState(dateOnly());
  const [reason, setReason] = useState("");

  const interestMaximum = Math.max(0, Number(item.interestDue ?? item.amountDue ?? item.outstandingAmount ?? 0) - Number(item.amountPaid ?? 0));
  const regularMaximum = Math.max(Number(item.amountDue ?? 0), Number(item.loanOutstanding ?? item.outstandingAmount ?? item.amountDue ?? 0));
  const maximum = type === "FullSettlement" ? Number(settlementQuote?.settlementAmount ?? 0) : type === "InterestOnly" ? interestMaximum : regularMaximum;

  useEffect(() => {
    if (kind !== "payment" || type !== "FullSettlement") return;
    let active = true;
    setQuoteLoading(true);
    platformApi.payments.settlementQuote(item.loanId, paymentDate)
      .then((quote: any) => { if (active) { setSettlementQuote(quote); setAmount(String(quote.settlementAmount)); } })
      .catch((error: unknown) => { if (active) { setSettlementQuote(null); setAmount(""); Alert.alert("Settlement quote unavailable", error instanceof Error ? error.message : "Please try again."); } })
      .finally(() => { if (active) setQuoteLoading(false); });
    return () => { active = false; };
  }, [item.loanId, kind, paymentDate, type]);

  const changeType = (nextType: string) => {
    setType(nextType);
    setSettlementQuote(null);
    setAmount(nextType === "InterestOnly" ? String(interestMaximum) : nextType === "Regular" ? String(regularMaximum) : "");
  };

  const submit = async () => {
    if (kind === "payment" && !/^\d{4}-\d{2}-\d{2}$/.test(paymentDate)) {
      return Alert.alert("Invalid date", "Enter the payment date as YYYY-MM-DD.");
    }
    if (kind === "payment" && (Number(amount) <= 0 || Number(amount) > maximum || quoteLoading)) {
      return Alert.alert("Invalid payment", `Enter an amount between 0.01 and ${rupees(maximum)}.`);
    }
    if (kind === "reschedule" && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date <= String(item.dueDate ?? '').slice(0, 10))) return Alert.alert("Invalid date", "The new due date must be later than the current due date.");
    if (kind === "reschedule" && !reason.trim()) return Alert.alert("Reason required", "Enter a reason for rescheduling this payment.");
    setBusy(true);
    try {
      if (kind === "payment") {
        await platformApi.payments.record({ 
          loanId: item.loanId, 
          paymentScheduleId: item.id, 
          amount: Number(amount), 
          paymentType: type,
          receivedAt: paymentDate === dateOnly() ? new Date().toISOString() : new Date(`${paymentDate}T12:00:00+05:30`).toISOString(),
          mode: method, 
          externalReference: reference.trim() || null, 
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
              <Text style={s.meta}>Payment Type</Text>
              <Segmented options={["InterestOnly", "Regular", "FullSettlement"]} value={type} onChange={changeType}/>
              {type === "FullSettlement" && settlementQuote ? <Card>
                <DataRow title="Principal outstanding" amount={rupees(settlementQuote.principalOutstanding)} />
                <DataRow title="Accrued interest" amount={rupees(settlementQuote.accruedInterest)} />
                <DataRow title="Fees" amount={rupees(settlementQuote.feesOutstanding)} />
                <DataRow title="Future interest waived" amount={`-${rupees(settlementQuote.futureInterestWaived)}`} />
                <DataRow title="Settlement amount" amount={rupees(settlementQuote.settlementAmount)} />
              </Card> : null}
              <Field label="Amount Received (₹)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad"/>
              <Text style={s.meta}>{quoteLoading ? "Calculating settlement quote..." : `Maximum allowed: ${rupees(maximum)}`}</Text>
              <Field label="Payment Date" value={paymentDate} onChangeText={setPaymentDate} placeholder="YYYY-MM-DD" />
              <Text style={s.meta}>Payment Method</Text>
              <Segmented options={["Cash", "UPI", "Card", "BankTransfer", "Cheque"]} value={method} onChange={setMethod}/>
              <Field label="Reference ID (Optional)" value={reference} onChangeText={setReference} />
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
