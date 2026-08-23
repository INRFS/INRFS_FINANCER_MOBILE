import React, { useCallback } from "react";
import { View } from "react-native";
import { Button, Card, DataRow, Grid, Header, KpiCard, Screen } from "../../components/ui";
import { platformApi } from "../../services/platformApi";
import { useRemote, RemoteState } from "./shared";
import { s } from "./styles";

const rupees = (v: unknown) => `₹${Number(v ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export function DashboardScreen({ go }: { go: (p: any) => void }) {
  const load = useCallback(() => platformApi.dashboard.financer(), []); 
  const state = useRemote(load, {} as any); 
  const d = state.data;
  return (
    <Screen>
      <Header title="Dashboard" subtitle="Live portfolio and collection activity" action={<Button label="Refresh" variant="ghost" onPress={() => void state.refresh()}/>}/>
      <RemoteState {...state} retry={() => void state.refresh()}/>
      <Grid>
        <KpiCard label="Customers" value={String(d.totalCustomers ?? 0)} accent="cyan"/>
        <KpiCard label="Active loans" value={String(d.activeLoans ?? 0)} accent="purple"/>
        <KpiCard label="Collected" value={rupees(d.totalCollected ?? d.collections)} accent="green"/>
        <KpiCard label="Outstanding" value={rupees(d.totalOutstanding ?? d.outstanding)} accent="orange"/>
      </Grid>
      <Card>
        <DataRow title="Interest collected" amount={rupees(d.interestCollected ?? d.totalInterestCollected)}/>
        <DataRow title="Due today" amount={rupees(d.dueTodayAmount)}/>
        <DataRow title="Overdue" amount={rupees(d.overdueAmount)}/>
      </Card>
      <View style={s.row}>
        <Button style={s.flex} label="Record payment" onPress={() => go("Dues")}/>
        <Button style={s.flex} label="Add customer" variant="secondary" onPress={() => go("Customers")}/>
      </View>
    </Screen>
  );
}
