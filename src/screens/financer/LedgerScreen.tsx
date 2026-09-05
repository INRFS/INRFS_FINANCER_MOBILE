import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Text, View, Modal, Pressable, StyleSheet, ActivityIndicator, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, Header, Screen } from "../../components/ui";
import { pageItems, platformApi } from "../../services/platformApi";
import { s } from "./styles";
import { Ionicons } from "../../components/AppIcon";
import { colors, fonts, radii, spacing } from "../../theme/tokens";
import { shareCsv } from "../../services/nativeExport";
import { formatInr } from "../../utils/format";

const rupees = formatInr;

function formatLedgerDate(value: any) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function LedgerSummaryCard({ label, value, accent }: { label: string; value: string; accent: "cyan" | "green" }) {
  const accentColor = accent === "green" ? colors.green : colors.cyan;
  return <Card style={[styles.summaryCard, { borderTopColor: accentColor }]}>
    <View style={[styles.summaryIcon, { backgroundColor: accent === "green" ? colors.greenSoft : colors.cyanSoft }]}>
      <Ionicons name={accent === "green" ? "arrow-down-outline" : "arrow-up-outline"} size={18} color={accentColor} />
    </View>
    <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{value}</Text>
    <Text style={styles.summaryLabel}>{label}</Text>
  </Card>;
}

