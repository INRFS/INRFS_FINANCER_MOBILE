import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";
import { Button, Card, DataRow, Field, Segmented } from "../../components/ui";
import { shareCsv } from "../../services/nativeExport";
import { pageItems, platformApi } from "../../services/platformApi";

const msg = (error: unknown) => error instanceof Error ? error.message : "Please try again.";
const amount = (value: unknown) => Number(value ?? 0);
const validDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

export function AdminReportsScreen() {
  const [report, setReport] = useState("platform-fees");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [invoices, setInvoices] = useState<any[]>([]);
  const [financers, setFinancers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (fromDate = "", toDate = "") => {
    setLoading(true);
    try {
      const [billing, finance] = await Promise.all([
        platformApi.admin.allInvoices({ from: fromDate, to: toDate }),
        platformApi.admin.allFinancers(),
      ]);
      setInvoices(pageItems(billing));
      setFinancers(pageItems(finance));
    } catch (error) {
      Alert.alert("Reports unavailable", msg(error));
      setInvoices([]);
      setFinancers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const refresh = async () => {
    if ((from && !validDate(from)) || (to && !validDate(to))) {
      Alert.alert("Invalid date", "Enter complete dates in YYYY-MM-DD format.");
      return;
    }
    if (from && to && from > to) {
      Alert.alert("Invalid date range", "The From date must be on or before the To date.");
      return;
    }
    await load(from, to);
  };

  const rows = useMemo(() => {
    const names = new Map(financers.map(item => [item.id, item.displayName]));
    const term = search.trim().toLowerCase();
    return invoices
      .filter(item => report !== "fee-collections" || amount(item.collectedAmount) > 0)
      .map(item => ({
        invoiceId: item.invoiceNumber || item.id,
        financer: names.get(item.financerId) || item.financerId,
        periodStart: item.periodStart,
        periodEnd: item.periodEnd,
        interestCollected: amount(item.interestActivity),
        feeRate: `${amount(item.chargePercentage)}%`,
        feeGenerated: amount(item.chargeAmount),
        amountCollected: amount(item.collectedAmount),
        outstanding: Math.max(0, amount(item.chargeAmount) - amount(item.collectedAmount)),
        status: item.status,
        dueDate: item.dueDate,
      }))
      .filter(item => !term || Object.values(item).some(value => String(value ?? "").toLowerCase().includes(term)));
  }, [financers, invoices, report, search]);

  return <View style={{ gap: 14 }}>
    <Segmented options={["platform-fees", "fee-collections"]} value={report} onChange={setReport} accent="purple" />
    <Field label="Search financer or invoice" value={search} onChangeText={setSearch} />
    <View style={{ flexDirection: "row", gap: 8 }}>
      <Field style={{ flex: 1 }} label="From (YYYY-MM-DD)" value={from} onChangeText={setFrom} />
      <Field style={{ flex: 1 }} label="To (YYYY-MM-DD)" value={to} onChangeText={setTo} />
    </View>
    <View style={{ flexDirection: "row", gap: 8 }}>
      <Button loading={loading} label="Refresh report" variant="secondary" onPress={() => void refresh()} />
      <Button label="Export CSV" accent="purple" disabled={!rows.length} onPress={() => void shareCsv(`${report}-${new Date().toISOString().slice(0, 10)}.csv`, rows).catch(error => Alert.alert("Export failed", msg(error)))} />
    </View>
    <Text>{rows.length} records</Text>
    {!loading && !rows.length ? <Card>
      <Text>No records found</Text>
      <Text>{report === "fee-collections" ? "No platform-fee payments have been collected yet." : "No platform-fee invoices match the search."}</Text>
    </Card> : null}
    {rows.map(item => <Card key={item.invoiceId}>
      <DataRow title={item.financer} subtitle={`${item.invoiceId} · ${item.periodStart} – ${item.periodEnd}`} amount={`₹${item.feeGenerated.toLocaleString("en-IN")}`} status={item.status} />
      <DataRow title="Interest collected" amount={`₹${item.interestCollected.toLocaleString("en-IN")}`} />
      <DataRow title="Fee rate" amount={item.feeRate} />
      <DataRow title="Collected" amount={`₹${item.amountCollected.toLocaleString("en-IN")}`} />
      <DataRow title="Outstanding" amount={`₹${item.outstanding.toLocaleString("en-IN")}`} />
      <DataRow title="Due date" amount={item.dueDate || "—"} />
    </Card>)}
  </View>;
}
