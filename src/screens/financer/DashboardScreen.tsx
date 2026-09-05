import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, Modal, ScrollView, RefreshControl, Dimensions, Pressable, Platform, KeyboardAvoidingView } from "react-native";
import { Button, Card, Badge, Field, Segmented } from "../../components/ui";
import { pageItems, platformApi } from "../../services/platformApi";
import { useAuth } from "../../auth/AuthContext";
import { colors, fonts, radii, shadows, spacing } from "../../theme/tokens";
import { Ionicons } from "../../components/AppIcon";
import Svg, { Rect, G, Text as SvgText, Path, Circle } from "react-native-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRemote, RemoteState } from "./shared";
import { localDateOnly } from "../../utils/date";
import { formatInr } from "../../utils/format";

const { width } = Dimensions.get("window");

const rupees = formatInr;

const getCoordinatesForPercent = (percent: number) => {
  const x = Math.cos(2 * Math.PI * percent);
  const y = Math.sin(2 * Math.PI * percent);
  return [x, y];
};

function DonutChart({ data }: { data: { name: string; value: number; color: string }[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) return <Text style={styles.emptyText}>No data available</Text>;

  let cumulativePercent = 0;
  
  return (
    <View style={styles.donutContainer}>
      <Svg width={140} height={140} viewBox="-1 -1 2 2" style={{ transform: [{ rotate: "-90deg" }] }}>
        {data.map(slice => {
          if (slice.value === 0) return null;
          const coordsStart = getCoordinatesForPercent(cumulativePercent);
          const startX = coordsStart[0] as number;
          const startY = coordsStart[1] as number;
          cumulativePercent += slice.value / total;
          const coordsEnd = getCoordinatesForPercent(cumulativePercent);
          const endX = coordsEnd[0] as number;
          const endY = coordsEnd[1] as number;
          const largeArcFlag = slice.value / total > 0.5 ? 1 : 0;

          if (slice.value === total) {
             return <Circle key={slice.name} r="0.75" cx="0" cy="0" fill="transparent" stroke={slice.color} strokeWidth="0.5" />
          }

          const pathData = [
            `M ${startX * 0.75} ${startY * 0.75}`,
            `A 0.75 0.75 0 ${largeArcFlag} 1 ${endX * 0.75} ${endY * 0.75}`
          ].join(' ');

          return <Path key={slice.name} d={pathData} fill="none" stroke={slice.color} strokeWidth="0.5" />;
        })}
      </Svg>
      <View style={styles.legendContainer}>
        {data.map(slice => (
          <View key={slice.name} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
            <Text style={styles.legendText}>{slice.name} ({slice.value})</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function BarChart({ data }: { data: { month: string; collected: number }[] }) {
  if (!data || data.length === 0) return <Text style={styles.emptyText}>No data available</Text>;

  const chartWidth = width - 70;
  const chartHeight = 150;
  const padding = 20;
  const maxVal = Math.max(...data.map(d => d.collected), 1);
  const barWidth = Math.max((chartWidth - padding * 2) / data.length - 10, 8);

  return (
    <View style={{ marginTop: 10 }}>
      <Svg width={chartWidth} height={chartHeight}>
        {data.map((d, i) => {
          const barHeight = (d.collected / maxVal) * (chartHeight - padding - 15);
          const x = padding + i * (barWidth + 10);
          const y = chartHeight - padding - barHeight;
          return (
            <G key={d.month}>
              <Rect x={x} y={y} width={barWidth} height={barHeight} fill={colors.cyan} rx={2} />
              <SvgText x={x + barWidth / 2} y={chartHeight - 5} fontSize="9" fill={colors.muted} textAnchor="middle">
                {d.month.substring(0, 3)}
              </SvgText>
            </G>
          );
        })}
      </Svg>
      <View style={styles.barLegend}>
        <View style={[styles.legendDot, { backgroundColor: colors.cyan }]} />
        <Text style={styles.legendText}>Collected</Text>
      </View>
    </View>
  );
}

export function DashboardScreen() {
  const { user } = useAuth();
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Financer';
  const load = useCallback(async () => {
    const [dashboard, paymentsPayload] = await Promise.all([
      platformApi.dashboard.financer(),
      platformApi.payments.all().catch(() => null),
    ]);
    const paymentItems = pageItems<any>(paymentsPayload);
    const actualInterestCollected = paymentItems
      .filter((payment) => {
        const status = String(payment.status ?? "").toLowerCase();
        return status === "completed" || status === "paid" || !status;
      })
      .reduce((total, payment) => total + Number(payment.interestAmount ?? 0), 0);

    return {
      ...dashboard,
      totalInterestCollected:
        dashboard.totalInterestCollected ??
        dashboard.total_interest_collected ??
        (paymentItems.length > 0 ? actualInterestCollected : 0),
    };
  }, []);
  const state = useRemote(load, {
    totalCustomers: 0,
    activeLoans: 0,
    totalPrincipal: 0,
    principalOutstanding: 0,
    totalInterestCollected: 0,
    loanStatusData: [],
    monthlyCollections: [],
    upcomingPayments: []
  } as any); 

  const d = state.data;
  const loanStatusData = (d.loanStatusData || []).map((item: any, index: number) => ({
    name: item.status,
    value: item.count,
    color: ['#74D900', '#10AFE9', '#FFB020', '#F04444'][index % 4]
  }));
  const monthlyCollections = (d.monthlyCollections || []).map((item: any) => ({
    ...item,
    collected: item.amount
  }));
  const payments = d.upcomingPayments || [];

  const [recordModalItem, setRecordModalItem] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("Upi");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  const handleRecordPayment = (item: any) => {
    setRecordModalItem(item);
    setPaymentAmount(String(item.amount || ""));
    setPaymentMode("Upi");
    setPaymentError("");
  };

  const handleConfirmPayment = async () => {
    const amt = Number(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      setPaymentError("Please enter a valid amount greater than 0");
      return;
    }

    setIsSubmitting(true);
    setPaymentError("");
    try {
      await platformApi.payments.record({
        loanId: recordModalItem.loanId,
        paymentScheduleId: recordModalItem.id,
        amount: amt,
        receivedAt: new Date().toISOString(),
        mode: paymentMode,
        externalReference: null,
        notes: null
      });
      setRecordModalItem(null);
      await state.refresh();
    } catch (error: any) {
      setPaymentError(error.message || "Failed to record payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View pointerEvents="none" style={styles.ambient}>
        <View style={styles.ambientCyan} />
        <View style={styles.ambientPurple} />
      </View>
      
      <ScrollView 
        contentContainerStyle={styles.screen} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={state.loading && !!d.totalCustomers} onRefresh={state.refresh} tintColor={colors.cyan} />}
      >
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.welcomeText}>Welcome, {displayName}</Text>
              <Text style={styles.subtitleText}>Here&apos;s your loan and customer overview for today.</Text>
            </View>
          </View>
          <View style={styles.dateBadge}>
            <Ionicons name="calendar-outline" size={14} color={colors.dark} />
            <Text style={styles.dateText}>{new Date().toLocaleDateString('en-IN')}</Text>
          </View>
        </View>

        <RemoteState {...state} retry={() => void state.refresh()}/>

        {!state.loading || d.totalCustomers ? (
          <>
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, styles.statCardDark]}>
                <View style={[styles.statIcon, { backgroundColor: "rgba(7, 29, 67, 0.08)" }]}>
                   <Ionicons name="people-outline" size={20} color={colors.dark} />
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statLabel}>TOTAL CUSTOMERS</Text>
                  <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>{d.totalCustomers ?? 0}</Text>
                </View>
              </View>

              <View style={[styles.statCard, styles.statCardCyan]}>
                <View style={[styles.statIcon, { backgroundColor: "rgba(16, 175, 233, 0.12)" }]}>
                   <Ionicons name="cash-outline" size={20} color={colors.cyan} />
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statLabel}>ACTIVE LOANS</Text>
                  <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>{d.activeLoans ?? 0}</Text>
                </View>
              </View>

              <View style={[styles.statCard, styles.statCardPurple]}>
                <View style={[styles.statIcon, { backgroundColor: "rgba(125, 31, 232, 0.12)" }]}>
                   <Ionicons name="trending-up-outline" size={20} color={colors.purple} />
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statLabel}>TOTAL GIVEN</Text>
                  <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>{rupees(d.totalPrincipal ?? 0)}</Text>
                </View>
              </View>

              <View style={[styles.statCard, styles.statCardNavy]}>
                <View style={[styles.statIcon, { backgroundColor: "rgba(7, 29, 67, 0.15)" }]}>
                   <Ionicons name="card-outline" size={20} color={colors.dark} />
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statLabel}>OUTSTANDING</Text>
                  <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>{rupees(d.principalOutstanding ?? 0)}</Text>
                </View>
              </View>

              <View style={[styles.statCard, styles.statCardGreen]}>
                <View style={[styles.statIcon, { backgroundColor: "rgba(116, 217, 0, 0.12)" }]}>
                  <Ionicons name="cash-outline" size={20} color="#4A8200" />
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statLabel}>TOTAL INTEREST COLLECTED</Text>
                  <Text style={styles.statValue}>
                    {rupees(
                      d.totalInterestCollected ??
                      d.total_interest_collected ??
                      d.interestCollected ??
                      d.interest_collected ??
                      d.totalInterest ??
                      d.total_interest ??
                      0
                    )}
                  </Text>
                </View>
              </View>
            </View>

            <Card style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Text style={styles.chartTitle}>Collection Overview</Text>
                <Text style={styles.chartSub}>Monthly interest collected</Text>
              </View>
              <BarChart data={monthlyCollections} />
            </Card>

            <Card style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Text style={styles.chartTitle}>Loan Status</Text>
                <Text style={styles.chartSub}>Distribution of {d.activeLoans ?? 0} active loans</Text>
              </View>
              <DonutChart data={loanStatusData} />
            </Card>

            <View style={styles.paymentsSection}>
              <Text style={styles.sectionTitle}>Upcoming & Due Payments</Text>
              <Text style={styles.sectionSub}>Immediate payments requiring collection action</Text>
              
              {payments.length === 0 ? (
                <Text style={styles.emptyText}>No upcoming payments</Text>
              ) : (
                <View style={styles.paymentsList}>
                  {payments.map((row: any) => (
                    <Card key={row.id} style={styles.paymentCard}>
                      <View style={styles.paymentHeader}>
                        <View>
                          <Text style={styles.paymentCustomer}>{row.customer}</Text>
                          <Text style={styles.paymentLoanId}>{row.loanNumber ?? row.displayId ?? row.loanId}</Text>
                        </View>
                        <Badge status={(row.status || (String(row.dueDate).slice(0, 10) <= localDateOnly() ? "Due" : "Upcoming")) as any} />
                      </View>
                      
                      <View style={styles.paymentDetails}>
                        <View style={styles.paymentDetailCol}>
                          <Text style={styles.paymentDetailLabel}>Amount</Text>
                          <Text style={styles.paymentDetailValue}>{rupees(row.amount)}</Text>
                        </View>
                        <View style={styles.paymentDetailCol}>
                          <Text style={styles.paymentDetailLabel}>Due Date</Text>
                          <Text style={styles.paymentDetailValue}>{row.dueDate}</Text>
                        </View>
                      </View>

                      <View style={styles.paymentAction}>
                        {row.status !== 'Paid' ? (
                          <Button 
                            variant="primary" 
                            accent="cyan" 
                            label="Record Payment" 
                            icon="add" 
                            onPress={() => handleRecordPayment(row)} 
                          />
                        ) : (
                          <View style={styles.paidDone}>
                             <Ionicons name="checkmark-circle" size={16} color="#4A8200" />
                             <Text style={styles.paidDoneText}>Recorded</Text>
                          </View>
                        )}
                      </View>
                    </Card>
                  ))}
                </View>
              )}
            </View>
          </>
        ) : null}
      </ScrollView>

      <Modal visible={!!recordModalItem} transparent animationType="slide" onRequestClose={() => !isSubmitting && setRecordModalItem(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Payment</Text>
              <Pressable onPress={() => !isSubmitting && setRecordModalItem(null)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={colors.dark} />
              </Pressable>
            </View>
            
            {recordModalItem && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBody}>
                <Text style={styles.modalSubtitle}>For {recordModalItem.customer}</Text>
                
                <View style={styles.modalInfoBox}>
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>Loan Number:</Text>
                    <Text style={styles.modalInfoValue}>{recordModalItem.loanNumber ?? recordModalItem.displayId ?? recordModalItem.loanId}</Text>
                  </View>
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>Due Amount:</Text>
                    <Text style={styles.modalInfoValue}>{rupees(recordModalItem.amount)}</Text>
                  </View>
                </View>

                {paymentError ? <Text style={styles.errorText}>{paymentError}</Text> : null}

                <Field 
                  label="Amount Received (₹)" 
                  keyboardType="numeric" 
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                  editable={!isSubmitting}
                />

                <View style={styles.fieldWrap}>
                  <Text style={styles.label}>Payment Mode</Text>
                  <Segmented 
                    options={["Upi", "Cash", "BankTransfer"]}
                    value={paymentMode}
                    onChange={setPaymentMode}
                    accent="cyan"
                  />
                </View>

                <View style={styles.modalActions}>
                  <Button 
                    style={{ flex: 1 }} 
                    label="Cancel" 
                    variant="secondary" 
                    onPress={() => setRecordModalItem(null)} 
                    disabled={isSubmitting} 
                  />
                  <Button 
                    style={{ flex: 1 }} 
                    label="Confirm Payment" 
                    variant="primary" 
                    accent="cyan" 
                    onPress={handleConfirmPayment} 
                    loading={isSubmitting} 
                  />
                </View>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  ambient: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
  ambientCyan: { position: "absolute", width: 230, height: 230, borderRadius: 115, backgroundColor: "rgba(16,175,233,0.08)", top: -105, right: -82 },
  ambientPurple: { position: "absolute", width: 190, height: 190, borderRadius: 95, backgroundColor: "rgba(125,31,232,0.055)", top: 255, left: -110 },
  screen: { padding: spacing.lg, paddingTop: spacing.xl, paddingBottom: 104, gap: spacing.xl },
  
  headerCard: {
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
    gap: 14
  },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  welcomeText: { color: colors.dark, fontFamily: fonts.extrabold, fontSize: 22 },
  subtitleText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 13, marginTop: 4 },
  dateBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.background, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.pill, alignSelf: "flex-start", borderWidth: 1, borderColor: colors.border },
  dateText: { color: colors.dark, fontFamily: fonts.semibold, fontSize: 12 },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, justifyContent: "space-between" },
  statCard: { width: "47.5%", minHeight: 126, backgroundColor: colors.white, padding: 16, borderRadius: radii.md, borderWidth: 1, borderTopWidth: 3, borderColor: colors.border, ...shadows.card, gap: 12 },
  statCardDark: { borderTopColor: colors.dark },
  statCardCyan: { borderTopColor: colors.cyan },
  statCardPurple: { borderTopColor: colors.purple },
  statCardNavy: { borderTopColor: "#52647A" },
  statCardGreen: { borderTopColor: "#74D900" },
  statIcon: { width: 38, height: 38, borderRadius: radii.md, alignItems: "center", justifyContent: "center" },
  statContent: { gap: 4 },
  statLabel: { color: colors.muted, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.5 },
  statValue: { color: colors.dark, fontFamily: fonts.extrabold, fontSize: 17 },

  chartCard: { gap: 8 },
  chartHeader: { gap: 4 },
  chartTitle: { color: colors.dark, fontFamily: fonts.bold, fontSize: 16 },
  chartSub: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12 },
  barLegend: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12 },

  donutContainer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },
  legendContainer: { flex: 1, paddingLeft: 16, gap: 10 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 11 },
  emptyText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 13, textAlign: "center", paddingVertical: 20 },

  paymentsSection: { gap: 6 },
  sectionTitle: { color: colors.dark, fontFamily: fonts.bold, fontSize: 18 },
  sectionSub: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12, marginBottom: 10 },
  paymentsList: { gap: 12 },
  paymentCard: { gap: 14, padding: 16 },
  paymentHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  paymentCustomer: { color: colors.dark, fontFamily: fonts.bold, fontSize: 15 },
  paymentLoanId: { color: colors.cyan, fontFamily: fonts.semibold, fontSize: 13, marginTop: 2 },
  paymentDetails: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderTopWidth: 1, borderTopColor: "#EDF2F7", borderBottomWidth: 1, borderBottomColor: "#EDF2F7" },
  paymentDetailCol: { gap: 4 },
  paymentDetailLabel: { color: colors.muted, fontFamily: fonts.medium, fontSize: 11 },
  paymentDetailValue: { color: colors.dark, fontFamily: fonts.bold, fontSize: 14 },
  paymentAction: { alignItems: "flex-end", paddingTop: 4 },
  paidDone: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8 },
  paidDoneText: { color: "#16A34A", fontFamily: fonts.bold, fontSize: 13 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: colors.white, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, maxHeight: "90%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { color: colors.dark, fontFamily: fonts.extrabold, fontSize: 18 },
  modalCloseBtn: { padding: 4 },
  modalBody: { padding: 20, gap: 20 },
  modalSubtitle: { color: colors.muted, fontFamily: fonts.medium, fontSize: 14, marginTop: -10 },
  modalInfoBox: { backgroundColor: colors.background, padding: 14, borderRadius: radii.md, gap: 8 },
  modalInfoRow: { minWidth: 0, flexDirection: "row", justifyContent: "space-between", gap: 10 },
  modalInfoLabel: { flexShrink: 0, color: colors.muted, fontFamily: fonts.medium, fontSize: 13 },
  modalInfoValue: { flex: 1, minWidth: 0, color: colors.dark, fontFamily: fonts.bold, fontSize: 14, textAlign: "right" },
  
  fieldWrap: { gap: 8 },
  label: { color: "#334155", fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 0.1 },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 10, paddingBottom: 20 },
  errorText: { color: colors.error, fontFamily: fonts.medium, fontSize: 13 },
});
