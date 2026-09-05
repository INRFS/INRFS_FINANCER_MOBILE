import React, { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, View } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Badge, Button, Card, Field, Header, Screen, Segmented } from "../../components/ui";
import { pageItems, platformApi } from "../../services/platformApi";
import { colors, fonts, radii, spacing } from "../../theme/tokens";
import { RemoteState, useRemote } from "./shared";
import { localDateOnly } from "../../utils/date";
import { formatInr } from "../../utils/format";

const rupees = formatInr;

export function InterestScheduleScreen() {
  const load = useCallback(async () => {
    const [schedulePayload, loanPayload] = await Promise.all([
      platformApi.payments.allSchedules(),
      platformApi.loans.all(),
    ]);
    const loans = pageItems<any>(loanPayload);
    const loanById = new Map(loans.map(loan => [loan.id, loan]));
    return {
      items: pageItems<any>(schedulePayload).map(item => {
        const loan = loanById.get(item.loanId);
        const rate = Number(loan?.interestRate ?? loan?.annualInterestRate ?? 0);
        const basis = String(loan?.interestRateBasis ?? "").toLowerCase();
        return {
          ...item,
          customer: item.customerName,
          principal: item.openingPrincipal,
          rate: rate ? `${rate}%${basis.includes("month") ? " / month" : basis.includes("year") || basis.includes("annum") ? " / year" : ""}` : "—",
          interestAmount: item.interestDue,
        };
      }),
    };
  }, []);
  const state = useRemote(load, { items: [] } as any);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const rows = useMemo(() => pageItems<any>(state.data).filter(item => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || String(item.customer ?? "").toLowerCase().includes(query) || String(item.loanNumber ?? "").toLowerCase().includes(query);
    return matchesSearch && (statusFilter === "All" || item.status === statusFilter);
  }), [state.data, search, statusFilter]);

  const exportSchedule = async () => {
    if (!rows.length) return;
    try {
      const headings = ["Loan", "Customer", "Principal", "Interest rate", "Interest", "Due date", "Status"];
      const data = rows.map(item => [item.loanNumber, item.customer, item.principal, item.rate, item.interestAmount, item.dueDate, item.status]);
      const csv = [headings, ...data].map(row => row.map(value => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\r\n");
      const fileName = `interest-schedule-${localDateOnly()}.csv`;
      const uri = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
      if (!await Sharing.isAvailableAsync()) throw new Error("File sharing is unavailable on this device.");
      await Sharing.shareAsync(uri, { mimeType: "text/csv", dialogTitle: `Export ${fileName}` });
    } catch (error) {
      Alert.alert("Export Failed", error instanceof Error ? error.message : "Error");
    }
  };

  return <Screen scroll={false} contentStyle={{ paddingBottom: 0 }}>
    <Header title="Interest Schedule" subtitle="Automated monthly & periodic schedules" />
    <View style={styles.content}>
      <Card style={styles.filterCard}>
        <Field label="Search" value={search} onChangeText={setSearch} placeholder="Loan ID or customer name" />
        <Segmented options={["All", "Due", "Upcoming", "Overdue", "Paid"]} value={statusFilter} onChange={setStatusFilter} />
        <Button label="Export Schedule CSV" variant="secondary" icon="download-outline" onPress={() => void exportSchedule()} />
      </Card>
      <RemoteState {...state} retry={() => void state.refresh()} />
      <FlatList
        style={styles.list}
        data={rows}
        keyExtractor={(item, index) => item.id ?? String(index)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => <Card style={styles.scheduleCard}>
          <View style={styles.cardHeader}>
            <View style={styles.flex}>
              <Text numberOfLines={1} style={styles.loanNumber}>{item.loanNumber}</Text>
              <Text numberOfLines={1} style={styles.customerName}>{item.customer || "Customer"}</Text>
            </View>
            <View style={styles.amountBlock}>
              <Text style={styles.interestAmount}>{rupees(item.interestAmount)}</Text>
              <Badge status={item.status} />
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailGrid}>
            <View style={styles.detailItem}><Text style={styles.detailLabel}>Principal</Text><Text numberOfLines={1} style={styles.detailValue}>{rupees(item.principal)}</Text></View>
            <View style={styles.detailItem}><Text style={styles.detailLabel}>Interest rate</Text><Text numberOfLines={1} style={styles.detailValue}>{item.rate}</Text></View>
            <View style={styles.detailItem}><Text style={styles.detailLabel}>Due date</Text><Text numberOfLines={1} style={styles.detailValue}>{String(item.dueDate).slice(0, 10)}</Text></View>
          </View>
        </Card>}
        ListEmptyComponent={!state.loading ? <View style={styles.empty}><Text style={styles.emptyTitle}>No schedules found</Text><Text style={styles.emptyText}>Try another status or search term.</Text></View> : null}
      />
    </View>
  </Screen>;
}

const styles = StyleSheet.create({
  content: { flex: 1, gap: spacing.md },
  filterCard: { gap: 10, padding: 16 },
  list: { flex: 1 },
  listContent: { paddingBottom: 90, gap: 12 },
  scheduleCard: { padding: 16, gap: 14, borderRadius: radii.lg },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  flex: { flex: 1 },
  loanNumber: { color: colors.dark, fontFamily: fonts.bold, fontSize: 15 },
  customerName: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12, marginTop: 5 },
  amountBlock: { alignItems: "flex-end", gap: 7 },
  interestAmount: { color: colors.dark, fontFamily: fonts.extrabold, fontSize: 16 },
  divider: { height: 1, backgroundColor: colors.border },
  detailGrid: { flexDirection: "row", gap: 8 },
  detailItem: { flex: 1, minWidth: 0, gap: 5 },
  detailLabel: { color: colors.muted, fontFamily: fonts.medium, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.3 },
  detailValue: { color: colors.dark, fontFamily: fonts.semibold, fontSize: 12 },
  empty: { alignItems: "center", paddingVertical: 42, gap: 5 },
  emptyTitle: { color: colors.dark, fontFamily: fonts.bold, fontSize: 15 },
  emptyText: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12 },
});
