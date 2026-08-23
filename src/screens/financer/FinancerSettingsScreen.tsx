import { useCallback, useEffect, useState } from "react";
import { Alert, Image, Text, View, ScrollView } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Button, Card, DataRow, Field } from "../../components/ui";
import { useAuth } from "../../auth/AuthContext";
import { platformApi } from "../../services/platformApi";
const msg = (e: unknown) =>
  e instanceof Error ? e.message : "Please try again.";
export function FinancerSettingsScreen() {
  const { updateUser } = useAuth();
  const [data, setData] = useState<any>(null);
  const [form, setForm] = useState({
    name: "",
    businessName: "",
    mobile: "",
    email: "",
    city: "",
    state: "",
    profileImage: "",
    plan: "",
  });
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const p = await platformApi.profile.get();
      setData(p);
      const fullName =
        p.user?.fullName ??
        [p.user?.firstName, p.user?.lastName].filter(Boolean).join(" ");
      setForm({
        name: fullName ?? "",
        businessName: p.financer?.displayName ?? "",
        mobile: p.user?.phone ?? "",
        email: p.user?.email ?? "",
        city: p.financer?.city ?? "",
        state: p.financer?.state ?? "",
        profileImage: p.profileImage ?? "",
        plan: p.plan ?? "No active plan",
      });
    } catch (e) {
      Alert.alert("Profile unavailable", msg(e));
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const pickPhoto = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "image/*",
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset) return;
    if ((asset.size ?? 0) > 2 * 1024 * 1024)
      return Alert.alert(
        "Image too large",
        "Profile photo must be 2 MB or smaller.",
      );
    const base64 = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    setForm({
      ...form,
      profileImage: `data:${asset.mimeType ?? "image/jpeg"};base64,${base64}`,
    });
  };
  const save = async () => {
    setBusy(true);
    try {
      const saved = await platformApi.profile.update({
        fullName: form.name,
        businessName: form.businessName,
        mobile: form.mobile,
        email: form.email,
        city: form.city,
        state: form.state,
        profileImageDataUrl: form.profileImage || null,
      });
      updateUser({
        firstName: saved.user?.firstName,
        lastName: saved.user?.lastName,
        email: saved.user?.email,
        mobile: saved.user?.phone,
        fullName: saved.user?.fullName,
      });
      await load();
      Alert.alert("Saved", "Details saved successfully.");
    } catch (e) {
      Alert.alert("Profile not saved", msg(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 80 }}>
      {form.profileImage ? (
        <Image
          source={{ uri: form.profileImage }}
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            alignSelf: "center",
          }}
        />
      ) : null}
      <DataRow title="Subscription plan" amount={form.plan} />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button
          label={form.profileImage ? "Change photo" : "Add photo"}
          variant="secondary"
          onPress={() => void pickPhoto()}
        />
        {form.profileImage ? (
          <Button
            label="Remove photo"
            variant="danger"
            onPress={() => setForm({ ...form, profileImage: "" })}
          />
        ) : null}
      </View>
      <Card>
        <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 8, color: "#fff" }}>Profile Details</Text>
        <Field
          label="Full name"
          value={form.name}
          onChangeText={(v) => setForm({ ...form, name: v })}
        />
        <Field
          label="Business name"
          value={form.businessName}
          onChangeText={(v) => setForm({ ...form, businessName: v })}
        />
        <Field
          label="Mobile"
          value={form.mobile}
          onChangeText={(v) => setForm({ ...form, mobile: v })}
        />
        <Field
          label="Email"
          value={form.email}
          onChangeText={(v) => setForm({ ...form, email: v })}
          keyboardType="email-address"
        />
        <Field
          label="City"
          value={form.city}
          onChangeText={(v) => setForm({ ...form, city: v })}
        />
        <Field
          label="State"
          value={form.state}
          onChangeText={(v) => setForm({ ...form, state: v })}
        />
        <Button
          loading={busy}
          label="Save changes"
          onPress={() => void save()}
        />
      </Card>
      {!data ? <Text style={{color: "#fff"}}>Loading profile…</Text> : null}
    </ScrollView>
  );
}
