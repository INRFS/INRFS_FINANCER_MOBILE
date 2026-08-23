import React, { useCallback, useMemo, useState } from "react";
import { View, Text, FlatList, Alert } from "react-native";
import { Card, Header, Screen, Segmented, Button, Field, DataRow } from "../../components/ui";
import { pageItems, platformApi } from "../../services/platformApi";
import { RemoteState, useRemote } from "./shared";
import { s } from "./styles";

const rupees = (v: unknown) => `₹${Number(v ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export function DueOverdueScreen() {
  const load = useCallback(() => platformApi.payments.allSchedules(), []);
  const state = useRemote(load, { items: [] } as any);

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("Due Today");

  const rows = useMemo(() => {
    return pageItems(state.data).filter((x: any) => {
      if (tab === "Due Today" && x.status !== "Due Today") return false;
      if (tab === "Overdue" && x.status !== "Overdue") return false;
      
      const q = search.toLowerCase();
      return !q || (x.customerName?.toLowerCase().includes(q) || x.loanNumber?.toLowerCase().includes(q));
    });
  }, [state.data, search, tab]);

  const handleAction = (item: any) => {
    Alert.alert("Action", `Proceed to record payment or reschedule for ${item.customerName}`);
  };

  return (
    <Screen>
      <Header title="Due & Overdue" subtitle="Actionable payment tracking" />
      <View style={s.gap}>
        <Segmented options={["Due Today", "Overdue"]} value={tab} onChange={setTab} />
        <Field label="Search" value={search} onChangeText={setSearch} placeholder="Loan ID or customer name" />

        <RemoteState {...state} retry={() => void state.refresh()} />

        <FlatList
          data={rows}
          keyExtractor={(item, index) => item.id ?? String(index)}
          contentContainerStyle={{ paddingBottom: 80 }}
          renderItem={({ item }) => (
            <Card>
              <View style={s.between}>
                <View style={s.flex}>
                  <Text style={s.title}>{item.loanNumber}</Text>
                  <Text style={s.meta}>{item.customerName}</Text>
                </View>
                <View>
                  <Text style={[s.balance, tab === "Overdue" && { color: "#ef4444" }]}>
                    {rupees(item.amountDue ?? item.outstandingAmount)}
                  </Text>
                  <Text style={[s.meta, { textAlign: "right" }]}>{item.status}</Text>
                </View>
              </View>
              <DataRow title="Due Date" amount={String(item.dueDate).slice(0, 10)} />
              <View style={[s.row, { marginTop: 12 }]}>
                <Button style={s.flex} label="Record Payment" onPress={() => handleAction(item)} />
                <Button style={s.flex} label="Reschedule" variant="secondary" onPress={() => handleAction(item)} />
              </View>
            </Card>
          )}
          ListEmptyComponent={!state.loading ? <Text style={[s.muted, { textAlign: "center", marginTop: 20 }]}>No {tab} records found.</Text> : null}
        />
      </View>
    </Screen>
  );
}
