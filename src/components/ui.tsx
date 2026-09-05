import { useRef, type ComponentProps, type ReactNode } from "react";
import { Ionicons } from "./AppIcon";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, fonts, radii, shadows, spacing } from "../theme/tokens";
import type { Accent, Status } from "../types/navigation";

export const accentColors: Record<Accent, string> = {
  cyan: colors.cyan,
  green: colors.green,
  yellow: colors.yellow,
  orange: colors.orange,
  pink: colors.pink,
  purple: colors.purple,
  error: colors.error,
};

export const accentSoft: Record<Accent, string> = {
  cyan: colors.cyanSoft,
  green: colors.greenSoft,
  yellow: colors.yellowSoft,
  orange: colors.orangeSoft,
  pink: "#FCE7F3",
  purple: colors.purpleSoft,
  error: colors.errorSoft,
};

export function Screen({ children, contentStyle, scroll = true }: { children: ReactNode; contentStyle?: StyleProp<ViewStyle>; scroll?: boolean }) {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View pointerEvents="none" style={styles.ambient}>
        <View style={styles.ambientCyan} />
        <View style={styles.ambientPurple} />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        {scroll ? (
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.screen, contentStyle]} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.screen, { flex: 1 }, contentStyle]}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Header({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerAccent} />
      <View style={styles.headerCopy}>
        <Text style={styles.h1}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function IconBubble({ icon, accent = "cyan", size = 44 }: { icon: ComponentProps<typeof Ionicons>["name"]; accent?: Accent; size?: number }) {
  const backgroundColor = accentSoft[accent] ?? accentSoft.cyan;
  const foregroundColor = accentColors[accent] ?? accentColors.cyan;
  return (
    <View style={[styles.iconBubble, { width: size, height: size, borderRadius: size / 3.5, backgroundColor }]}>
      <Ionicons name={icon} size={size * 0.48} color={foregroundColor} />
    </View>
  );
}

export function KpiCard({ label, value, accent = "cyan", icon }: { label: string; value: string; accent?: Accent; icon?: ComponentProps<typeof Ionicons>["name"] }) {
  return (
    <Card style={[styles.kpi, { borderTopColor: accentColors[accent] }]}>
      <View style={styles.kpiTop}>{icon ? <IconBubble icon={icon} accent={accent} size={38} /> : <View style={[styles.dot, { backgroundColor: accentColors[accent] }]} />}</View>
      <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </Card>
  );
}

export function Grid({ children }: { children: ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

export function Button({ label, onPress, variant = "primary", accent = "cyan", icon, disabled, loading, style }: {
  label: string; onPress: () => void; variant?: "primary" | "secondary" | "danger" | "ghost"; accent?: Accent;
  icon?: ComponentProps<typeof Ionicons>["name"]; disabled?: boolean; loading?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const backgroundColor = variant === "primary" ? accentColors[accent] : variant === "danger" ? colors.error : variant === "secondary" ? colors.white : "transparent";
  const foreground = variant === "primary" || variant === "danger" ? colors.white : variant === "ghost" ? colors.muted : colors.dark;
  return (
    <Pressable disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [styles.button, variant === "primary" && styles.primaryButton, { backgroundColor, borderWidth: variant === "secondary" ? 1 : 0, opacity: disabled ? 0.5 : 1, transform: [{ scale: pressed ? 0.975 : 1 }] }, style]}>
      {loading ? <ActivityIndicator color={foreground} /> : icon ? <Ionicons name={icon} size={17} color={foreground} /> : null}
      <Text style={[styles.buttonText, { color: foreground }]}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, error, multiline, style, ...props }: TextInputProps & { label: string; error?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.fieldWrap, style]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.subtle}
        multiline={multiline}
        style={[styles.input, multiline && styles.multiline, error && styles.inputError]}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const statusMap: Record<Status, { bg: string; fg: string }> = {
  Active: { bg: colors.greenSoft, fg: "#16A34A" }, Paid: { bg: colors.greenSoft, fg: "#16A34A" }, Success: { bg: colors.greenSoft, fg: "#16A34A" },
  Closed: { bg: "#F1F5F9", fg: colors.muted },
  Due: { bg: colors.orangeSoft, fg: "#EA580C" }, Overdue: { bg: colors.errorSoft, fg: "#DC2626" },
  Pending: { bg: colors.yellowSoft, fg: "#CA8A04" }, Upcoming: { bg: colors.yellowSoft, fg: "#CA8A04" },
  Rescheduled: { bg: colors.purpleSoft, fg: "#7C3AED" }, Trial: { bg: colors.yellowSoft, fg: "#CA8A04" },
  Suspended: { bg: colors.errorSoft, fg: "#DC2626" }, Inactive: { bg: "#F1F5F9", fg: colors.muted },
  "Partially Paid": { bg: colors.orangeSoft, fg: "#EA580C" }, Resolved: { bg: colors.greenSoft, fg: "#16A34A" },
  Open: { bg: colors.cyanSoft, fg: colors.cyan },
};

export function Badge({ status }: { status: Status | string | null | undefined }) {
  const label = status == null || status === "" ? "Unknown" : String(status);
  const backgroundColor = statusMap[label as Status]?.bg ?? "#F1F5F9";
  const foregroundColor = statusMap[label as Status]?.fg ?? colors.muted;
  return <View style={[styles.badge, { backgroundColor }]}><Text style={[styles.badgeText, { color: foregroundColor }]}>{label}</Text></View>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return <View style={styles.sectionHeader}><Text style={styles.h2}>{children}</Text>{action}</View>;
}

export function Segmented({ options, value, onChange, accent = "cyan" }: { options: string[]; value: string; onChange: (value: string) => void; accent?: Accent }) {
  const scrollRef = useRef<ScrollView>(null);
  return <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segments}>{options.map((option, index) => {
    const selected = option === value;
    return <Pressable key={option} onPress={() => { onChange(option); scrollRef.current?.scrollTo({ x: Math.max(0, index * 96 - 48), animated: true }); }} style={[styles.segment, selected && { backgroundColor: accentColors[accent], borderColor: accentColors[accent] }]}><Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{option}</Text></Pressable>;
  })}</ScrollView>;
}

export function ToggleRow({ label, subtitle, value, onValueChange, accent = "cyan" }: { label: string; subtitle?: string; value: boolean; onValueChange: (value: boolean) => void; accent?: Accent }) {
  return <View style={styles.toggleRow}><View style={styles.toggleCopy}><Text style={styles.rowTitle}>{label}</Text>{subtitle ? <Text style={styles.rowMeta}>{subtitle}</Text> : null}</View><Switch value={value} onValueChange={onValueChange} trackColor={{ false: colors.border, true: accentColors[accent] }} /></View>;
}

export function DataRow({ title, subtitle, amount, status, onPress }: { title: string; subtitle?: string; amount?: string; status?: Status | string | null; onPress?: () => void }) {
  const content = <><View style={styles.dataCopy}><Text style={styles.rowTitle}>{title}</Text>{subtitle ? <Text style={styles.rowMeta}>{subtitle}</Text> : null}</View><View style={styles.dataEnd}>{amount ? <Text style={styles.amount}>{amount}</Text> : null}{status ? <Badge status={status} /> : null}{onPress ? <Ionicons name="chevron-forward" size={18} color={colors.subtle} /> : null}</View></>;
  return onPress ? <Pressable onPress={onPress} style={({ pressed }) => [styles.dataRow, pressed && { opacity: 0.7 }]}>{content}</Pressable> : <View style={styles.dataRow}>{content}</View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  ambient: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
  ambientCyan: { position: "absolute", width: 230, height: 230, borderRadius: 115, backgroundColor: "rgba(16,175,233,0.08)", top: -105, right: -82 },
  ambientPurple: { position: "absolute", width: 190, height: 190, borderRadius: 95, backgroundColor: "rgba(125,31,232,0.055)", top: 255, left: -110 },
  screen: { padding: spacing.lg, paddingTop: spacing.xl, paddingBottom: 104, gap: spacing.xl },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, minHeight: 54 },
  headerAccent: { width: 4, height: 38, borderRadius: radii.pill, backgroundColor: colors.cyan },
  headerCopy: { flex: 1, minWidth: 0 },
  h1: { color: colors.dark, fontFamily: fonts.extrabold, fontSize: 25, letterSpacing: -0.55, lineHeight: 31, flexShrink: 1 },
  subtitle: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13, marginTop: 4, lineHeight: 19, flexShrink: 1 },
  h2: { color: colors.dark, fontFamily: fonts.bold, fontSize: 17, letterSpacing: -0.2 },
  card: { minWidth: 0, backgroundColor: "rgba(255,255,255,0.97)", borderColor: "rgba(221,229,238,0.9)", borderWidth: 1, borderRadius: radii.xl, padding: spacing.lg, gap: spacing.md, marginVertical: spacing.sm, ...shadows.card },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  kpi: { width: "47.8%", minWidth: 0, minHeight: 132, borderTopWidth: 3, marginVertical: 0 },
  kpiTop: { minHeight: 40, justifyContent: "center" },
  kpiValue: { color: colors.dark, fontFamily: fonts.extrabold, fontSize: 20, letterSpacing: -0.35, marginTop: 11 },
  kpiLabel: { color: colors.muted, fontFamily: fonts.medium, fontSize: 11, marginTop: 5, lineHeight: 15 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  iconBubble: { alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.8)" },
  button: { minWidth: 0, maxWidth: "100%", minHeight: 46, borderRadius: radii.lg, paddingHorizontal: 17, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7, borderColor: colors.border },
  primaryButton: { shadowColor: colors.cyan, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.2, shadowRadius: 9, elevation: 3 },
  buttonText: { fontFamily: fonts.semibold, fontSize: 14, flexShrink: 1, textAlign: "center" },
  fieldWrap: { minWidth: 0, gap: 7 },
  label: { color: "#334155", fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 0.1 },
  input: { minHeight: 49, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: "rgba(255,255,255,0.94)", paddingHorizontal: 14, color: colors.dark, fontFamily: fonts.regular, fontSize: 14, shadowColor: "#173B62", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.035, shadowRadius: 5, elevation: 1 },
  multiline: { minHeight: 96, paddingTop: 12, textAlignVertical: "top" },
  inputError: { borderColor: colors.error },
  error: { color: colors.error, fontFamily: fonts.regular, fontSize: 11 },
  badge: { maxWidth: "100%", paddingHorizontal: 10, paddingVertical: 5, borderRadius: radii.pill, alignSelf: "flex-start", borderWidth: 1, borderColor: "rgba(255,255,255,0.75)" },
  badgeText: { fontFamily: fonts.semibold, fontSize: 10, flexShrink: 1 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  segments: { gap: 8, paddingRight: spacing.lg },
  segment: { borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: "rgba(255,255,255,0.94)", paddingVertical: 10, paddingHorizontal: 15 },
  segmentText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12 },
  segmentTextSelected: { color: colors.white, fontFamily: fonts.semibold },
  toggleRow: { minHeight: 62, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  toggleCopy: { flex: 1 },
  rowTitle: { color: colors.dark, fontFamily: fonts.semibold, fontSize: 13, flexShrink: 1 },
  rowMeta: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, marginTop: 3, flexShrink: 1 },
  dataRow: { minWidth: 0, minHeight: 68, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, borderBottomWidth: 1, borderBottomColor: "#EDF2F7", paddingVertical: 11 },
  dataCopy: { flex: 1, minWidth: 0 },
  dataEnd: { maxWidth: "58%", flexShrink: 1, alignItems: "flex-end", justifyContent: "flex-end", gap: 5, flexDirection: "row", flexWrap: "wrap" },
  amount: { maxWidth: "100%", flexShrink: 1, color: colors.dark, fontFamily: fonts.bold, fontSize: 13, textAlign: "right" },
});
