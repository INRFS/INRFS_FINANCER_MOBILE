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
  return <SafeAreaView edges={["top"]} style={s.top}>
    <Logo size={34}/>
    <View style={s.portalBadge}><Text style={s.portal}>FINANCER</Text></View>
    <Text numberOfLines={1} style={s.user}>{identity}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Open notifications" hitSlop={10} onPress={onNotifications}>
      <Ionicons name="notifications-outline" size={23} color={colors.muted}/>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Log out" hitSlop={10} onPress={confirmLogout}>
      <Ionicons name="log-out-outline" size={24} color={colors.muted}/>
    </Pressable>
  </SafeAreaView>;
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
    return <View style={s.morePage}>
      <Pressable style={s.backRow} onPress={() => setSelected(null)}><Ionicons name="arrow-back" size={20} color={colors.cyan}/><Text style={s.backText}>More</Text></Pressable>
      <SelectedScreen/>
    </View>;
  }
  return <Screen><Header title="More" subtitle="Financer tools and account services"/>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.moreList}>
      <Card>{moreItems.map(([label, icon]) => <Pressable key={label} style={s.moreRow} onPress={() => setSelected(label)}>
        <View style={s.moreIcon}><Ionicons name={icon} size={20} color={colors.cyan}/></View>
        <Text style={s.moreLabel}>{label}</Text>
        <Ionicons name="chevron-forward" size={19} color={colors.subtle}/>
      </Pressable>)}</Card>
    </ScrollView>
  </Screen>;
}

export function FinancerDrawerNavigator() {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  return <View style={s.app}>
    <PortalHeader onNotifications={() => setNotificationsOpen(true)}/>
    <Tab.Navigator screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: tabIcon(route.name),
      tabBarActiveTintColor: colors.cyan,
      tabBarInactiveTintColor: colors.subtle,
      tabBarLabelStyle: s.navText,
      tabBarStyle: s.nav,
    })}>
      <Tab.Screen name="Dashboard" component={DashboardScreen}/>
      <Tab.Screen name="Customers" component={CustomersScreen}/>
      <Tab.Screen name="Loans" component={LoansScreen}/>
      <Tab.Screen name="Payments" component={DuesScreen}/>
      <Tab.Screen name="More" component={MoreScreen}/>
    </Tab.Navigator>
    <Modal visible={notificationsOpen} animationType="slide" onRequestClose={() => setNotificationsOpen(false)}>
      <SafeAreaView edges={["top"]} style={s.notificationPage}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close notifications" style={s.backRow} onPress={() => setNotificationsOpen(false)}>
          <Ionicons name="arrow-back" size={20} color={colors.cyan}/><Text style={s.backText}>Back</Text>
        </Pressable>
        <NotificationsScreen/>
      </SafeAreaView>
    </Modal>
  </View>;
}

function tabIcon(routeName: string) {
  return function TabIcon({ color }: { color: string }) {
    return <Ionicons
      name={routeName === "Dashboard" ? "grid-outline" : routeName === "Customers" ? "people-outline" : routeName === "Loans" ? "wallet-outline" : routeName === "Payments" ? "cash-outline" : "menu"}
      size={21}
      color={color}
    />;
  };
}

const s = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.background },
  top: { minHeight: 60, paddingHorizontal: 14, gap: 9, flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  portalBadge: { backgroundColor: "rgba(16,175,233,0.11)", paddingHorizontal: 10, paddingVertical: 7, borderRadius: 14 },
  portal: { color: colors.cyan, fontFamily: fonts.bold, fontSize: 9, letterSpacing: .6 },
  user: { flex: 1, color: colors.muted, fontFamily: fonts.medium, fontSize: 11, textAlign: "right" },
  nav: { minHeight: 70, paddingTop: 5, backgroundColor: colors.white, borderTopColor: colors.border },
  navText: { fontFamily: fonts.medium, fontSize: 9 },
  moreList: { paddingBottom: 90 },
  morePage: { flex: 1, backgroundColor: colors.background },
  notificationPage: { flex: 1, backgroundColor: colors.background },
  backRow: { minHeight: 44, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  backText: { color: colors.cyan, fontFamily: fonts.semibold, fontSize: 13 },
  moreRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  moreIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: "rgba(16,175,233,0.10)", alignItems: "center", justifyContent: "center" },
  moreLabel: { flex: 1, color: colors.dark, fontFamily: fonts.semibold, fontSize: 14 },
});
