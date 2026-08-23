import React, { useCallback, useEffect, useState } from "react";
import { View, Alert } from "react-native";
import { Card, Field, Button, Header } from "../../components/ui";
import { platformApi } from "../../services/platformApi";
import { RemoteState, useRemote } from "./shared";
import { s } from "./styles";

export function SettingsScreen() {
  const load = useCallback(() => platformApi.profile.get(), []);
  const state = useRemote(load, {} as any);
  
  const [name, setName] = useState("");
  const [business, setBusiness] = useState("");
  const [mobile, setMobile] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (state.data?.id) {
      setName(state.data.fullName ?? "");
      setBusiness(state.data.businessName ?? "");
      setMobile(state.data.mobile ?? "");
    }
  }, [state.data]);

  const save = async () => {
    setBusy(true);
    try {
      await platformApi.profile.update({
        fullName: name,
        businessName: business,
        mobile,
        email: state.data.email,
        city: state.data.city,
        state: state.data.state,
        profileImageDataUrl: state.data.profileImageDataUrl ?? null
      });
      Alert.alert("Success", "Profile updated successfully.");
      await state.refresh();
    } catch (e) {
      Alert.alert("Profile not saved", e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.gap}>
      <RemoteState {...state} retry={() => void state.refresh()} />
      <Card>
        <View style={s.gap}>
          <Field label="Full Name" value={name} onChangeText={setName} />
          <Field label="Business Name" value={business} onChangeText={setBusiness} />
          <Field label="Mobile Phone" value={mobile} onChangeText={setMobile} keyboardType="phone-pad" />
          <Button label="Save Profile Settings" loading={busy} onPress={() => void save()} />
        </View>
      </Card>
    </View>
  );
}
