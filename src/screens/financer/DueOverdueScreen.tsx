import React, { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, ScrollView, Text, View, Modal, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, Field, Header, Segmented, KpiCard, Grid, Badge } from "../../components/ui";
import { pageItems, platformApi } from "../../services/platformApi";
import { RemoteState, useRemote } from "./shared";
import { s } from "./styles";
import { Ionicons } from "../../components/AppIcon";
import { colors, fonts, radii, spacing } from "../../theme/tokens";

const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

const getToday = () => {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
};

const normalizeDate = (date: any) => {
  if (!date) return null;
  if (date instanceof Date) return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const value = String(date).trim();
  if (value.toLowerCase() === 'today') return getToday();
  const match = value.match(/^(\d{1,2})[-\s]([A-Za-z]{3,})[-\s](\d{4})$/);
  if (match) {
    const day = Number(match[1]!);
    const monthText = match[2]!.substring(0, 3);
    const year = Number(match[3]!);
    const month = MONTHS[monthText.charAt(0).toUpperCase() + monthText.slice(1).toLowerCase()];
    if (month !== undefined && !Number.isNaN(day) && !Number.isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
  }
  return null;
};

const dateToKey = (date: any) => {
  const parsed = normalizeDate(date);
  if (!parsed) return '';
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
};

const monthToKey = (date: any) => {
  const parsed = normalizeDate(date);
  if (!parsed) return '';
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
};

const yearToKey = (date: any) => {
  const parsed = normalizeDate(date);
  if (!parsed) return '';
  return String(parsed.getFullYear());
};

const formatDisplayDate = (date: any) => {
  const parsed = normalizeDate(date);
  if (!parsed) return String(date || '-');
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const isOverdue = (item: any) => {
  const status = String(item.status || '').toLowerCase();
  return status.includes('overdue') || Number(item.daysOverdue) > 0;
};

const isDue = (item: any) => !isOverdue(item);

const rupees = (v: unknown) => `₹${Number(v ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
export function DueOverdueScreen() {
  const load = useCallback(() => platformApi.payments.allSchedules(), []);
  const state = useRemote(load, { items: [] } as any);

  const [activeTab, setActiveTab] = useState('Due Payments');
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState('Earliest First');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  // Filters
  const [dateFilter, setDateFilter] = useState('All Dates');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  const [busyRows, setBusyRows] = useState<Record<string, boolean>>({});

  const mappedItems = useMemo(() => {
    const today = getToday();
    return pageItems(state.data)
      .filter((item: any) => {
        const status = String(item.status ?? '').toLowerCase();
        const balance = Number(item.balance ?? item.remainingAmount ?? (Number(item.totalDue ?? 0) - Number(item.amountPaid ?? 0)));
        return status !== 'paid' && status !== 'success' && status !== 'completed' && balance > 0;
      })
      .map((item: any) => {
        const dueDate = normalizeDate(item.dueDate);
        const overdueDays = dueDate && dueDate < today ? Math.max(1, Math.floor((today.getTime() - dueDate.getTime()) / 86400000)) : 0;
        return {
          ...item,
          displayLoanId: item.loanNumber || item.loanId,
          dueAmount: item.balance ?? item.remainingAmount ?? (Number(item.totalDue ?? 0) - Number(item.amountPaid ?? 0)),
          daysOverdue: overdueDays,
          status: overdueDays > 0 || String(item.status).toLowerCase().includes('overdue') ? 'Overdue' : 'Due'
        };
      });
  }, [state.data]);

  const matchesDateFilter = useCallback((item: any) => {
    if (dateFilter === 'All Dates') return true;
    if (dateFilter === 'Specific Date') {
      if (!selectedDate) return true;
      return dateToKey(item.dueDate) === selectedDate;
    }
    if (dateFilter === 'Month') {
      if (!selectedMonth) return true;
      return monthToKey(item.dueDate) === selectedMonth;
    }
    if (dateFilter === 'Year') {
      if (!selectedYear) return true;
      return yearToKey(item.dueDate) === selectedYear;
    }
    return true;
  }, [dateFilter, selectedDate, selectedMonth, selectedYear]);

  const filteredItems = useMemo(() => {
    const searchValue = search.trim().toLowerCase();
    const filtered = mappedItems.filter((item: any) => {
      const matchesTab = activeTab === 'Overdue' ? isOverdue(item) : isDue(item);
      if (!matchesTab) return false;
      if (!matchesDateFilter(item)) return false;
      if (!searchValue) return true;
      const customer = String(item.customer || item.customerName || '').toLowerCase();
      const loanId = String(item.displayLoanId || item.loanId || '').toLowerCase();
      return customer.includes(searchValue) || loanId.includes(searchValue);
    });

    filtered.sort((a: any, b: any) => {
      const dateA = normalizeDate(a.dueDate);
      const dateB = normalizeDate(b.dueDate);
      const timeA = dateA ? dateA.getTime() : Number.MAX_SAFE_INTEGER;
      const timeB = dateB ? dateB.getTime() : Number.MAX_SAFE_INTEGER;
      return sortOrder === 'Earliest First' ? timeA - timeB : timeB - timeA;
    });

    return filtered;
  }, [mappedItems, activeTab, matchesDateFilter, search, sortOrder]);

  const summary = useMemo(() => {
    const dueItems = mappedItems.filter(isDue);
    const overdueItems = mappedItems.filter(isOverdue);

    const dueToday = dueItems.filter(item => dateToKey(item.dueDate) === dateToKey(new Date()));
    const dueTodayAmount = dueToday.reduce((total, item) => total + Number(item.dueAmount || 0), 0);

    const dueThisWeek = dueItems.filter(item => {
      const date = normalizeDate(item.dueDate);
      if (!date) return false;
      const today = getToday();
      const endOfWeek = new Date(today);
      const daysToSunday = 7 - today.getDay();
      endOfWeek.setDate(today.getDate() + daysToSunday);
      return date >= today && date <= endOfWeek;
    });
    const dueThisWeekAmount = dueThisWeek.reduce((total, item) => total + Number(item.dueAmount || 0), 0);
    const overdueAmount = overdueItems.reduce((total, item) => total + Number(item.dueAmount || 0), 0);

    return {
      dueTodayCount: dueToday.length,
      dueTodayAmount,
      dueWeekCount: dueThisWeek.length,
      dueWeekAmount: dueThisWeekAmount,
      overdueCount: overdueItems.length,
      overdueAmount,
    };
  }, [mappedItems]);

  const handleSendReminder = async (item: any) => {
    const itemId = item.loanId;
    if (busyRows[itemId]) return;
    setBusyRows(prev => ({ ...prev, [itemId]: true }));
    try {
      await platformApi.collections.remind(itemId, { 
        type: 'PaymentReminder', 
        notes: `Payment reminder queued for ${item.customer || item.customerName}` 
      });
      Alert.alert("Success", `Payment reminder sent to ${item.customer || item.customerName}`);
    } catch (error) {
      Alert.alert("Failed to send reminder", error instanceof Error ? error.message : String(error));
    } finally {
      setBusyRows(prev => ({ ...prev, [itemId]: false }));
    }
  };

  const clearFilters = () => {
    setDateFilter('All Dates');
    setSelectedDate('');
    setSelectedMonth('');
    setSelectedYear('');
    setSearch('');
  };

  const listHeader = <View style={styles.listHeader}>
    <Header title="Upcoming Dues" subtitle="Track upcoming and overdue payments" />
    {summary.overdueCount > 0 && (
      <Pressable onPress={() => setActiveTab('Overdue')} style={({ pressed }) => [styles.alertBanner, pressed && { opacity: 0.8 }]}>
        <Ionicons name="warning-outline" size={20} color={colors.error} />
        <View style={s.flex}><Text style={styles.alertTitle}>{summary.overdueCount} overdue payment{summary.overdueCount !== 1 ? 's' : ''}</Text><Text style={styles.alertSubtitle}>{rupees(summary.overdueAmount)} needs follow-up</Text></View>
        <Button label="Review" variant="secondary" onPress={() => setActiveTab('Overdue')} />
      </Pressable>
    )}
    <Text style={styles.sectionTitle}>Collection Overview</Text>
    <Grid>
      <KpiCard label="Due Today" value={rupees(summary.dueTodayAmount)} icon="cash-outline" accent="green" />
      <KpiCard label="This Week" value={rupees(summary.dueWeekAmount)} icon="calendar-outline" accent="cyan" />
      <KpiCard label="Overdue" value={rupees(summary.overdueAmount)} icon="warning-outline" accent="error" />
      <KpiCard label="Attention" value={`${summary.overdueCount} account${summary.overdueCount !== 1 ? 's' : ''}`} icon="alert-circle-outline" accent="orange" />
    </Grid>
    <Segmented options={[`Due Payments (${mappedItems.filter(isDue).length})`, `Overdue (${summary.overdueCount})`]} value={activeTab === 'Overdue' ? `Overdue (${summary.overdueCount})` : `Due Payments (${mappedItems.filter(isDue).length})`} onChange={(val) => setActiveTab(val.startsWith('Overdue') ? 'Overdue' : 'Due Payments')} />
    <View style={s.row}>
      <Field label="" value={search} onChangeText={setSearch} placeholder="Search customer or loan ID..." style={{ flex: 1, marginTop: -7 }} />
      {search ? <Pressable onPress={() => setSearch('')} style={styles.clearSearch}><Ionicons name="close" size={16} color={colors.muted} /></Pressable> : null}
    </View>
    <View style={s.row}>
      <Button style={s.flex} label="Filter" icon="options-outline" variant="secondary" onPress={() => setIsFilterSheetOpen(true)} />
      <Button style={s.flex} label={sortOrder} icon="options-outline" variant="secondary" onPress={() => setSortOrder(prev => prev === 'Earliest First' ? 'Latest First' : 'Earliest First')} />
    </View>
    <RemoteState {...state} retry={() => void state.refresh()} />
  </View>;

// ... part 3
  return (
    <View style={styles.screen}>
      <FlatList
        style={{ flex: 1 }}
        nestedScrollEnabled
        data={filteredItems}
        keyExtractor={(item, idx) => item.id || `${item.loanId}-${idx}`}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 120, gap: 14, flexGrow: 1 }}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          !state.loading ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Ionicons name="calendar-outline" size={48} color={colors.subtle} />
              <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.dark, marginTop: 15 }}>
                {mappedItems.length === 0 ? "You're all caught up" : `No ${activeTab === 'Overdue' ? 'overdue' : 'due'} payments found`}
              </Text>
              <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 5, textAlign: 'center', paddingHorizontal: 20 }}>
                {mappedItems.length === 0 ? "No upcoming or overdue payments require attention." : "There are no payments matching your current filters."}
              </Text>
              {(dateFilter !== 'All Dates' || search !== '') && (
                <Button label="Clear Filters" variant="ghost" onPress={clearFilters} style={{ marginTop: 15 }} />
              )}
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const custName = item.customer || item.customerName || 'Unknown';
          const initial = custName.charAt(0).toUpperCase();
          const itemId = item.loanId;
          const isToday = dateToKey(item.dueDate) === dateToKey(new Date());

          return (
            <Card style={activeTab === 'Overdue' ? { borderColor: '#fecaca', backgroundColor: '#fffcfc' } : {}}>
              <View style={s.between}>
                <View style={[s.row, { flex: 1 }]}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initial}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.title}>{custName}</Text>
                    <Text style={s.meta}>{item.displayLoanId}</Text>
                  </View>
                </View>
                <Badge status={item.status} />
              </View>
              
              <View style={{ marginTop: 14 }}>
                <Text style={styles.amount}>{rupees(item.dueAmount)}</Text>
                {activeTab === 'Overdue' ? (
                  <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.error, marginTop: 4 }}>
                    {item.daysOverdue || 0} {Number(item.daysOverdue) === 1 ? 'Day' : 'Days'} Overdue
                  </Text>
                ) : (
                  <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: isToday ? colors.error : colors.dark, marginTop: 4 }}>
                    {isToday ? 'Due Today' : `Due ${formatDisplayDate(item.dueDate)}`}
                  </Text>
                )}
                {activeTab === 'Overdue' && (
                  <Text style={[s.meta, { marginTop: 4 }]}>Due: {formatDisplayDate(item.dueDate)}</Text>
                )}
              </View>

              <View style={{ marginTop: 16 }}>
                <Button 
                  label="Send Reminder" 
                  icon="send-outline" 
                  loading={busyRows[itemId]} 
                  onPress={() => handleSendReminder(item)} 
                />
              </View>
            </Card>
          );
        }}
      />

      <Modal visible={isFilterSheetOpen} transparent animationType="slide" onRequestClose={() => setIsFilterSheetOpen(false)}>
        <View style={s.overlay}>
          <SafeAreaView edges={["bottom", "top"]} style={s.sheet}>
            <View style={s.between}>
              <Text style={s.sheetTitle}>Filters</Text>
              <Pressable onPress={() => setIsFilterSheetOpen(false)}><Ionicons name="close" size={25} /></Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20, gap: 15 }}>
              <Text style={s.label}>Date Range</Text>
              <Segmented options={["All Dates", "Specific Date", "Month", "Year"]} value={dateFilter} onChange={setDateFilter} />
              
              {dateFilter === 'Specific Date' && (
                <Field label="Select Date (YYYY-MM-DD)" value={selectedDate} onChangeText={setSelectedDate} placeholder="YYYY-MM-DD" />
              )}
              {dateFilter === 'Month' && (
                <Field label="Select Month (YYYY-MM)" value={selectedMonth} onChangeText={setSelectedMonth} placeholder="YYYY-MM" />
              )}
              {dateFilter === 'Year' && (
                <Field label="Select Year (YYYY)" value={selectedYear} onChangeText={setSelectedYear} placeholder="YYYY" />
              )}
            </ScrollView>
            <View style={[s.row, { padding: 20, paddingTop: 10, borderTopWidth: 1, borderColor: colors.border }]}>
              <Button style={s.flex} label="Clear Filters" variant="ghost" onPress={() => { clearFilters(); setIsFilterSheetOpen(false); }} />
              <Button style={s.flex} label="Apply" onPress={() => setIsFilterSheetOpen(false)} />
            </View>
          </SafeAreaView>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  listHeader: { paddingTop: spacing.xl, paddingBottom: spacing.md, gap: spacing.xl },
  alertBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: radii.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  alertTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#991b1b',
  },
  alertSubtitle: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: '#b91c1c',
    marginTop: 2,
  },
  sectionTitle: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: -8,
  },
  clearSearch: {
    position: 'absolute',
    right: 12,
    top: 24,
    padding: 4,
    backgroundColor: colors.background,
    borderRadius: radii.pill,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.cyanSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.cyan,
  },
  amount: {
    fontFamily: fonts.extrabold,
    fontSize: 22,
    color: colors.dark,
    letterSpacing: -0.5,
  }
});
