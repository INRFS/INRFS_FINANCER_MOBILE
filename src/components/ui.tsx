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

import { BottomOceanWaves, TopOceanHeaderDecor } from "./OceanDecorations";

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
        <TopOceanHeaderDecor style={styles.topHeaderDecor} />
        <View style={styles.ambientWaveTop} />
        <View style={styles.ambientWaveBottom} />
        <View style={styles.ambientWaveAccent} />
        <BottomOceanWaves height={100} style={styles.screenBottomWave} />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, zIndex: 1 }}>
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

export function InlineAlert({ message, type = "error", style }: { message?: string | null; type?: "error" | "warning" | "info" | "success"; style?: StyleProp<ViewStyle> }) {
  if (!message) return null;
  const isErr = type === "error";
  const bg = isErr ? colors.errorSoft : type === "warning" ? colors.yellowSoft : type === "success" ? colors.greenSoft : colors.cyanSoft;
  const fg = isErr ? colors.error : type === "warning" ? colors.orange : type === "success" ? colors.green : colors.cyanDark;
  const icon = isErr ? "alert-circle" : type === "warning" ? "warning-outline" : type === "success" ? "checkmark-circle-outline" : "information-circle-outline";

  return (
    <View style={[styles.inlineAlert, { backgroundColor: bg, borderColor: isErr ? "rgba(229,57,53,0.25)" : "rgba(0,156,212,0.2)" }, style]}>
      <Ionicons name={icon} size={17} color={fg} />
      <Text style={[styles.inlineAlertText, { color: fg }]}>{message}</Text>
    </View>
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
    <View style={[styles.iconBubble, { width: size, height: size, borderRadius: size / 2.8, backgroundColor }]}>
      <Ionicons name={icon} size={size * 0.48} color={foregroundColor} />
    </View>
  );
}

