import { createNativeStackNavigator } from "@react-navigation/native-stack";

import {
  AdminLoginScreen,
  FinancerLoginScreen,
  FinancerOtpScreen,
  FinancerRegisterScreen,
  FinancerWelcomeScreen,
  LegalNoticeScreen,
  PortalSelectionScreen,
  ResetPasswordScreen,
} from "../screens/auth/AuthScreens";
import { LiveAdminAppScreen } from "../screens/admin/LiveAdminAppScreen";
import { FinancerDrawerNavigator } from "./FinancerDrawerNavigator";
import type { RootStackParamList } from "../types/navigation";
import { useAuth } from "../auth/AuthContext";
import { ActivityIndicator, View } from "react-native";
import { colors } from "../theme/tokens";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { user, loading, showWelcome, dismissWelcome, hasRole } = useAuth();
  if (loading) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.cyan} size="large" /></View>;
  if (user) {
    const admin = hasRole("SuperAdmin", "Admin", "ComplianceOfficer", "FinanceOfficer", "CollectionAgent", "SupportAgent", "Auditor");
    if (showWelcome) return <FinancerWelcomeScreen navigation={{ replace: dismissWelcome } as never} route={{} as never}/>;
    return admin
      ? <Stack.Navigator screenOptions={{ headerShown: false }}><Stack.Screen name="AdminApp" component={LiveAdminAppScreen} /></Stack.Navigator>
      : <Stack.Navigator screenOptions={{ headerShown: false }}><Stack.Screen name="FinancerApp" component={FinancerDrawerNavigator} /></Stack.Navigator>;
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
    </Stack.Navigator>
  );
}
