import { useCallback, useEffect, useState } from "react";
import { Alert, Linking, ScrollView, Text, View } from "react-native";

import { Badge, Button, Card, DataRow, Field, Grid, Header, KpiCard, Screen } from "../../components/ui";
import { pageItems, platformApi } from "../../services/platformApi";

const today = () => new Date().toISOString().slice(0, 10);
const money = (value: unknown) => `₹${Number(value ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const message = (error: unknown) => error instanceof Error ? error.message : "Please try again.";
type Action = "assign" | "promise" | "followup" | "call" | "payment" | null;

export function AdminCollectionsScreen() {
  const load = useCallback(async () => {
    const [collections, users, settings] = await Promise.all([
      platformApi.collections.list({ pageSize: 100 }),
      platformApi.admin.users({ pageSize: 100 }).catch(() => ({ items: [] })),
      platformApi.settings.list("Platform").catch(() => ({ items: [] })),
    ]);
    const settingRows = pageItems(settings);
    return {
      rows: pageItems(collections),
      agents: pageItems(users).filter((user: any) => (user.roles ?? []).some((role: any) => String(role.name ?? role).toLowerCase() === "collectionagent")),
      reminderDays: String(settingRows.find((item: any) => item.key === "CollectionReminderDaysBefore")?.value ?? 1),
      escalationDays: String(settingRows.find((item: any) => item.key === "CollectionEscalationDays")?.value ?? 3),
    };
  }, []);
  const [data, setData] = useState<any>({ rows: [], agents: [], reminderDays: "1", escalationDays: "3" });
  const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const refresh = useCallback(async () => { setLoading(true); setError(""); try { setData(await load()); } catch (e) { setError(message(e)); } finally { setLoading(false); } }, [load]);
  useEffect(() => { void refresh(); }, [refresh]);
  const [selected, setSelected] = useState<any>(null); const [action, setAction] = useState<Action>(null);
  const [search, setSearch] = useState(""); const [status, setStatus] = useState("All");
  const [date, setDate] = useState(today()); const [followUpDate, setFollowUpDate] = useState(""); const [notes, setNotes] = useState(""); const [amount, setAmount] = useState("");
  const [agentId, setAgentId] = useState(""); const [outcome, setOutcome] = useState("Customer contacted"); const [mode, setMode] = useState("Cash"); const [reference, setReference] = useState("");
  const [reminderDays, setReminderDays] = useState("1"); const [escalationDays, setEscalationDays] = useState("3");
  useEffect(() => { setReminderDays(data.reminderDays); setEscalationDays(data.escalationDays); }, [data.reminderDays, data.escalationDays]);
  const rows = data.rows.filter((item: any) => (status === "All" || String(item.caseStatus ?? item.status) === status) && `${item.customer}${item.loanNumber}${item.financer}${item.financerName}${item.assignedToName}`.toLowerCase().includes(search.toLowerCase()));
  const open = (item: any, next: Action) => { setSelected(item); setAction(next); setDate(today()); setFollowUpDate(""); setNotes(""); setAmount(String(item.actionableDue ?? item.dueNow ?? item.due ?? "")); setAgentId(item.assignedTo ?? ""); setOutcome("Customer contacted"); setMode("Cash"); setReference(""); };
  const submit = async () => { if (!selected || !action) return; try {
    if (action === "payment") await platformApi.payments.record({ loanId: selected.id, paymentScheduleId: selected.paymentScheduleId, amount: Number(amount), receivedAt: new Date(`${date}T12:00:00+05:30`).toISOString(), mode, externalReference: reference.trim() || null, notes: "Recorded by INRFS collection operations" });
    else if (action === "assign") await platformApi.collections.action(selected.id, { type: "Assigned", notes: "Case assigned by INRFS operations.", assignedTo: agentId, status: "Open" });
    else if (action === "call") await platformApi.collections.action(selected.id, { type: "CallCompleted", notes: `${outcome}: ${notes}`, promiseToPayDate: outcome === "Promise to pay" ? date : null, nextFollowUpDate: followUpDate || null, status: outcome === "Promise to pay" ? "PromiseToPay" : "Contacted" });
    else await platformApi.collections.action(selected.id, { type: action === "promise" ? "PromiseToPay" : "FollowUpScheduled", notes: notes || (action === "promise" ? "Customer promised payment." : "Customer follow-up scheduled."), promiseToPayDate: action === "promise" ? date : null, nextFollowUpDate: action === "followup" ? date : null, status: action === "promise" ? "PromiseToPay" : "Contacted" });
    setAction(null); setSelected(null); await refresh();
  } catch (e) { Alert.alert("Action not saved", message(e)); } };
  const remind = async (item: any) => { try { await platformApi.collections.remind(item.id, { type: "PaymentReminder", notes: "SMS reminder queued by INRFS operations." }); await refresh(); } catch (e) { Alert.alert("Reminder not sent", message(e)); } };
  const whatsapp = async (item: any) => { try { await platformApi.collections.action(item.id, { type: "WhatsApp", notes: "WhatsApp follow-up initiated." }); await Linking.openURL(`https://wa.me/${String(item.customerPhone ?? "").replace(/\D/g, "")}`); await refresh(); } catch (e) { Alert.alert("WhatsApp unavailable", message(e)); } };
  const saveRules = async () => { try { await Promise.all([platformApi.settings.save("Platform", "CollectionReminderDaysBefore", { value: reminderDays, valueType: "Number", description: "Days before due date to queue a customer reminder", isSecret: false }), platformApi.settings.save("Platform", "CollectionEscalationDays", { value: escalationDays, valueType: "Number", description: "Overdue days before automatic escalation", isSecret: false })]); await refresh(); Alert.alert("Saved", "Collection automation rules updated."); } catch (e) { Alert.alert("Rules not saved", message(e)); } };

  return <Screen><Header title="Collections" subtitle="Due and overdue work queue" action={<Button label="Refresh" variant="ghost" onPress={() => void refresh()}/>}/>
    <Grid><KpiCard label="Cases" value={String(data.rows.length)} accent="purple"/><KpiCard label="Unassigned" value={String(data.rows.filter((x: any) => !x.assignedTo).length)} accent="orange"/></Grid>
    <Card><Text>Automation rules</Text><Field label="Reminder days before due" value={reminderDays} onChangeText={setReminderDays} keyboardType="number-pad"/><Field label="Escalation days overdue" value={escalationDays} onChangeText={setEscalationDays} keyboardType="number-pad"/><Button label="Save rules" accent="purple" onPress={() => void saveRules()}/></Card>
    <Field label="Search" value={search} onChangeText={setSearch} placeholder="Financer, customer, loan or agent"/>
    <ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={{ flexDirection: "row", gap: 8 }}>{["All","Upcoming","Open","Contacted","PromiseToPay","PartiallyCollected","Escalated"].map(x => <Button key={x} label={x} variant={status === x ? "primary" : "secondary"} accent="purple" onPress={() => setStatus(x)}/>)}</View></ScrollView>
    {loading ? <Card><Text>Loading…</Text></Card> : error ? <Card><Text>{error}</Text><Button label="Retry" onPress={() => void refresh()}/></Card> : null}
    {rows.map((item: any) => <Card key={item.id}><Badge status={item.caseStatus ?? item.status ?? (item.daysPastDue > 0 ? "Overdue" : "Upcoming")}/><DataRow title={item.customer} subtitle={`${item.financer ?? item.financerName} · ${item.loanNumber} · Due ${String(item.dueDate).slice(0, 10)}`} amount={money(item.dueNow ?? item.due)}/><DataRow title="Assigned agent" amount={item.assignedToName ?? "Unassigned"}/><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}><Button label="Assign" variant="secondary" onPress={() => open(item, "assign")}/><Button label="Promise" variant="secondary" onPress={() => open(item, "promise")}/><Button label="Follow-up" variant="secondary" onPress={() => open(item, "followup")}/><Button label="Call" variant="secondary" onPress={() => open(item, "call")}/><Button label="Payment" onPress={() => open(item, "payment")}/><Button label="SMS" variant="ghost" onPress={() => void remind(item)}/><Button label="WhatsApp" variant="ghost" onPress={() => void whatsapp(item)}/></View>{(item.activities ?? []).map((activity: any) => <Text key={activity.id}>{activity.type}: {activity.notes}</Text>)}</Card>)}
    {action ? <Card><Header title={action === "assign" ? "Assign agent" : action === "payment" ? "Record payment" : action === "call" ? "Record call" : action === "promise" ? "Promise to pay" : "Schedule follow-up"}/>{action === "assign" ? data.agents.map((agent: any) => <Button key={agent.id} label={`${agent.firstName ?? ""} ${agent.lastName ?? ""}`.trim() || agent.email} variant={agentId === agent.id ? "primary" : "secondary"} accent="purple" onPress={() => setAgentId(agent.id)}/>) : null}{action === "call" ? <><ScrollView horizontal><View style={{ flexDirection: "row", gap: 8 }}>{["Customer contacted","No answer","Busy / switched off","Payment confirmed","Promise to pay","Dispute raised"].map(x => <Button key={x} label={x} variant={outcome === x ? "primary" : "secondary"} accent="purple" onPress={() => setOutcome(x)}/>)}</View></ScrollView><Button label="Open phone dialer" variant="secondary" onPress={() => void Linking.openURL(`tel:${selected?.customerPhone ?? ""}`)}/></> : null}{action !== "assign" && action !== "call" ? <Field label={action === "payment" ? "Payment date" : "Date"} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD"/> : null}{action === "call" && outcome === "Promise to pay" ? <Field label="Promise date" value={date} onChangeText={setDate}/> : null}{action === "call" ? <Field label="Next follow-up (optional)" value={followUpDate} onChangeText={setFollowUpDate}/> : null}{action === "payment" ? <><Field label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad"/><ScrollView horizontal><View style={{ flexDirection: "row", gap: 8 }}>{["Cash","Upi","BankTransfer","Cheque","Card","Other"].map(x => <Button key={x} label={x} variant={mode === x ? "primary" : "secondary"} accent="purple" onPress={() => setMode(x)}/>)}</View></ScrollView><Field label="Reference" value={reference} onChangeText={setReference}/></> : null}{action !== "assign" && action !== "payment" ? <Field label="Notes" value={notes} onChangeText={setNotes} multiline/> : null}<View style={{ flexDirection: "row", gap: 8 }}><Button label="Cancel" variant="secondary" onPress={() => setAction(null)}/><Button label="Confirm" accent="purple" onPress={() => void submit()}/></View></Card> : null}
  </Screen>;
}
