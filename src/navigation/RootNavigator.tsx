import { createNativeStackNavigator } from "@react-navigation/native-stack";

import {
  AdminLoginScreen,
  FinancerLoginScreen,
  FinancerOtpScreen,
  FinancerRegisterScreen,
  FinancerWelcomeScreen,
  LegalNoticeScreen,
  PrivacyPolicyScreen,
  PortalSelectionScreen,
  ResetPasswordScreen,
  TermsOfUseScreen,
} from "../screens/auth/AuthScreens";
import { LiveAdminAppScreen } from "../screens/admin/LiveAdminAppScreen";
import { FinancerDrawerNavigator } from "./FinancerDrawerNavigator";
import type { RootStackParamList } from "../types/navigation";
import { useAuth } from "../auth/AuthContext";
import { ActivityIndicator, Text, View } from "react-native";
import { colors } from "../theme/tokens";
import { Button } from "../components/ui";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { user, loading, showWelcome, dismissWelcome, hasRole, logout } = useAuth();
  if (loading) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.cyan} size="large" /></View>;
  if (user) {
    const hasAdminRole = hasRole("SuperAdmin", "Admin", "ComplianceOfficer", "FinanceOfficer", "CollectionAgent", "SupportAgent", "Auditor");
    const hasFinancerRole = hasRole("FinancerOwner", "FinancerManager", "LoanOfficer", "CollectionAgent");
    const admin = !user.financerId && hasAdminRole;
    const financer = hasFinancerRole && (Boolean(user.financerId) || !hasAdminRole);
    if (showWelcome && financer) return <FinancerWelcomeScreen navigation={{ replace: dismissWelcome } as never} route={{} as never}/>;
    if (admin) return <Stack.Navigator screenOptions={{ headerShown: false }}><Stack.Screen name="AdminApp" component={LiveAdminAppScreen} /></Stack.Navigator>;
    if (financer) return <Stack.Navigator screenOptions={{ headerShown: false }}><Stack.Screen name="FinancerApp" component={FinancerDrawerNavigator} /></Stack.Navigator>;
    return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 16 }}><Text style={{ color: colors.dark, textAlign: "center" }}>Your account does not have access to an INRFS portal.</Text><Button label="Sign out" onPress={() => void logout()} /></View>;
  }
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PortalSelection" component={PortalSelectionScreen} />
      <Stack.Screen name="FinancerLogin" component={FinancerLoginScreen} />
      <Stack.Screen name="FinancerRegister" component={FinancerRegisterScreen} />
      <Stack.Screen name="FinancerOtp" component={FinancerOtpScreen} />
      <Stack.Screen name="FinancerWelcome" component={FinancerWelcomeScreen} />
      <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen name="LegalNotice" component={LegalNoticeScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="TermsOfUse" component={TermsOfUseScreen} />
    </Stack.Navigator>
  );
}
