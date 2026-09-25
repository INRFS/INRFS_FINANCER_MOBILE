import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, Modal, ScrollView, RefreshControl, Dimensions, Pressable, Platform, KeyboardAvoidingView } from "react-native";
import { Button, Card, Badge, Field, Segmented } from "../../components/ui";
import { pageItems, platformApi } from "../../services/platformApi";
import { useAuth } from "../../auth/AuthContext";
import { colors, fonts, radii, shadows, spacing } from "../../theme/tokens";
import { Ionicons } from "../../components/AppIcon";
import Svg, { Rect, G, Text as SvgText, Path, Circle, Defs, LinearGradient, Stop } from "react-native-svg";
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

import { SparklineWave } from "../../components/OceanDecorations";

function BarChart({ data }: { data: { month: string; collected: number }[] }) {
  const defaultMonths = [
    { month: "Apr", collected: 0 },
    { month: "May", collected: 0 },
    { month: "Jun", collected: 0 },
    { month: "Jul", collected: 0 },
    { month: "Aug", collected: 12200.01 },
    { month: "Sep", collected: 0 },
  ];

  const chartData = data && data.length > 0 ? data : defaultMonths;
  const chartWidth = width - 72;
  const chartHeight = 160;
  const paddingX = 16;
  const paddingBottom = 28;
  const paddingTop = 32;
  const maxVal = Math.max(...chartData.map(d => Number(d.collected) || 0), 1000);
  const totalBars = chartData.length;
  const availableWidth = chartWidth - paddingX * 2;
  const barSlotWidth = availableWidth / totalBars;
  const barWidth = Math.min(22, barSlotWidth * 0.55);

  // Find the highest or active bar
  let maxIndex = 0;
  let maxAmount = 0;
  chartData.forEach((d, i) => {
    if (Number(d.collected) >= maxAmount) {
      maxAmount = Number(d.collected);
      maxIndex = i;
    }
  });

  return (
    <View style={{ marginTop: 8 }}>
      <Svg width={chartWidth} height={chartHeight}>
        <Defs>
          <LinearGradient id="barActiveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#009CD4" />
            <Stop offset="100%" stopColor="#007A99" />
          </LinearGradient>
          <LinearGradient id="barInactiveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#80DEEA" stopOpacity="0.8" />
            <Stop offset="100%" stopColor="#B2EBF2" stopOpacity="0.5" />
          </LinearGradient>
        </Defs>

        {/* Baseline divider */}
        <Path
          d={`M ${paddingX} ${chartHeight - paddingBottom} L ${chartWidth - paddingX} ${chartHeight - paddingBottom}`}
          stroke="#E0F7FA"
          strokeWidth="1.5"
        />

        {chartData.map((d, i) => {
          const val = Number(d.collected) || 0;
          const barHeight = Math.max(val > 0 ? (val / maxVal) * (chartHeight - paddingBottom - paddingTop) : 6, 6);
          const x = paddingX + i * barSlotWidth + (barSlotWidth - barWidth) / 2;
          const y = chartHeight - paddingBottom - barHeight;
          const isActive = i === maxIndex && val > 0;

          return (
            <G key={d.month + i}>
              <Rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={isActive ? "url(#barActiveGrad)" : "url(#barInactiveGrad)"}
                rx={5}
              />
              
              {/* Tooltip on active bar */}
              {isActive && (
                <G transform={`translate(${x + barWidth / 2}, ${Math.max(16, y - 22)})`}>
                  <Rect
                    x={-34}
                    y={-14}
                    width={68}
                    height={20}
                    rx={10}
                    fill="#009CD4"
                  />
                  <SvgText
                    x={0}
                    y={0}
                    fontSize="9"
                    fontFamily={fonts.bold}
                    fill="#FFFFFF"
                    textAnchor="middle"
                  >
                    {rupees(val)}
                  </SvgText>
                  {/* Tooltip arrow */}
                  <Path
                    d="M -4,6 L 0,10 L 4,6 Z"
                    fill="#009CD4"
                  />
                </G>
              )}

              <SvgText
                x={x + barWidth / 2}
                y={chartHeight - 8}
                fontSize="11"
                fontFamily={isActive ? fonts.bold : fonts.medium}
                fill={isActive ? colors.dark : colors.muted}
                textAnchor="middle"
              >
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
    color: [colors.green, colors.cyan, colors.yellow, colors.orange][index % 4]
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
            <Ionicons name="calendar-outline" size={14} color={colors.cyan} />
            <Text style={styles.dateText}>{new Date().toLocaleDateString('en-IN')}</Text>
          </View>
        </View>

        <RemoteState {...state} retry={() => void state.refresh()}/>

        {!state.loading || d.totalCustomers ? (
          <>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: colors.cyanSoft, borderColor: "rgba(0,156,212,0.18)" }]}>
                   <Ionicons name="people-outline" size={20} color={colors.cyan} />
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statLabel}>TOTAL CUSTOMERS</Text>
                  <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>{d.totalCustomers ?? 0}</Text>
                </View>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: colors.greenSoft, borderColor: "rgba(67,160,71,0.18)" }]}>
                   <Ionicons name="document-text-outline" size={20} color={colors.green} />
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statLabel}>ACTIVE LOANS</Text>
                  <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>{d.activeLoans ?? 0}</Text>
                </View>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: "#F3E5F5", borderColor: "rgba(171,71,188,0.18)" }]}>
                   <Ionicons name="trending-up-outline" size={20} color="#8E24AA" />
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statLabel}>TOTAL GIVEN</Text>
                  <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>{rupees(d.totalPrincipal ?? 0)}</Text>
                </View>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: colors.cyanSofter, borderColor: "rgba(0,156,212,0.18)" }]}>
                   <Ionicons name="card-outline" size={20} color={colors.cyan} />
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statLabel}>OUTSTANDING</Text>
                  <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>{rupees(d.principalOutstanding ?? 0)}</Text>
                </View>
              </View>

              <View style={styles.highlightCard}>
                <View style={styles.highlightLeft}>
                  <View style={styles.highlightIcon}>
                    <Ionicons name="receipt-outline" size={20} color={colors.green} />
                  </View>
                  <View style={styles.highlightContent}>
                    <Text style={styles.highlightLabel}>TOTAL INTEREST COLLECTED</Text>
                    <Text style={styles.highlightValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>
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
                <View style={styles.highlightSparkline}>
                  <SparklineWave width={94} height={34} color={colors.cyan} />
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
  screen: { padding: spacing.lg, paddingTop: spacing.md, paddingBottom: 110, gap: spacing.lg },
  
  headerCard: {
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
    gap: 14
  },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  welcomeText: { color: colors.dark, fontFamily: fonts.extrabold, fontSize: 22 },
  subtitleText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 13, marginTop: 4 },
  dateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.cyanSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(0, 156, 212, 0.15)",
  },
  dateText: { color: colors.cyanDark, fontFamily: fonts.semibold, fontSize: 12 },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, justifyContent: "space-between" },
  statCard: {
    width: "48%",
    minHeight: 124,
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
    gap: 12,
  },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: colors.cyanSoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0, 156, 212, 0.12)",
  },
  statContent: { gap: 4 },
  statLabel: { color: colors.muted, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.5 },
  statValue: { color: colors.dark, fontFamily: fonts.extrabold, fontSize: 18 },

  highlightCard: {
    width: "100%",
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...shadows.card,
  },
  highlightLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  highlightIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    backgroundColor: colors.greenSoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(67, 160, 71, 0.18)",
  },
  highlightContent: { flex: 1, minWidth: 0 },
  highlightLabel: { color: colors.muted, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.5 },
  highlightValue: { color: colors.dark, fontFamily: fonts.extrabold, fontSize: 19, marginTop: 2 },
  highlightSparkline: { marginLeft: 8, flexShrink: 0 },

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
  paymentDetails: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderTopWidth: 1, borderTopColor: "#EDF7FA", borderBottomWidth: 1, borderBottomColor: "#EDF7FA" },
  paymentDetailCol: { gap: 4 },
  paymentDetailLabel: { color: colors.muted, fontFamily: fonts.medium, fontSize: 11 },
  paymentDetailValue: { color: colors.dark, fontFamily: fonts.bold, fontSize: 14 },
  paymentAction: { alignItems: "flex-end", paddingTop: 4 },
  paidDone: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8 },
  paidDoneText: { color: colors.green, fontFamily: fonts.bold, fontSize: 13 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(6, 50, 56, 0.45)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    maxHeight: "90%",
    ...shadows.modal,
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { color: colors.dark, fontFamily: fonts.extrabold, fontSize: 18 },
  modalCloseBtn: { padding: 4 },
  modalBody: { padding: 20, gap: 20 },
  modalSubtitle: { color: colors.muted, fontFamily: fonts.medium, fontSize: 14, marginTop: -10 },
  modalInfoBox: {
    backgroundColor: colors.surfaceSoft,
    padding: 14,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  modalInfoRow: { minWidth: 0, flexDirection: "row", justifyContent: "space-between", gap: 10 },
  modalInfoLabel: { flexShrink: 0, color: colors.muted, fontFamily: fonts.medium, fontSize: 13 },
  modalInfoValue: { flex: 1, minWidth: 0, color: colors.dark, fontFamily: fonts.bold, fontSize: 14, textAlign: "right" },
  
  fieldWrap: { gap: 8 },
  label: { color: colors.dark, fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 0.1 },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 10, paddingBottom: 20 },
  errorText: { color: colors.error, fontFamily: fonts.medium, fontSize: 13 },
});
