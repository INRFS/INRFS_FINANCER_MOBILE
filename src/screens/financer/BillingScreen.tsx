import React, { useCallback } from "react";
import { View, Text, Alert } from "react-native";
import { Card, DataRow, Button } from "../../components/ui";
import { pageItems, platformApi } from "../../services/platformApi";
import { RemoteState, useRemote } from "./shared";
import { s } from "./styles";

const rupees = (v: unknown) => `₹${Number(v ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export function BillingScreen() {
  const load = useCallback(() => platformApi.admin.invoices({ pageSize: 100 }), []);
  const state = useRemote(load, { items: [] } as any);

  return (
    <View style={s.gap}>
      <RemoteState {...state} retry={() => void state.refresh()} />
      
      {pageItems(state.data).length === 0 && !state.loading && (
        <Text style={[s.muted, { textAlign: "center", marginTop: 20 }]}>No billing records found.</Text>
      )}

      {pageItems(state.data).map((x: any) => (
        <Card key={x.id}>
          <DataRow 
            title={x.invoiceNumber ?? "Service charge"} 
            subtitle={`${String(x.periodStart).slice(0, 10)} – ${String(x.periodEnd).slice(0, 10)} · ${x.status}`} 
            amount={rupees(x.chargeAmount)} 
          />
          <DataRow title="Collected" amount={rupees(x.collectedAmount)} />
          {x.status !== "Paid" && (
            <Button 
              label="Pay Now" 
              variant="secondary" 
              onPress={() => Alert.alert("Payment", "Routing to payment gateway...")} 
              style={{ marginTop: 10 }}
            />
          )}
        </Card>
      ))}
    </View>
  );
}