export function LedgerScreen() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [customersError, setCustomersError] = useState("");

  const [selectedId, setSelectedId] = useState("");
  const [ledgerData, setLedgerData] = useState<{ customer: any; entries: any[] }>({ customer: null, entries: [] });
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerError, setLedgerError] = useState("");
  
  const [isCustomerSheetOpen, setIsCustomerSheetOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");

  const loadCustomers = useCallback(async () => {
    setCustomersLoading(true);
    setCustomersError("");
    try {
      const payload = await platformApi.customers.all();
      const items = pageItems(payload);
      setCustomers(items);
      if (items.length > 0 && !selectedId) {
        setSelectedId(items[0].id);
      }
    } catch (e) {
      setCustomersError(e instanceof Error ? e.message : "Failed to load customers");
    } finally {
      setCustomersLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    if (!selectedId) return;
    const loadLedger = async () => {
      setLedgerLoading(true);
      setLedgerError("");
      try {
        const payload: any = await platformApi.customers.ledger(selectedId, { pageSize: 500 });
        const entries = Array.isArray(payload?.entries) ? payload.entries : pageItems(payload);
        const customer = customers.find((c) => c.id === selectedId) || payload?.customer;
        
        setLedgerData({
          customer,
          entries: entries.map((item: any, index: number) => ({
            id: item.id ?? `ledger-${index}`,
            transactionAt: item.transactionAt ?? item.occurredAt ?? item.date ?? item.transactionDate,
            transactionNumber: item.transactionNumber ?? item.transactionId ?? item.reference ?? item.id ?? `TXN-${index + 1}`,
            type: item.type ?? item.description ?? item.transactionType ?? "Ledger entry",
            debit: Number(item.debit ?? item.debitAmount ?? 0),
            credit: Number(item.credit ?? item.creditAmount ?? 0),
            balance: Number(item.balance ?? item.closingBalance ?? item.runningBalance ?? 0),
          })),
        });
      } catch (e) {
        setLedgerError(e instanceof Error ? e.message : "Ledger error");
      } finally {
        setLedgerLoading(false);
      }
    };
    void loadLedger();
  }, [selectedId, customers]);
  const filteredCustomers = useMemo(() => {
    const value = customerSearch.trim().toLowerCase();
    return customers.filter((item: any) => !value || [item.fullName, item.customerNumber, item.phone].some((field) => String(field || "").toLowerCase().includes(value)));
  }, [customers, customerSearch]);

  const totals = useMemo(() => ledgerData.entries.reduce((sum, item) => ({ 
    debit: sum.debit + Number(item.debit || 0), 
    credit: sum.credit + Number(item.credit || 0) 
  }), { debit: 0, credit: 0 }), [ledgerData.entries]);
  
  const currentBalance = ledgerData.entries.length
    ? Number(ledgerData.entries[ledgerData.entries.length - 1]?.balance ?? totals.debit - totals.credit)
    : 0;

  const exportCsv = async () => {
    if (!ledgerData.entries.length) return;
    try {
      await shareCsv(`${ledgerData.customer?.customerNumber || "customer"}-ledger.csv`, ledgerData.entries.map((item) => ({
        Date: item.transactionAt,
        Transaction: item.transactionNumber,
        Type: item.type,
        Debit: item.debit,
        Credit: item.credit,
        Balance: item.balance,
      })));
    } catch (e) {
      Alert.alert("Export failed", e instanceof Error ? e.message : "Failed");
    }
  };

  const selectedCustomer = ledgerData.customer || customers.find(c => c.id === selectedId);

  return (
    <Screen contentStyle={{ paddingBottom: 80 }}>
      <Header 
        title="Customer Ledger" 
        subtitle="View customer transactions and balance" 
        action={
          <Pressable 
            onPress={exportCsv} 
            disabled={!ledgerData.entries.length || ledgerLoading} 
            style={({ pressed }) => [styles.exportBtn, pressed && { opacity: 0.7 }, (!ledgerData.entries.length || ledgerLoading) && { opacity: 0.5 }]}
          >
            <Ionicons name="download-outline" size={20} color={colors.cyan} />
          </Pressable>
        } 
      />

      {customersLoading ? (
        <Card style={styles.skeletonCard}><ActivityIndicator color={colors.cyan} /></Card>
      ) : customersError ? (
        <Card style={styles.errorCard}>
          <Text style={s.error}>{customersError}</Text>
          <Button label="Retry" variant="secondary" onPress={loadCustomers} style={{ marginTop: 10 }} />
        </Card>
      ) : (
        <Pressable onPress={() => setIsCustomerSheetOpen(true)}>
          <Card style={styles.customerSelector}>
            <Text style={styles.sectionTitle}>CUSTOMER</Text>
            {selectedCustomer ? (
              <View style={[s.row, { marginTop: 8 }]}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{String(selectedCustomer.fullName?.charAt(0) || "?").toUpperCase()}</Text>
                </View>
                <View style={s.flex}>
                  <Text style={s.title}>{selectedCustomer.fullName}</Text>
                  <Text style={s.meta}>{selectedCustomer.customerNumber} · {selectedCustomer.phone}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.muted} />
              </View>
            ) : (
              <Text style={[s.muted, { marginTop: 8 }]}>Tap to select customer...</Text>
            )}
          </Card>
        </Pressable>
      )}

      {selectedId && !customersLoading && (
        <>
          <View style={{ marginTop: spacing.md }}>
            <Card style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>CURRENT BALANCE</Text>
              <Text style={styles.balanceValue}>{rupees(currentBalance)}</Text>
              <Text style={styles.balanceSub}>Outstanding amount</Text>
            </Card>
            
            <View style={styles.kpiRow}>
              <View style={styles.kpiWrapper}><LedgerSummaryCard label="Disbursed" value={rupees(totals.debit)} accent="cyan" /></View>
              <View style={styles.kpiWrapper}><LedgerSummaryCard label="Received" value={rupees(totals.credit)} accent="green" /></View>
            </View>
          </View>
          <Text style={[styles.sectionTitle, { marginTop: spacing.lg, marginBottom: spacing.sm }]}>TRANSACTIONS</Text>
          
          {ledgerError ? (
            <Card style={styles.errorCard}>
              <Text style={s.error}>{ledgerError}</Text>
            </Card>
          ) : ledgerLoading ? (
            <View style={{ alignItems: 'center', padding: 40 }}>
              <ActivityIndicator color={colors.cyan} />
              <Text style={[s.muted, { marginTop: 10 }]}>Loading transactions...</Text>
            </View>
          ) : (
            <FlatList
              scrollEnabled={false}
              data={ledgerData.entries}
              keyExtractor={item => item.id}
              contentContainerStyle={{ paddingBottom: 80, gap: 12 }}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  <Ionicons name="document-text-outline" size={48} color={colors.subtle} />
                  <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.dark, marginTop: 15 }}>No transactions yet</Text>
                  <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 5 }}>This customer does not have any ledger transactions.</Text>
                </View>
              }
              renderItem={({ item }) => (
                <Card>
                  <View style={s.between}>
                    <Text style={s.title}>{item.type}</Text>
                    <Text style={[s.meta, { color: colors.dark }]}>{formatLedgerDate(item.transactionAt)}</Text>
                  </View>
                  <Text style={[s.meta, { marginTop: 4, marginBottom: 12 }]}>{item.transactionNumber}</Text>
                  
                  <View style={[s.row, { borderTopWidth: 1, borderColor: colors.border, paddingTop: 12, paddingBottom: 12 }]}>
                    <View style={s.flex}>
                      <Text style={styles.amtLabel}>Debit</Text>
                      <Text style={[styles.amtValue, { color: colors.error }]}>{item.debit ? rupees(item.debit) : "—"}</Text>
                    </View>
                    <View style={s.flex}>
                      <Text style={styles.amtLabel}>Credit</Text>
                      <Text style={[styles.amtValue, { color: colors.green }]}>{item.credit ? rupees(item.credit) : "—"}</Text>
                    </View>
                  </View>
                  
                  <View style={[s.between, { borderTopWidth: 1, borderColor: colors.border, paddingTop: 12 }]}>
                    <Text style={[styles.amtLabel, { color: colors.dark, fontSize: 13 }]}>Balance</Text>
                    <Text style={[styles.amtValue, { color: colors.dark, fontSize: 15 }]}>{rupees(item.balance)}</Text>
                  </View>
                </Card>
              )}
            />
          )}
        </>
      )}

      <Modal visible={isCustomerSheetOpen} transparent animationType="slide" onRequestClose={() => setIsCustomerSheetOpen(false)}>
        <View style={s.overlay}>
          <SafeAreaView edges={["bottom"]} style={styles.customerSheet}>
            <View style={styles.customerSheetHeader}>
              <View style={styles.customerSheetHeading}>
                <Text style={styles.customerSheetTitle}>Select Customer</Text>
                <Text style={styles.customerSheetSubtitle}>Choose a customer to view their ledger</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Close customer selector" hitSlop={8} onPress={() => setIsCustomerSheetOpen(false)} style={styles.customerSheetClose}><Ionicons name="close" size={22} color={colors.dark} /></Pressable>
            </View>
            
            <View style={styles.searchArea}>
              <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={21} color={colors.muted} />
                <TextInput
                  value={customerSearch} 
                  onChangeText={setCustomerSearch} 
                  placeholder="Search customers..." 
                  placeholderTextColor={colors.subtle}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.searchInput}
                />
                {customerSearch ? <Pressable accessibilityLabel="Clear customer search" onPress={() => setCustomerSearch("")}><Ionicons name="close-circle" size={20} color={colors.subtle}/></Pressable> : null}
              </View>
            </View>
            
            <FlatList 
              data={filteredCustomers}
              keyExtractor={c => c.id}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.customerList}
              renderItem={({ item }) => (
                <Pressable 
                  style={({ pressed }) => [styles.sheetRow, selectedId === item.id && styles.sheetRowSelected, pressed && styles.sheetRowPressed]}
                  onPress={() => {
                    if (selectedId !== item.id) {
                      setLedgerData({ customer: item, entries: [] }); 
                      setSelectedId(item.id);
                    }
                    setIsCustomerSheetOpen(false);
                  }}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{String(item.fullName?.charAt(0) || "?").toUpperCase()}</Text>
                  </View>
                  <View style={s.flex}>
                    <Text style={[s.title, selectedId === item.id && { color: colors.cyan }]}>{item.fullName}</Text>
                    <Text style={s.meta}>{item.customerNumber} · {item.phone}</Text>
                  </View>
                  <Ionicons name={selectedId === item.id ? "checkmark-circle" : "chevron-forward"} size={21} color={selectedId === item.id ? colors.cyan : colors.subtle} />
                </Pressable>
              )}
              ListEmptyComponent={<Text style={[s.muted, { textAlign: 'center', marginTop: 20 }]}>No customers found</Text>}
            />
          </SafeAreaView>
        </View>
      </Modal>

    </Screen>
  );
}

