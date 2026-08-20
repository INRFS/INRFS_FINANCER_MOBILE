import type { ComponentProps, ReactNode } from "react";
import { Ionicons } from "./AppIcon";
import {
  ActivityIndicator,
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

export function Screen({ children, contentStyle }: { children: ReactNode; contentStyle?: StyleProp<ViewStyle> }) {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.screen, contentStyle]} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Header({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <View style={styles.header}>
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
  return (
    <View style={[styles.iconBubble, { width: size, height: size, borderRadius: size / 3.5, backgroundColor: accentSoft[accent] }]}>
      <Ionicons name={icon} size={size * 0.48} color={accentColors[accent]} />
    </View>
  );
}

export function KpiCard({ label, value, accent = "cyan", icon }: { label: string; value: string; accent?: Accent; icon?: ComponentProps<typeof Ionicons>["name"] }) {
  return (
    <Card style={styles.kpi}>
      <View style={styles.kpiTop}>{icon ? <IconBubble icon={icon} accent={accent} size={38} /> : <View style={[styles.dot, { backgroundColor: accentColors[accent] }]} />}</View>
      <Text style={styles.kpiValue}>{value}</Text>
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
    <Pressable disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [styles.button, { backgroundColor, borderWidth: variant === "secondary" ? 1 : 0, opacity: pressed || disabled ? 0.72 : 1 }, style]}>
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

export function Badge({ status }: { status: Status }) {
  const palette = statusMap[status];
  return <View style={[styles.badge, { backgroundColor: palette.bg }]}><Text style={[styles.badgeText, { color: palette.fg }]}>{status}</Text></View>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return <View style={styles.sectionHeader}><Text style={styles.h2}>{children}</Text>{action}</View>;
}

export function Segmented({ options, value, onChange, accent = "cyan" }: { options: string[]; value: string; onChange: (value: string) => void; accent?: Accent }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segments}>{options.map((option) => {
    const selected = option === value;
    return <Pressable key={option} onPress={() => onChange(option)} style={[styles.segment, selected && { backgroundColor: accentColors[accent], borderColor: accentColors[accent] }]}><Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{option}</Text></Pressable>;
  })}</ScrollView>;
}

export function ToggleRow({ label, subtitle, value, onValueChange, accent = "cyan" }: { label: string; subtitle?: string; value: boolean; onValueChange: (value: boolean) => void; accent?: Accent }) {
  return <View style={styles.toggleRow}><View style={styles.toggleCopy}><Text style={styles.rowTitle}>{label}</Text>{subtitle ? <Text style={styles.rowMeta}>{subtitle}</Text> : null}</View><Switch value={value} onValueChange={onValueChange} trackColor={{ false: colors.border, true: accentColors[accent] }} /></View>;
}

export function DataRow({ title, subtitle, amount, status, onPress }: { title: string; subtitle?: string; amount?: string; status?: Status; onPress?: () => void }) {
  const content = <><View style={styles.dataCopy}><Text style={styles.rowTitle}>{title}</Text>{subtitle ? <Text style={styles.rowMeta}>{subtitle}</Text> : null}</View><View style={styles.dataEnd}>{amount ? <Text style={styles.amount}>{amount}</Text> : null}{status ? <Badge status={status} /> : null}{onPress ? <Ionicons name="chevron-forward" size={18} color={colors.subtle} /> : null}</View></>;
  return onPress ? <Pressable onPress={onPress} style={({ pressed }) => [styles.dataRow, pressed && { opacity: 0.7 }]}>{content}</Pressable> : <View style={styles.dataRow}>{content}</View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  screen: { padding: spacing.lg, paddingBottom: 104, gap: spacing.lg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  headerCopy: { flex: 1 },
  h1: { color: colors.dark, fontFamily: fonts.extrabold, fontSize: 23, lineHeight: 30 },
  subtitle: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13, marginTop: 3, lineHeight: 19 },
  h2: { color: colors.dark, fontFamily: fonts.bold, fontSize: 16 },
  card: { backgroundColor: colors.white, borderColor: colors.border, borderWidth: 1, borderRadius: radii.lg, padding: spacing.lg, ...shadows.card },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  kpi: { width: "47.8%", minHeight: 125 },
  kpiTop: { minHeight: 40, justifyContent: "center" },
  kpiValue: { color: colors.dark, fontFamily: fonts.extrabold, fontSize: 19, marginTop: 10 },
  kpiLabel: { color: colors.muted, fontFamily: fonts.medium, fontSize: 11, marginTop: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  iconBubble: { alignItems: "center", justifyContent: "center" },
  button: { minHeight: 44, borderRadius: radii.md, paddingHorizontal: 16, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7, borderColor: colors.border },
  buttonText: { fontFamily: fonts.semibold, fontSize: 14 },
  fieldWrap: { gap: 6 },
  label: { color: "#374151", fontFamily: fonts.medium, fontSize: 13 },
  input: { minHeight: 46, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.white, paddingHorizontal: 12, color: colors.dark, fontFamily: fonts.regular, fontSize: 14 },
  multiline: { minHeight: 96, paddingTop: 12, textAlignVertical: "top" },
  inputError: { borderColor: colors.error },
  error: { color: colors.error, fontFamily: fonts.regular, fontSize: 11 },
  badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: radii.pill, alignSelf: "flex-start" },
  badgeText: { fontFamily: fonts.semibold, fontSize: 10 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  segments: { gap: 8 },
  segment: { borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, paddingVertical: 9, paddingHorizontal: 13 },
  segmentText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12 },
  segmentTextSelected: { color: colors.white, fontFamily: fonts.semibold },
  toggleRow: { minHeight: 62, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  toggleCopy: { flex: 1 },
  rowTitle: { color: colors.dark, fontFamily: fonts.semibold, fontSize: 13 },
  rowMeta: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, marginTop: 3 },
  dataRow: { minHeight: 66, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, borderBottomWidth: 1, borderBottomColor: "#F1F5F9", paddingVertical: 10 },
  dataCopy: { flex: 1 },
  dataEnd: { alignItems: "flex-end", gap: 5, flexDirection: "row" },
  amount: { color: colors.dark, fontFamily: fonts.bold, fontSize: 13 },
});