export function KpiCard({ label, value, accent = "cyan", icon }: { label: string; value: string; accent?: Accent; icon?: ComponentProps<typeof Ionicons>["name"] }) {
  return (
    <Card style={[styles.kpi, { borderTopColor: accentColors[accent], borderTopWidth: 3.5 }]}>
      <View style={styles.kpiTop}>
        {icon ? <IconBubble icon={icon} accent={accent} size={36} /> : <View style={[styles.dot, { backgroundColor: accentColors[accent] }]} />}
      </View>
      <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{value}</Text>
      <Text style={styles.kpiLabel}>{label.toUpperCase()}</Text>
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
  const foreground = variant === "primary" || variant === "danger" ? colors.white : variant === "secondary" ? accentColors[accent] : variant === "ghost" ? colors.muted : colors.dark;
  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "primary" && styles.primaryButton,
        variant === "secondary" && styles.secondaryButton,
        {
          backgroundColor,
          opacity: disabled ? 0.5 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={foreground} /> : icon ? <Ionicons name={icon} size={17} color={foreground} /> : null}
      <Text style={[styles.buttonText, { color: foreground }]}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, error, multiline, style, ...props }: TextInputProps & { label: string; error?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.fieldWrap, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
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
  Active: { bg: colors.greenSoft, fg: "#2E7D32" },
  Paid: { bg: colors.greenSoft, fg: "#2E7D32" },
  Success: { bg: colors.greenSoft, fg: "#2E7D32" },
  Closed: { bg: "#ECEFF1", fg: "#546E7A" },
  Due: { bg: colors.yellowSoft, fg: "#F57F17" },
  Overdue: { bg: colors.errorSoft, fg: "#D32F2F" },
  Pending: { bg: colors.yellowSoft, fg: "#F57F17" },
  Upcoming: { bg: colors.yellowSoft, fg: "#F57F17" },
  Rescheduled: { bg: colors.purpleSoft, fg: colors.cyan },
  Trial: { bg: colors.yellowSoft, fg: "#F57F17" },
  Suspended: { bg: colors.errorSoft, fg: "#D32F2F" },
  Inactive: { bg: "#ECEFF1", fg: "#546E7A" },
  "Partially Paid": { bg: colors.orangeSoft, fg: "#E65100" },
  Resolved: { bg: colors.greenSoft, fg: "#2E7D32" },
  Open: { bg: colors.cyanSoft, fg: colors.cyan },
};

export function Badge({ status }: { status: Status | string | null | undefined }) {
  const label = status == null || status === "" ? "Unknown" : String(status);
  const backgroundColor = statusMap[label as Status]?.bg ?? "#ECEFF1";
  const foregroundColor = statusMap[label as Status]?.fg ?? colors.muted;
  return (
    <View style={[styles.badge, { backgroundColor }]}>
      <Text style={[styles.badgeText, { color: foregroundColor }]}>{label}</Text>
    </View>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return <View style={styles.sectionHeader}><Text style={styles.h2}>{children}</Text>{action}</View>;
}

export function Segmented({ options, value, onChange, accent = "cyan" }: { options: string[]; value: string; onChange: (value: string) => void; accent?: Accent }) {
  const scrollRef = useRef<ScrollView>(null);
  return (
    <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segments}>
      {options.map((option, index) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            onPress={() => {
              onChange(option);
              scrollRef.current?.scrollTo({ x: Math.max(0, index * 96 - 48), animated: true });
            }}
            style={[
              styles.segment,
              selected && { backgroundColor: accentColors[accent], borderColor: accentColors[accent] },
            ]}
          >
            <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{option}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function ToggleRow({ label, subtitle, value, onValueChange, accent = "cyan" }: { label: string; subtitle?: string; value: boolean; onValueChange: (value: boolean) => void; accent?: Accent }) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleCopy}>
        <Text style={styles.rowTitle}>{label}</Text>
        {subtitle ? <Text style={styles.rowMeta}>{subtitle}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: accentColors[accent] }}
        thumbColor={colors.white}
      />
    </View>
  );
}

export function DataRow({ title, subtitle, amount, status, onPress }: { title: string; subtitle?: string; amount?: string; status?: Status | string | null; onPress?: () => void }) {
  const content = (
    <>
      <View style={styles.dataCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowMeta}>{subtitle}</Text> : null}
      </View>
      <View style={styles.dataEnd}>
        {amount ? <Text style={styles.amount}>{amount}</Text> : null}
        {status ? <Badge status={status} /> : null}
        {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.subtle} /> : null}
      </View>
    </>
  );
  return onPress ? <Pressable onPress={onPress} style={({ pressed }) => [styles.dataRow, pressed && { opacity: 0.7 }]}>{content}</Pressable> : <View style={styles.dataRow}>{content}</View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  ambient: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
  topHeaderDecor: {
    position: "absolute",
    top: -15,
    right: -10,
  },
  screenBottomWave: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  ambientWaveTop: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "rgba(0, 156, 212, 0.08)",
    top: -120,
    right: -80,
  },
  ambientWaveBottom: {
    position: "absolute",
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: "rgba(38, 198, 218, 0.09)",
    bottom: -140,
    left: -100,
  },
  ambientWaveAccent: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(224, 247, 250, 0.6)",
    top: "35%",
    right: -100,
  },
  screen: { padding: spacing.lg, paddingTop: spacing.xl, paddingBottom: 110, gap: spacing.xl },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, minHeight: 54 },
  headerAccent: { width: 4, height: 36, borderRadius: radii.pill, backgroundColor: colors.cyan },
  headerCopy: { flex: 1, minWidth: 0 },
  h1: { color: colors.dark, fontFamily: fonts.extrabold, fontSize: 24, letterSpacing: -0.4, lineHeight: 30, flexShrink: 1 },
  subtitle: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13, marginTop: 4, lineHeight: 18, flexShrink: 1 },
  h2: { color: colors.dark, fontFamily: fonts.bold, fontSize: 17, letterSpacing: -0.2 },
  card: {
    minWidth: 0,
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
    marginVertical: spacing.xs,
    ...shadows.card,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  kpi: { width: "47.8%", minWidth: 0, minHeight: 128, borderTopWidth: 3, marginVertical: 0 },
  kpiTop: { minHeight: 38, justifyContent: "center" },
  kpiValue: { color: colors.dark, fontFamily: fonts.extrabold, fontSize: 20, letterSpacing: -0.35, marginTop: 10 },
  kpiLabel: { color: colors.muted, fontFamily: fonts.medium, fontSize: 11, marginTop: 4, lineHeight: 15 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  iconBubble: { alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(0, 156, 212, 0.15)" },
  button: {
    minWidth: 0,
    maxWidth: "100%",
    minHeight: 46,
    borderRadius: radii.lg,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryButton: {
    ...shadows.glow,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.cyan,
    backgroundColor: colors.white,
  },
  buttonText: { fontFamily: fonts.semibold, fontSize: 14, flexShrink: 1, textAlign: "center" },
  fieldWrap: { minWidth: 0, gap: 6 },
  label: { color: colors.dark, fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 0.1 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 14,
    color: colors.dark,
    fontFamily: fonts.regular,
    fontSize: 14,
  },
  multiline: { minHeight: 96, paddingTop: 12, textAlignVertical: "top" },
  inputError: { borderColor: colors.error },
  error: { color: colors.error, fontFamily: fonts.regular, fontSize: 11 },
  badge: {
    maxWidth: "100%",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
  },
  badgeText: { fontFamily: fonts.semibold, fontSize: 10, flexShrink: 1 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  segments: { gap: 8, paddingRight: spacing.lg },
  segment: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  segmentText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12 },
  segmentTextSelected: { color: colors.white, fontFamily: fonts.semibold },
  toggleRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF7FA",
  },
  toggleCopy: { flex: 1 },
  rowTitle: { color: colors.dark, fontFamily: fonts.semibold, fontSize: 13, flexShrink: 1 },
  rowMeta: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, marginTop: 2, flexShrink: 1 },
  inlineAlert: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    marginVertical: 4,
  },
  inlineAlertText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 17,
  },
  dataRow: {
    minWidth: 0,
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF7FA",
    paddingVertical: 10,
  },
  dataCopy: { flex: 1, minWidth: 0 },
  dataEnd: { maxWidth: "58%", flexShrink: 1, alignItems: "flex-end", justifyContent: "flex-end", gap: 5, flexDirection: "row", flexWrap: "wrap" },
  amount: { maxWidth: "100%", flexShrink: 1, color: colors.dark, fontFamily: fonts.bold, fontSize: 13, textAlign: "right" },
});
