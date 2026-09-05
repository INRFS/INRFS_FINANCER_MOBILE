import React, { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { SafeAreaView } from "react-native-safe-area-context";
import { Badge, Button, Card, Header, Screen } from "../../components/ui";
import { pageItems, platformApi } from "../../services/platformApi";
import { s } from "./styles";
import { Ionicons } from "../../components/AppIcon";
import { colors, fonts, radii, spacing } from "../../theme/tokens";
import { formatInr } from "../../utils/format";
import { groupServiceCharges, withLiveInterestCollected } from "../../utils/serviceCharge";
import { localDateOnly } from "../../utils/date";

const formatCurrency = formatInr;

export function FinancerServiceChargeScreen() {
  const [billing, setBilling] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [selectedStatement, setSelectedStatement] = useState<any | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setPageError('');
    try {
      const [invoicePayload, paymentPayload] = await Promise.all([
        platformApi.admin.allInvoices(),
        platformApi.payments.all(),
      ]);
      const grouped = groupServiceCharges(pageItems(invoicePayload), localDateOnly());
      const payments = pageItems(paymentPayload);
      setBilling(grouped.map((item, index) => index === 0 ? withLiveInterestCollected(item, payments) : item));
    } catch (e) {
      setPageError(e instanceof Error ? e.message : "Failed to load service charges.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const currentBilling = billing.length > 0 ? billing[0] : null;

  const handleContactOperations = async () => {
    try { 
      await platformApi.support.create({ 
        subject: 'Service charge assistance', 
        category: 'Billing', 
        priority: 'Medium', 
        description: 'Please contact me regarding the current service charge invoice.' 
      }); 
      Alert.alert("Request Submitted", "Operations team will contact you shortly.");
    } catch (error) { 
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to contact operations.");
    }
  };

  const handleDownloadStatement = async (statement: any) => {
    try {
      const cell = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] || character);
      const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;color:#10243e;padding:32px}h1{color:#12aee0;margin-bottom:4px}.sub{color:#64748b;margin-bottom:28px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.box{border:1px solid #dce5ee;border-radius:10px;padding:14px}.label{font-size:11px;color:#64748b;text-transform:uppercase}.value{font-size:18px;font-weight:700;margin-top:6px}.note{margin-top:24px;padding:14px;background:#fff7df;border:1px solid #f4d878;border-radius:10px}</style></head><body><h1>INRFS</h1><div class="sub">Monthly service charge statement · ${cell(statement.month)}</div><div class="grid"><div class="box"><div class="label">Interest Collected</div><div class="value">${cell(formatCurrency(statement.interestCollected))}</div></div><div class="box"><div class="label">Service Charge Rate</div><div class="value">${cell(statement.chargeRate)}%</div></div><div class="box"><div class="label">Amount Payable</div><div class="value">${cell(formatCurrency(statement.amountPayable))}</div></div><div class="box"><div class="label">Amount Paid</div><div class="value">${cell(formatCurrency(statement.amountPaid))}</div></div><div class="box"><div class="label">Outstanding</div><div class="value">${cell(formatCurrency(statement.outstanding))}</div></div><div class="box"><div class="label">Status</div><div class="value">${cell(statement.status)}</div></div></div><div class="note">Service charges are collected only through the official operations process. Do not make payment through any unauthorized channel.</div></body></html>`;
      const { uri } = await Print.printToFileAsync({ html });
      if (!await Sharing.isAvailableAsync()) throw new Error("PDF sharing is unavailable on this device.");
      await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: `Service charge statement - ${statement.month}` });
    } catch (e) {
      Alert.alert("Export Failed", e instanceof Error ? e.message : "Error");
    }
  };
  return (
    <Screen scroll={false} contentStyle={{ paddingBottom: 0 }}>
      <Header 
        title="Service Charge" 
        subtitle="Your monthly service charge based on interest collected" 
      />

      {pageError ? (
        <Card style={styles.errorCard}>
          <Text style={s.error}>{pageError}</Text>
          <Button label="Retry" variant="secondary" onPress={() => void load()} style={{ marginTop: 10 }} />
        </Card>
      ) : loading ? (
        <View style={{ gap: spacing.md }}>
          <Card style={[styles.skeletonCard, { height: 350 }]}><ActivityIndicator color={colors.cyan} /></Card>
          <Text style={styles.sectionHeading}>Service Charge History</Text>
          <Card style={[styles.skeletonCard, { height: 120 }]}><ActivityIndicator color={colors.cyan} /></Card>
        </View>
      ) : billing.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
          <View style={styles.emptyIcon}>
            <Ionicons name="document-text-outline" size={24} color={colors.subtle} />
          </View>
          <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.dark, marginTop: 15 }}>No billing records</Text>
          <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 5, textAlign: 'center' }}>No service charge information is available for this period.</Text>
        </View>
      ) : (
        <FlatList
          data={billing}
          keyExtractor={(item, index) => String(
            item.id
              ?? item.invoiceId
              ?? item.invoiceNumber
              ?? `${item.periodStart ?? item.month ?? "billing"}-${item.periodEnd ?? "period"}-${index}`
          )}
          contentContainerStyle={{ paddingBottom: 80 }}
          ListHeaderComponent={
            <>
              {currentBilling && (
                <View style={{ marginBottom: spacing.xl }}>
                  <Text style={[styles.sectionHeading, { marginBottom: 10 }]}>CURRENT BILLING</Text>
                  <Card style={styles.currentCard}>
                    <View style={styles.cardHeaderRow}>
                      <View>
                        <Text style={styles.periodLabel}>CURRENT BILLING PERIOD</Text>
                        <Text style={styles.periodMonth}>{currentBilling.month}</Text>
                      </View>
                      <Badge status={currentBilling.status} />
                    </View>

                    <View style={styles.calcContainer}>
                      <View style={styles.calcRow}>
                        <Text style={styles.calcLabel}>Interest Collected</Text>
                        <Text style={styles.calcValue}>{formatCurrency(currentBilling.interestCollected)}</Text>
                      </View>
                      <View style={styles.operatorRow}><Text style={styles.operatorText}>×</Text></View>
                      
                      <View style={styles.calcRow}>
                        <Text style={[styles.calcLabel, { color: '#8000df' }]}>Service Charge</Text>
                        <Text style={[styles.calcValue, { color: '#8000df' }]}>{currentBilling.chargeRate}%</Text>
                      </View>
                      <View style={styles.operatorRow}><Text style={styles.operatorText}>=</Text></View>

                      <View style={[styles.calcRow, styles.payableBox]}>
                        <Text style={[styles.calcLabel, { color: '#7e00dc' }]}>Amount Payable</Text>
                        <Text style={[styles.calcValue, { color: '#7e00dc', fontSize: 24 }]}>{formatCurrency(currentBilling.amountPayable)}</Text>
                      </View>
                    </View>

                    <View style={styles.warningBox}>
                      <Ionicons name="alert-circle-outline" size={18} color="#f2a900" />
                      <Text style={styles.warningText}>This charge is collected by our operations team. They will contact you shortly to arrange payment. Do NOT pay through any other channel.</Text>
                    </View>

                    <Button 
                      label="Contact Operations" 
                      icon="call-outline" 
                      onPress={() => void handleContactOperations()} 
                      style={{ marginTop: 16 }}
                    />
                  </Card>
                </View>
              )}
              
              <Text style={[styles.sectionHeading, { marginBottom: 10 }]}>SERVICE CHARGE HISTORY</Text>
            </>
          }
          renderItem={({ item }) => (
            <Card style={{ marginBottom: 12 }}>
              <View style={s.between}>
                <Text style={styles.historyMonth}>{item.month}</Text>
                <Badge status={item.status} />
              </View>
              
              <View style={styles.historyGrid}>
                <View style={styles.historyRow}>
                  <Text style={styles.historyLabel}>Interest Collected</Text>
                  <Text style={styles.historyValue}>{formatCurrency(item.interestCollected)}</Text>
                </View>
                <View style={styles.historyRow}>
                  <Text style={styles.historyLabel}>Service Charge</Text>
                  <Text style={styles.historyValue}>{item.chargeRate}%</Text>
                </View>
                <View style={styles.historyRow}>
                  <Text style={styles.historyLabel}>Amount Payable</Text>
                  <Text style={[styles.historyValue, { color: '#8500e8' }]}>{formatCurrency(item.amountPayable)}</Text>
                </View>
                <View style={styles.historyRow}>
                  <Text style={styles.historyLabel}>Amount Paid</Text>
                  {item.amountPaid > 0 ? (
                    <Text style={[styles.historyValue, { color: '#62c900' }]}>{formatCurrency(item.amountPaid)}</Text>
                  ) : (
                    <Text style={styles.historyDash}>—</Text>
                  )}
                </View>
                <View style={[styles.historyRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                  <Text style={styles.historyLabel}>Outstanding</Text>
                  {item.outstanding > 0 ? (
                    <Text style={[styles.historyValue, { color: '#f06400' }]}>{formatCurrency(item.outstanding)}</Text>
                  ) : (
                    <Text style={styles.historyDash}>—</Text>
                  )}
                </View>
              </View>

              <Button 
                label="View Statement" 
                variant="secondary" 
                icon="document-text-outline"
                onPress={() => setSelectedStatement(item)} 
                style={{ marginTop: 14 }}
              />
            </Card>
          )}
        />
      )}

      {/* STATEMENT BOTTOM SHEET MODAL */}
      <Modal visible={!!selectedStatement} transparent animationType="slide" onRequestClose={() => setSelectedStatement(null)}>
        <View style={s.overlay}>
          <SafeAreaView edges={["bottom", "top"]} style={s.sheet}>
            {selectedStatement && (
              <>
                <View style={styles.sheetHeader}>
                  <View>
                    <Text style={styles.sheetSubtitle}>SERVICE CHARGE STATEMENT</Text>
                    <Text style={styles.sheetTitle}>{selectedStatement.month}</Text>
                  </View>
                  <Pressable onPress={() => setSelectedStatement(null)} style={{ padding: 5 }}>
                    <Ionicons name="close" size={25} />
                  </Pressable>
                </View>
                
                <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
                  <View style={styles.brandRow}>
                    <View>
                      <Text style={styles.brandTitle}>INRFS</Text>
                      <Text style={styles.brandSub}>Financer Platform</Text>
                    </View>
                    <Ionicons name="checkmark-circle" size={28} color={colors.cyan} />
                  </View>

                  <View style={styles.statementGrid}>
                    <View style={styles.statementBox}>
                      <Text style={styles.statementLabel}>Billing Month</Text>
                      <Text style={styles.statementValue}>{selectedStatement.month}</Text>
                    </View>
                    <View style={styles.statementBox}>
                      <Text style={styles.statementLabel}>Interest Collected</Text>
                      <Text style={styles.statementValue}>{formatCurrency(selectedStatement.interestCollected)}</Text>
                    </View>
                    <View style={styles.statementBox}>
                      <Text style={styles.statementLabel}>Service Charge Rate</Text>
                      <Text style={styles.statementValue}>{selectedStatement.chargeRate}%</Text>
                    </View>
                    <View style={styles.statementBox}>
                      <Text style={styles.statementLabel}>Amount Payable</Text>
                      <Text style={[styles.statementValue, { color: '#8500e8' }]}>{formatCurrency(selectedStatement.amountPayable)}</Text>
                    </View>
                    <View style={styles.statementBox}>
                      <Text style={styles.statementLabel}>Amount Paid</Text>
                      <Text style={[styles.statementValue, { color: '#62c900' }]}>{formatCurrency(selectedStatement.amountPaid)}</Text>
                    </View>
                    <View style={styles.statementBox}>
                      <Text style={styles.statementLabel}>Outstanding</Text>
                      <Text style={[styles.statementValue, { color: '#f06400' }]}>{formatCurrency(selectedStatement.outstanding)}</Text>
                    </View>
                  </View>

                  <View style={[styles.warningBox, { marginTop: 20 }]}>
                    <Ionicons name="alert-circle-outline" size={18} color="#f2a900" />
                    <Text style={styles.warningText}>Service charges are collected only through the official operations process. Do not make payment through any unauthorized channel.</Text>
                  </View>

                  <Button 
                    label="Download Statement" 
                    icon="download-outline" 
                    onPress={() => void handleDownloadStatement(selectedStatement)} 
                    style={{ marginTop: 20 }}
                  />
                </ScrollView>
              </>
            )}
          </SafeAreaView>
        </View>
      </Modal>

    </Screen>
  );
}
const styles = StyleSheet.create({
  errorCard: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  skeletonCard: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeading: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.dark,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  currentCard: {
    borderTopWidth: 4,
    borderTopColor: '#8b00e8',
    padding: 18,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  periodLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: '#8300dc',
    letterSpacing: 0.5,
    backgroundColor: '#f1e3ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    overflow: 'hidden',
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  periodMonth: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.dark,
  },
  calcContainer: {
    gap: 8,
  },
  calcRow: {
    backgroundColor: '#f7f9fb',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  payableBox: {
    backgroundColor: '#fbf7ff',
    borderWidth: 2,
    borderColor: '#8500e8',
  },
  calcLabel: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: '#8397b1',
    marginBottom: 4,
  },
  calcValue: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.dark,
  },
  operatorRow: {
    alignItems: 'center',
    marginVertical: -4,
    zIndex: 10,
  },
  operatorText: {
    fontFamily: fonts.medium,
    fontSize: 20,
    color: '#8ba0b9',
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#fffaf0',
    borderWidth: 1,
    borderColor: '#ffe5a3',
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
    gap: 10,
  },
  warningText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#9a5a00',
    lineHeight: 18,
  },
  historyMonth: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.dark,
  },
  historyGrid: {
    marginTop: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 12,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
  },
  historyValue: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.dark,
  },
  historyDash: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: '#8ba0b9',
  },
  sheetHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sheetSubtitle: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: '#8300dc',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  sheetTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.dark,
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 20,
  },
  brandTitle: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.dark,
  },
  brandSub: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.muted,
  },
  statementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statementBox: {
    width: '100%',
    backgroundColor: '#fafbfd',
    borderWidth: 1,
    borderColor: '#e0e6ed',
    padding: 14,
    borderRadius: 8,
  },
  statementLabel: {
    fontFamily: fonts.semibold,
    fontSize: 10,
    color: '#7a90ac',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  statementValue: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.dark,
  }
});
