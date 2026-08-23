import React, { useCallback, useMemo, useState } from "react";
import { View, Text, ScrollView, Alert, Share } from "react-native";
import { Card, DataRow, Segmented, Button, Field } from "../../components/ui";
import { pageItems, platformApi } from "../../services/platformApi";
import { RemoteState, useRemote } from "./shared";
import { s } from "./styles";

const rupees = (v: unknown) => `₹${Number(v ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export function ReportsScreen() {
  const [type, setType] = useState("customers");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const loader = useCallback(() => platformApi.reports.get(type, { search, from, to, pageSize: 100 }), [type, search, from, to]);
  const state = useRemote(loader, { items: [] } as any);
  const rows = pageItems(state.data);
  const columns = useMemo(() => [...new Set(rows.flatMap((row) => Object.keys(row)))].filter((key) => !["createdBy", "updatedBy"].includes(key)), [rows]);

  const exportCsv = async () => {
    if (!rows.length) return;
    try {
      const csv = [columns, ...rows.map((row) => columns.map((key) => row[key]))]
        .map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(","))
        .join("\r\n");
      await Share.share({ title: `${type}-report.csv`, message: csv });
    } catch (e) {
      Alert.alert("Export Failed", e instanceof Error ? e.message : "Error");
    }
  };

  return (
    <View style={s.gap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Segmented 
          options={["customers", "loans", "payments", "interest-schedule", "overdue"]} 
          value={type} 
          onChange={setType}
        />
      </ScrollView>

      <Card>
        <Field label="Search" value={search} onChangeText={setSearch} placeholder="Search records..." />
        <View style={s.row}>
          <View style={s.flex}><Field label="From" value={from} onChangeText={setFrom} placeholder="YYYY-MM-DD" /></View>
          <View style={s.flex}><Field label="To" value={to} onChangeText={setTo} placeholder="YYYY-MM-DD" /></View>
        </View>
        <View style={[s.row, { marginTop: 10 }]}>
          <Button style={s.flex} label="Run Report" loading={state.loading} onPress={() => void state.refresh()} />
          <Button style={s.flex} label="Export CSV" variant="secondary" icon="download-outline" disabled={!rows.length} onPress={() => void exportCsv()} />
        </View>
      </Card>

      <RemoteState {...state} retry={() => void state.refresh()} />
      
      {!state.loading && !state.error && (
        <Card>
          <DataRow title="Total Records" amount={String(rows.length)} />
          <DataRow title="Total Amount" amount={rupees(state.data.totalAmount ?? state.data.total ?? 0)} />
        </Card>
      )}

      {rows.slice(0, 50).map((x: any, i: number) => (
        <Card key={x.id || i}>
          <Text style={s.title}>{x.name || x.customerName || x.loanNumber || `Record ${i + 1}`}</Text>
          <Text style={s.meta}>{x.status || x.date || x.description}</Text>
          <Text style={s.balance}>{rupees(x.amount ?? x.total ?? x.principal ?? 0)}</Text>
        </Card>
      ))}
      {rows.length > 50 && <Text style={s.muted}>Displaying top 50 records...</Text>}
    </View>
  );
}
