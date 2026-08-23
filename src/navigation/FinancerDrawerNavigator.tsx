import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList, DrawerItem } from "@react-navigation/drawer";
import { useAuth } from "../auth/AuthContext";
import { Ionicons } from "../components/AppIcon";
import { colors, fonts } from "../theme/tokens";
import { Text, View, StyleSheet, Alert } from "react-native";
import { Logo } from "../components/Logo";
import { SafeAreaView } from "react-native-safe-area-context";

import { DashboardScreen } from "../screens/financer/DashboardScreen";
import { CustomersScreen } from "../screens/financer/CustomersScreen";
import { LoansScreen } from "../screens/financer/LoansScreen";
import { DuesScreen } from "../screens/financer/DuesScreen";
import { DueOverdueScreen } from "../screens/financer/DueOverdueScreen";
import { LedgerScreen } from "../screens/financer/LedgerScreen";
import { InterestScheduleScreen } from "../screens/financer/InterestScheduleScreen";
import { NotificationsScreen } from "../screens/financer/NotificationsScreen";
import { ReportsScreen } from "../screens/financer/ReportsScreen";
import { FinancerServiceChargeScreen } from "../screens/financer/FinancerServiceChargeScreen";
import { SupportScreen } from "../screens/financer/SupportScreen";
import { FinancerSettingsScreen } from "../screens/financer/FinancerSettingsScreen";

const Drawer = createDrawerNavigator();

function CustomDrawerContent(props: any) {
  const { user, logout } = useAuth();
  
  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
      <View style={s.header}>
        <Logo size={40} />
        <View style={s.headerText}>
          <Text style={s.portalTitle}>INRFS FINANCER</Text>
          <Text style={s.userName} numberOfLines={1}>
            {user?.businessName ?? user?.fullName ?? user?.email}
          </Text>
        </View>
      </View>
      
      <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 0 }}>
        <DrawerItemList {...props} />
      </DrawerContentScrollView>

      <View style={s.footer}>
        <DrawerItem
          label="Log out"
          icon={({ color, size }) => <Ionicons name="log-out-outline" size={size} color={color} />}
          onPress={() => Alert.alert("Log Out", "Are you sure you want to log out?", [
            { text: "Cancel", style: "cancel" },
            { text: "Log Out", style: "destructive", onPress: () => void logout() }
          ])}
          labelStyle={s.labelStyle}
          activeTintColor={colors.error}
          inactiveTintColor={colors.error}
        />
      </View>
    </SafeAreaView>
  );
}

export function FinancerDrawerNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: colors.white },
        headerTintColor: colors.dark,
        headerTitleStyle: { fontFamily: fonts.bold, fontSize: 16 },
        drawerActiveBackgroundColor: `${colors.cyan}15`,
        drawerActiveTintColor: colors.cyan,
        drawerInactiveTintColor: colors.subtle,
        drawerLabelStyle: s.labelStyle,
        drawerType: "slide",
      }}
    >
      <Drawer.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
        options={{ drawerIcon: ({ color }) => <Ionicons name="grid-outline" size={22} color={color} /> }} 
      />
      <Drawer.Screen 
        name="Customers" 
        component={CustomersScreen} 
        options={{ drawerIcon: ({ color }) => <Ionicons name="people-outline" size={22} color={color} /> }} 
      />
      <Drawer.Screen 
        name="Loans" 
        component={LoansScreen} 
        options={{ drawerIcon: ({ color }) => <Ionicons name="wallet-outline" size={22} color={color} /> }} 
      />
      <Drawer.Screen 
        name="Payments" 
        component={DuesScreen} 
        options={{ drawerIcon: ({ color }) => <Ionicons name="cash-outline" size={22} color={color} /> }} 
      />
      <Drawer.Screen 
        name="Interest Schedule" 
        component={InterestScheduleScreen} 
        options={{ drawerIcon: ({ color }) => <Ionicons name="calendar-outline" size={22} color={color} /> }} 
      />
      <Drawer.Screen 
        name="Due / Overdue" 
        component={DueOverdueScreen} 
        options={{ drawerIcon: ({ color }) => <Ionicons name="alert-circle-outline" size={22} color={color} /> }} 
      />
      <Drawer.Screen 
        name="Customer Ledger" 
        component={LedgerScreen} 
        options={{ drawerIcon: ({ color }) => <Ionicons name="document-text-outline" size={22} color={color} /> }} 
      />
      <Drawer.Screen 
        name="Notifications" 
        component={NotificationsScreen} 
        options={{ drawerIcon: ({ color }) => <Ionicons name="notifications-outline" size={22} color={color} /> }} 
      />
      <Drawer.Screen 
        name="Reports" 
        component={ReportsScreen} 
        options={{ drawerIcon: ({ color }) => <Ionicons name="bar-chart-outline" size={22} color={color} /> }} 
      />
      <Drawer.Screen 
        name="Service Charge" 
        component={FinancerServiceChargeScreen} 
        options={{ drawerIcon: ({ color }) => <Ionicons name="receipt-outline" size={22} color={color} /> }} 
      />
      <Drawer.Screen 
        name="Support" 
        component={SupportScreen} 
        options={{ drawerIcon: ({ color }) => <Ionicons name="information-circle-outline" size={22} color={color} /> }} 
      />
      <Drawer.Screen 
        name="Settings" 
        component={FinancerSettingsScreen} 
        options={{ drawerIcon: ({ color }) => <Ionicons name="settings-outline" size={22} color={color} /> }} 
      />
    </Drawer.Navigator>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 8,
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  portalTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.cyan,
    letterSpacing: 0.5,
  },
  userName: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  labelStyle: {
    fontFamily: fonts.medium,
    fontSize: 14,
    marginLeft: -10,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    paddingBottom: 8,
  }
});
