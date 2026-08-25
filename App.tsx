import "react-native-gesture-handler";

import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer, type LinkingOptions } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/inter";

import { RootNavigator } from "./src/navigation/RootNavigator";
import { AuthProvider } from "./src/auth/AuthContext";
import { colors } from "./src/theme/tokens";
import type { RootStackParamList } from "./src/types/navigation";

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ["inrfs-financer://", "https://app.inrfs.com"],
  config: {
    screens: {
      PortalSelection: "",
      FinancerLogin: "financer/login",
      FinancerRegister: "financer/register",
      FinancerOtp: "financer/verify-otp",
      FinancerWelcome: "financer/welcome",
      FinancerApp: {
        screens: {
          Dashboard: "financer/dashboard",
          Customers: "financer/customers",
          Loans: "financer/loans",
          Payments: "financer/payments",
          "Interest Schedule": "financer/interest-schedule",
          "Due / Overdue": "financer/due-overdue",
          "Customer Ledger": "financer/customer-ledger",
          Notifications: "financer/notifications",
          Reports: "financer/reports",
          "Service Charge": "financer/service-charge",
          Support: "financer/support",
          Settings: "financer/settings",
        },
      },
      AdminLogin: "admin/login",
      AdminApp: "admin/:section?/:financerId?",
      ResetPassword: "reset-password",
      LegalNotice: "legal/:type",
      PrivacyPolicy: "privacy-policy",
      TermsOfUse: "terms",
    },
  },
};

export default function App() {
  const [fontWaitExpired, setFontWaitExpired] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  useEffect(() => {
    const timeout = setTimeout(() => setFontWaitExpired(true), 2500);
    return () => clearTimeout(timeout);
  }, []);

  if (!fontsLoaded && !fontError && !fontWaitExpired) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.cyan} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer linking={linking}>
          <StatusBar style="dark" />
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
});
