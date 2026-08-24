import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, ScrollView, Share, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { Button, Card, Field, Header, Screen } from "../../components/ui";
import { pageItems, platformApi } from "../../services/platformApi";
import { s } from "./styles";
import { Ionicons } from "../../components/AppIcon";
import { colors, fonts, radii, spacing } from "../../theme/tokens";

const REPORT_TYPES = ['customers', 'loans', 'payments', 'interest-schedule', 'overdue'];

const reportLabel = (value: string) => value.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const columnLabel = (value: string) => value.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase());

const displayValue = (value: any) => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') {
    const str = JSON.stringify(value);
    return str.length > 50 ? str.slice(0, 47) + '...' : str;
  }
  return String(value);
};

export function ReportsScreen() {
  const [type, setType] = useState('customers');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  
  const [payload, setPayload] = useState({ items: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try { 
      setPayload(await platformApi.reports.get(type, { search, from, to, pageSize: 100 }) as any); 
    }
    catch (reason) { 
      setError(reason instanceof Error ? reason.message : String(reason)); 
    }
    finally { 
      setLoading(false); 
    }
  }, [from, search, to, type]);

  useEffect(() => { 
    void load(); 
  }, [load]);

  const rows = pageItems(payload);
  const columns = useMemo(() => [...new Set(rows.flatMap((row) => Object.keys(row)))].filter((key) => !['createdBy', 'updatedBy'].includes(key)), [rows]);

  const exportCsv = async () => {
    if (!rows.length) return;
    try {
      const csv = [columns, ...rows.map((row: any) => columns.map((key) => row[key]))]
        .map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(','))
        .join('\r\n');
      await Share.share({ title: `${type}-${new Date().toISOString().slice(0, 10)}.csv`, message: csv });
    } catch (e) {
      Alert.alert("Export Failed", e instanceof Error ? e.message : "Error");
    }
  };
  return (
    <Screen>
      <Header 
        title="Reports" 
        subtitle="View and export live reports" 
        action={
          <Pressable 
            onPress={() => void exportCsv()} 
            disabled={!rows.length || loading} 
            style={({ pressed }) => [styles.exportBtn, pressed && { opacity: 0.7 }, (!rows.length || loading) && { opacity: 0.5 }]}
          >
            <Ionicons name="download-outline" size={20} color={colors.cyan} />
          </Pressable>
        } 
      />

      <View style={{ marginHorizontal: -spacing.md, marginBottom: spacing.md }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.md, gap: 10 }}>
          {REPORT_TYPES.map((name) => (
            <Pressable
              key={name}
              onPress={() => {
                if (type !== name) {
                  setPayload({ items: [] }); // Clear old data visually
                  setType(name);
                }
              }}
              style={({ pressed }) => [
                styles.tab,
                type === name && styles.tabActive,
                pressed && { opacity: 0.8 }
              ]}
            >
              <Text style={[styles.tabText, type === name && styles.tabTextActive]}>
                {reportLabel(name)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <Card style={styles.filterCard}>
        <Field label="" value={search} onChangeText={setSearch} placeholder="Search records..." style={{ borderBottomWidth: 1, borderColor: colors.border, paddingBottom: 10, marginBottom: 10 }} />
        <View style={[s.row, { marginBottom: 14 }]}>
          <View style={s.flex}>
            <Text style={styles.dateLabel}>FROM</Text>
            <Field label="" value={from} onChangeText={setFrom} placeholder="YYYY-MM-DD" style={{ marginTop: 5 }} />
          </View>
          <View style={s.flex}>
            <Text style={styles.dateLabel}>TO</Text>
            <Field label="" value={to} onChangeText={setTo} placeholder="YYYY-MM-DD" style={{ marginTop: 5 }} />
          </View>
        </View>
        <Button label={loading ? 'Loading...' : 'Run Report'} onPress={() => void load()} loading={loading} />
      </Card>

      <View style={[s.between, { marginTop: spacing.md, marginBottom: spacing.sm }]}>
        <View>
          <Text style={styles.reportTitle}>{reportLabel(type)} Report</Text>
          <Text style={styles.reportSub}>Live records matching the selected filters</Text>
        </View>
        <View style={styles.recordCount}>
          <Text style={styles.recordCountText}>{rows.length} {rows.length === 1 ? 'record' : 'records'}</Text>
        </View>
      </View>
      {error ? (
        <Card style={styles.errorCard}>
          <Text style={s.error}>{error}</Text>
          <Button label="Retry" variant="secondary" onPress={() => void load()} style={{ marginTop: 10 }} />
        </Card>
      ) : loading ? (
        <View style={{ gap: 12 }}>
          {[1, 2, 3].map((_, i) => (
            <Card key={`skel-${i}`} style={styles.skeletonCard}>
              <ActivityIndicator color={colors.cyan} />
            </Card>
          ))}
        </View>
      ) : rows.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
          <View style={styles.emptyIcon}>
            <Ionicons name="bar-chart-outline" size={24} color={colors.subtle} />
          </View>
          <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.dark, marginTop: 15 }}>No records found</Text>
          <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 5, textAlign: 'center' }}>Try changing the report type or filters.</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item, index) => item.id ?? `report-row-${index}`}
          contentContainerStyle={{ paddingBottom: 80, gap: 12 }}
          renderItem={({ item, index }) => {
            // Determine primary field (first non-ID string field)
            let primaryKey = columns.find(c => c !== 'id' && c !== 'customerNumber' && c !== 'loanNumber' && typeof item[c] === 'string' && item[c].length > 0) || columns[0];
            
            // Prefer name/title fields if present
            const explicitTitle = columns.find(c => c.toLowerCase().includes('name') || c.toLowerCase().includes('title'));
            if (explicitTitle && item[explicitTitle]) primaryKey = explicitTitle;

            const primaryValue = primaryKey ? item[primaryKey as string] : null;
            const secondaryKey = columns.find(c => (c.toLowerCase().includes('id') || c.toLowerCase().includes('number')) && c !== primaryKey);
            const secondaryValue = secondaryKey ? item[secondaryKey as string] : null;

            const remainingColumns = columns.filter(c => c !== primaryKey && c !== secondaryKey);

            return (
              <Card>
                <View style={s.between}>
                  <Text style={s.title}>{displayValue(primaryValue)}</Text>
                  {secondaryValue && <Text style={s.meta}>{displayValue(secondaryValue)}</Text>}
                </View>
                
                <View style={{ marginTop: 12, gap: 8 }}>
                  {remainingColumns.map((col) => (
                    <View key={col} style={[s.row, { justifyContent: 'space-between' }]}>
                      <Text style={styles.fieldLabel}>{columnLabel(col)}</Text>
                      <Text style={styles.fieldValue}>{displayValue(item[col])}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            );
          }}
        />
      )}
      
      {!loading && !error && rows.length > 0 && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>Showing <Text style={{ fontFamily: fonts.bold, color: colors.dark }}>{rows.length}</Text> records</Text>
        </View>
      )}

    </Screen>
  );
}

const styles = StyleSheet.create({
  exportBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.cyanSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.cyanSoft,
    borderColor: colors.cyan,
  },
  tabText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.muted,
  },
  tabTextActive: {
    fontFamily: fonts.bold,
    color: colors.cyan,
  },
  filterCard: {
    paddingTop: 10,
    paddingBottom: 14,
  },
  dateLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.muted,
    marginBottom: -2,
    marginLeft: 2,
  },
  reportTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.dark,
  },
  reportSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  recordCount: {
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.md,
  },
  recordCountText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.muted,
  },
  skeletonCard: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorCard: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.muted,
  },
  fieldValue: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.dark,
    textAlign: 'right',
    flex: 1,
    marginLeft: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    paddingBottom: spacing.xl,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  footerText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.muted,
  }
});
