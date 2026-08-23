import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Share, Text, View } from "react-native";
import { Button, Card, Field, KpiCard, Grid } from "../../components/ui";
import { pageItems, platformApi } from "../../services/platformApi";
import { RemoteState, useRemote } from "./shared";
import { s } from "./styles";
import { Ionicons } from "../../components/AppIcon";

const rupees = (v: unknown) => `₹${Number(v ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

function formatLedgerDate(value: any) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function LedgerScreen() {
  const loader = useCallback(async () => ({ customers: pageItems(await platformApi.customers.all()) }), []);
  const state = useRemote(loader, { customers: [] } as any);
  
  const [selectedId, setSelectedId] = useState("");
  const [ledgerData, setLedgerData] = useState<{ customer: any; entries: any[] }>({ customer: null, entries: [] });
  const [search, setSearch] = useState("");
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerError, setLedgerError] = useState("");

  const customersList = state.data.customers ?? [];
  useEffect(() => {
    if (!selectedId && customersList[0]?.id) setSelectedId(customersList[0].id);
  }, [customersList, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    const customer = customersList.find((item: any) => item.id === selectedId);
    setLedgerLoading(true);
    setLedgerError("");
    platformApi.customers.ledger(selectedId, { pageSize: 500 })
      .then((payload: any) => {
        const entries = Array.isArray(payload?.entries) ? payload.entries : pageItems(payload);
        setLedgerData({
          customer: payload?.customer ?? customer,
          entries: entries.map((item: any, index: number) => ({
            id: item.id ?? `ledger-${index}`,
            transactionAt: item.transactionAt ?? item.occurredAt ?? item.date ?? item.transactionDate,
            transactionNumber: item.transactionNumber ?? item.transactionId ?? item.reference ?? item.id ?? `TXN-${index + 1}`,
            type: item.type ?? item.description ?? item.transactionType ?? "Ledger entry",
            debit: Number(item.debit ?? item.debitAmount ?? 0),
            credit: Number(item.credit ?? item.creditAmount ?? 0),
            balance: Number(item.balance ?? item.closingBalance ?? item.runningBalance ?? 0),
            status: item.status,
          })),
        });
      })
      .catch((e) => setLedgerError(e instanceof Error ? e.message : "Ledger error"))
      .finally(() => setLedgerLoading(false));
  }, [selectedId, customersList]);

  const filteredCustomers = useMemo(() => {
    const value = search.trim().toLowerCase();
    return customersList.filter((item: any) => !value || [item.fullName, item.customerNumber, item.phone].some((field) => String(field || "").toLowerCase().includes(value)));
  }, [customersList, search]);

  const totals = useMemo(() => ledgerData.entries.reduce((sum, item) => ({ debit: sum.debit + Number(item.debit || 0), credit: sum.credit + Number(item.credit || 0) }), { debit: 0, credit: 0 }), [ledgerData.entries]);
  const currentBalance = ledgerData.entries.length ? Number(ledgerData.entries[ledgerData.entries.length - 1].balance || totals.debit - totals.credit) : totals.debit - totals.credit;

  const exportCsv = async () => {
    if (!ledgerData.entries.length) return;
    try {
      const data = [["Date", "Transaction", "Description", "Debit", "Credit", "Balance"], ...ledgerData.entries.map((item) => [item.transactionAt, item.transactionNumber, item.type, item.debit, item.credit, item.balance])];
      const csv = data.map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\r\n");
      await Share.share({ title: `${ledgerData.customer?.customerNumber || "customer"}-ledger.csv`, message: csv });
    } catch (e) {
      Alert.alert("Export failed", e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <View style={s.gap}>
      <Field label="Search Customers" value={search} onChangeText={setSearch} placeholder="Name, ID or phone" />
      <RemoteState {...state} retry={() => void state.refresh()} />
      
      {filteredCustomers.length > 0 && (
        <View style={{ maxHeight: 150 }}>
          <FlatList 
            data={filteredCustomers}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={x => x.id}
            renderItem={({ item: x }) => (
              <Button 
                variant={selectedId === x.id ? "primary" : "secondary"} 
                label={x.fullName} 
                onPress={() => setSelectedId(x.id)} 
                style={{ marginRight: 8 }} 
              />
            )}
          />
        </View>
      )}

      {ledgerData.customer && (
        <>
          <Grid>
            <KpiCard label="Total Disbursed" value={rupees(totals.debit)} accent="cyan"/>
            <KpiCard label="Total Received" value={rupees(totals.credit)} accent="green"/>
            <KpiCard label="Current Balance" value={rupees(currentBalance)} accent="orange"/>
          </Grid>
          
          <Card>
            <View style={s.between}>
              <Text style={s.title}>Ledger Entries</Text>
              <Button label="Export CSV" icon="download-outline" variant="secondary" onPress={() => void exportCsv()} disabled={!ledgerData.entries.length}/>
            </View>
            
            {ledgerError ? <Text style={s.error}>{ledgerError}</Text> : null}
            {ledgerLoading ? <Text style={s.muted}>Loading ledger…</Text> : null}
            
            {!ledgerLoading && !ledgerError && ledgerData.entries.map((item, i) => (
              <View key={item.id ?? i} style={s.ledgerEntry}>
                <View style={s.between}>
                  <View style={s.flex}>
                    <Text style={s.title}>{formatLedgerDate(item.transactionAt)}</Text>
                    <Text style={s.meta}>{item.transactionNumber}</Text>
                  </View>
                  <Text style={s.balance}>{rupees(item.balance)}</Text>
                </View>
                <Text style={s.meta}>{item.type}</Text>
                <View style={s.between}>
                  <Text style={s.debit}>Debit: {item.debit ? rupees(item.debit) : "—"}</Text>
                  <Text style={s.credit}>Credit: {item.credit ? rupees(item.credit) : "—"}</Text>
                </View>
              </View>
            ))}
          </Card>
        </>
      )}
    </View>
  );
}