const styles = StyleSheet.create({
  customerSheet: { maxHeight: "78%", minHeight: 330, backgroundColor: colors.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, overflow: "hidden" },
  customerSheetHeader: { minHeight: 84, paddingHorizontal: 20, paddingVertical: 17, flexDirection: "row", alignItems: "center", gap: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  customerSheetHeading: { flex: 1, gap: 3 },
  customerSheetTitle: { color: colors.dark, fontFamily: fonts.bold, fontSize: 20 },
  customerSheetSubtitle: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12 },
  customerSheetClose: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  searchArea: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  customerList: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 28, gap: 8 },
  exportBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  skeletonCard: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 80,
  },
  errorCard: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  customerSelector: {
    paddingVertical: 14,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: radii.pill,
    backgroundColor: colors.cyanSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.cyan,
  },
  balanceCard: {
    backgroundColor: colors.dark,
    paddingVertical: 20,
    alignItems: 'center',
  },
  balanceLabel: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: '#94a3b8',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  balanceValue: {
    fontFamily: fonts.extrabold,
    fontSize: 28,
    color: '#fff',
    letterSpacing: -0.5,
  },
  balanceSub: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: '#64748b',
    marginTop: 6,
  },
  kpiWrapper: {
    flex: 1,
    minWidth: 0,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  summaryCard: {
    width: '100%',
    minHeight: 138,
    borderTopWidth: 3,
    justifyContent: 'space-between',
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryValue: {
    color: colors.dark,
    fontFamily: fonts.extrabold,
    fontSize: 21,
    letterSpacing: -0.4,
    marginTop: 12,
  },
  summaryLabel: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 12,
    marginTop: 6,
  },
  amtLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
  },
  amtValue: {
    fontFamily: fonts.bold,
    fontSize: 14,
    marginTop: 4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    gap: 10,
    backgroundColor: colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, paddingVertical: 0, color: colors.dark, fontFamily: fonts.regular, fontSize: 15 },
  sheetRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 15,
    backgroundColor: colors.white,
  },
  sheetRowSelected: { borderColor: colors.cyan, backgroundColor: colors.cyanSoft },
  sheetRowPressed: { opacity: 0.78 },
});
