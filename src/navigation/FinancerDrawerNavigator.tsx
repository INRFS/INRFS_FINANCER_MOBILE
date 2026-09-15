import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useState, type ComponentType } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../auth/AuthContext";
import { Ionicons } from "../components/AppIcon";
import { Logo } from "../components/Logo";
import { Card, Header, Screen } from "../components/ui";
import { colors, fonts } from "../theme/tokens";

import { DashboardScreen } from "../screens/financer/DashboardScreen";
import { CustomersScreen } from "../screens/financer/CustomersScreen";
import { LoansScreen } from "../screens/financer/LoansScreen";
import { DuesScreen } from "../screens/financer/DuesScreen";
import { LedgerScreen } from "../screens/financer/LedgerScreen";
import { NotificationsScreen } from "../screens/financer/NotificationsScreen";
import { ReportsScreen } from "../screens/financer/ReportsScreen";
import { FinancerServiceChargeScreen } from "../screens/financer/FinancerServiceChargeScreen";
import { SupportScreen } from "../screens/financer/SupportScreen";
import { FinancerSettingsScreen } from "../screens/financer/FinancerSettingsScreen";

const Tab = createBottomTabNavigator<any>();

function PortalHeader({ onNotifications }: { onNotifications: () => void }) {
  const { user, logout } = useAuth();
  const identity = user?.businessName ?? user?.fullName ?? user?.email ?? "Financer";
  const confirmLogout = () => Alert.alert("Log out", "Are you sure you want to log out?", [
    { text: "Cancel", style: "cancel" },
    { text: "Log out", style: "destructive", onPress: () => void logout() },
  ]);
  return (
    <SafeAreaView edges={["top"]} style={s.top}>
      <View style={s.headerLeft}>
        <Logo size={30} />
        <View style={s.portalBadge}><Text style={s.portal}>FINANCER</Text></View>
      </View>
      <Text numberOfLines={1} ellipsizeMode="tail" style={s.user}>{identity}</Text>
      <View style={s.headerActions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Open notifications" hitSlop={10} onPress={onNotifications} style={s.iconBtn}>
          <Ionicons name="notifications-outline" size={22} color={colors.dark} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Log out" hitSlop={10} onPress={confirmLogout} style={s.iconBtn}>
          <Ionicons name="log-out-outline" size={23} color={colors.dark} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const moreItems = [
  ["Customer Ledger", "document-text-outline"],
  ["Reports", "bar-chart-outline"], ["Service Charge", "receipt-outline"],
  ["Support", "help-circle-outline"], ["Settings", "settings-outline"],
] as const;

const moreScreens: Record<string, ComponentType<any>> = {
  "Customer Ledger": LedgerScreen, Reports: ReportsScreen,
  "Service Charge": FinancerServiceChargeScreen, Support: SupportScreen, Settings: FinancerSettingsScreen,
};

function MoreScreen() {
  const [selected, setSelected] = useState<string | null>(null);
  if (selected) {
    const SelectedScreen = moreScreens[selected];
    if (!SelectedScreen) return null;
    return (
      <View style={s.morePage}>
        <Pressable style={s.backRow} onPress={() => setSelected(null)}>
          <Ionicons name="arrow-back" size={20} color={colors.cyan} />
          <Text style={s.backText}>More</Text>
        </Pressable>
        <SelectedScreen />
      </View>
    );
  }
  return (
    <Screen>
      <Header title="More" subtitle="Financer tools and account services" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.moreList}>
        <Card style={s.moreCard}>
          {moreItems.map(([label, icon]) => (
            <Pressable key={label} style={s.moreRow} onPress={() => setSelected(label)}>
              <View style={s.moreIcon}>
                <Ionicons name={icon} size={20} color={colors.cyan} />
              </View>
              <Text style={s.moreLabel}>{label}</Text>
              <Ionicons name="chevron-forward" size={19} color={colors.subtle} />
            </Pressable>
          ))}
        </Card>
      </ScrollView>
    </Screen>
  );
}

export function FinancerDrawerNavigator() {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  return (
    <View style={s.app}>
      <PortalHeader onNotifications={() => setNotificationsOpen(true)} />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: tabIcon(route.name),
          tabBarActiveTintColor: colors.cyan,
          tabBarInactiveTintColor: colors.subtle,
          tabBarLabelStyle: s.navText,
          tabBarStyle: s.nav,
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Customers" component={CustomersScreen} />
        <Tab.Screen name="Loans" component={LoansScreen} />
        <Tab.Screen name="Payments" component={DuesScreen} />
        <Tab.Screen name="More" component={MoreScreen} />
      </Tab.Navigator>
      <Modal visible={notificationsOpen} animationType="slide" onRequestClose={() => setNotificationsOpen(false)}>
        <SafeAreaView edges={["top"]} style={s.notificationPage}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close notifications" style={s.backRow} onPress={() => setNotificationsOpen(false)}>
            <Ionicons name="arrow-back" size={20} color={colors.cyan} />
            <Text style={s.backText}>Back</Text>
          </Pressable>
          <NotificationsScreen/>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

function tabIcon(routeName: string) {
  return function TabIcon({ color }: { color: string }) {
    return (
      <Ionicons
        name={
          routeName === "Dashboard"
            ? "grid-outline"
            : routeName === "Customers"
            ? "people-outline"
            : routeName === "Loans"
            ? "wallet-outline"
            : routeName === "Payments"
            ? "cash-outline"
            : "menu-outline"
        }
        size={21}
        color={color}
      />
    );
  };
}

const s = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.background },
  top: {
    minHeight: 58,
    paddingHorizontal: 14,
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  portalBadge: {
    backgroundColor: colors.cyanSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0, 156, 212, 0.2)",
  },
  portal: { color: colors.cyan, fontFamily: fonts.bold, fontSize: 9, letterSpacing: 0.8 },
  user: {
    flex: 1,
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 11,
    textAlign: "right",
    paddingHorizontal: 4,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  iconBtn: {
    padding: 6,
    borderRadius: 8,
  },
  nav: {
    minHeight: 64,
    paddingTop: 6,
    paddingBottom: 8,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    shadowColor: "#0D5C75",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 8,
  },
  navText: { fontFamily: fonts.semibold, fontSize: 10, marginTop: 2 },
  moreList: { paddingBottom: 110 },
  moreCard: { padding: 8 },
  morePage: { flex: 1, backgroundColor: colors.background },
  notificationPage: { flex: 1, backgroundColor: colors.background },
  backRow: {
    minHeight: 48,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backText: { color: colors.cyan, fontFamily: fonts.semibold, fontSize: 14 },
  moreRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF7FA",
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  moreIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.cyanSoft,
    borderWidth: 1,
    borderColor: "rgba(0, 156, 212, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  moreLabel: { flex: 1, color: colors.dark, fontFamily: fonts.semibold, fontSize: 14 },
});
