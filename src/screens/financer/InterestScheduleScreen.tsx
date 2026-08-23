import React, { useCallback, useMemo, useState } from "react";
import { View, Text, FlatList, Share, Alert } from "react-native";
import { Card, Header, Screen, Segmented, Button, Field, DataRow } from "../../components/ui";
import { pageItems, platformApi } from "../../services/platformApi";
import { RemoteState, useRemote } from "./shared";
import { s } from "./styles";

const rupees = (v: unknown) => `₹${Number(v ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export function InterestScheduleScreen() {
  const load = useCallback(() => platformApi.payments.allSchedules(), []);
  const state = useRemote(load, { items: [] } as any);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const rows = useMemo(() => {
    return pageItems(state.data).map((item: any) => ({
      ...item,
      customer: item.customerName,
      principal: item.openingPrincipal,
      rate: "—",
      interestAmount: item.interestDue,
    })).filter((x: any) => {
      const q = search.toLowerCase();
      const matchSearch = !q || (x.customer?.toLowerCase().includes(q) || x.loanNumber?.toLowerCase().includes(q));
      const matchStatus = statusFilter === "All" || x.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [state.data, search, statusFilter]);

  const exportSchedule = async () => {
    if (!rows.length) return;
    try {
      const headings = ["Loan", "Customer", "Principal", "Interest", "Due date", "Status"];
      const data = rows.map((item) => [item.loanNumber, item.customer, item.principal, item.interestAmount, item.dueDate, item.status]);
      const csv = [headings, ...data]
        .map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(","))
        .join("\r\n");
      await Share.share({ title: `interest-schedule-${new Date().toISOString().slice(0, 10)}.csv`, message: csv });
    } catch (e) {
      Alert.alert("Export Failed", e instanceof Error ? e.message : "Error");
    }
  };

  return (
    <Screen>
      <Header title="Interest Schedule" subtitle="Automated monthly & periodic schedules" />
      <View style={s.gap}>
        <Card>
          <Field label="Search" value={search} onChangeText={setSearch} placeholder="Loan ID or customer name" />
          <Segmented options={["All", "Due", "Upcoming", "Overdue", "Paid"]} value={statusFilter} onChange={setStatusFilter} />
          <Button label="Export Schedule CSV" variant="secondary" icon="download-outline" onPress={() => void exportSchedule()} style={{ marginTop: 10 }} />
        </Card>

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
                  <Text style={s.meta}>{item.customer}</Text>
                </View>
                <View>
                  <Text style={s.balance}>{rupees(item.interestAmount)}</Text>
                  <Text style={[s.meta, { textAlign: "right" }]}>{item.status}</Text>
                </View>
              </View>
              <DataRow title="Principal" amount={rupees(item.principal)} />
              <DataRow title="Due Date" amount={String(item.dueDate).slice(0, 10)} />
            </Card>
          )}
        />
      </View>
    </Screen>
  );
}
