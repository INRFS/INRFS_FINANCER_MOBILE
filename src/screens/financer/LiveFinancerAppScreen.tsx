import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../auth/AuthContext";
import { Ionicons } from "../../components/AppIcon";
import { Logo } from "../../components/Logo";
import { colors } from "../../theme/tokens";

import { s } from "./styles";
import { DashboardScreen } from "./DashboardScreen";
import { CustomersScreen } from "./CustomersScreen";
import { LoansScreen } from "./LoansScreen";
import { DuesScreen } from "./DuesScreen";
import { MoreScreen } from "./MoreScreen";

type Page = "Dashboard" | "Customers" | "Loans" | "Dues" | "More";

export function LiveFinancerAppScreen() {
  const { logout, user } = useAuth(); 
  const [page, setPage] = useState<Page>("Dashboard");
  
  const body = page === "Dashboard" ? <DashboardScreen go={setPage}/> : 
               page === "Customers" ? <CustomersScreen/> : 
               page === "Loans" ? <LoansScreen/> : 
               page === "Dues" ? <DuesScreen/> : <MoreScreen/>;
               
  const pages: Page[] = ["Dashboard", "Customers", "Loans", "Dues", "More"];
  const icons = { Dashboard: "grid-outline", Customers: "people-outline", Loans: "wallet-outline", Dues: "calendar-outline", More: "menu" } as const;
  
  return (
    <View style={s.app}>
      <SafeAreaView edges={["top"]} style={s.top}>
        <Logo size={32}/>
        <Text style={s.portal}>FINANCER</Text>
        <Text numberOfLines={1} style={s.user}>{user?.businessName ?? user?.fullName ?? user?.email}</Text>
        <Pressable accessibilityLabel="Log out" onPress={() => void logout()}>
          <Ionicons name="log-out-outline" size={23} color={colors.muted}/>
        </Pressable>
      </SafeAreaView>
      <View style={s.body}>{body}</View>
      <View style={s.nav}>
        {pages.map(x => (
          <Pressable key={x} style={s.navItem} onPress={() => setPage(x)}>
            <Ionicons name={icons[x]} size={20} color={page === x ? colors.cyan : colors.subtle}/>
            <Text style={[s.navText, page === x && s.active]}>{x}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
