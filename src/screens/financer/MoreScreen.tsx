import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import { Screen, Header, Segmented } from "../../components/ui";
import { s } from "./styles";
import { NotificationsScreen } from "./NotificationsScreen";
import { LedgerScreen } from "./LedgerScreen";
import { ReportsScreen } from "./ReportsScreen";
import { BillingScreen } from "./BillingScreen";
import { SupportScreen } from "./SupportScreen";
import { SettingsScreen } from "./SettingsScreen";
import { InterestScheduleScreen } from "./InterestScheduleScreen";
import { DueOverdueScreen } from "./DueOverdueScreen";

export function MoreScreen() {
  const [section, setSection] = useState<string>("Notifications");
  const labels = ["Notifications", "Ledger", "Interest Schedule", "Due & Overdue", "Reports", "Billing", "Support", "Settings"];

  return (
    <Screen>
      <Header title="More" subtitle="Advanced Financer functions" />
      <View style={s.gap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Segmented options={labels} value={section} onChange={setSection} />
        </ScrollView>

        {section === "Notifications" && <NotificationsScreen />}
        {section === "Ledger" && <LedgerScreen />}
        {section === "Interest Schedule" && <InterestScheduleScreen />}
        {section === "Due & Overdue" && <DueOverdueScreen />}
        {section === "Reports" && <ReportsScreen />}
        {section === "Billing" && <BillingScreen />}
        {section === "Support" && <SupportScreen />}
        {section === "Settings" && <SettingsScreen />}
      </View>
    </Screen>
  );
}
