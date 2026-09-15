import { useState } from "react";
import { Alert, Modal, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, Field, Segmented } from "../../components/ui";
import { pickDocument, type PickedDocument, uploadPickedDocument } from "../../services/nativeDocuments";
import { platformApi } from "../../services/platformApi";
import { colors, fonts } from "../../theme/tokens";
const empty = { name: "", mobile: "", email: "", dob: "", gender: "", houseNumber: "", street: "", area: "", city: "", state: "", pinCode: "", aadhaar: "", pan: "" };
const categories = ["Aadhaar", "Pan", "AddressProof", "Photograph", "Other"] as const;
const msg = (e: unknown) => (e instanceof Error ? e.message : "Please try again.");

export function CustomerOnboarding({ visible, close, onCreated }: { visible: boolean; close: () => void; onCreated: () => Promise<void> }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(empty);
  const [files, setFiles] = useState<Partial<Record<(typeof categories)[number], PickedDocument>>>({});
  const [busy, setBusy] = useState(false);

  const update = (key: keyof typeof form, value: string) => setForm({ ...form, [key]: value });
  const dismiss = () => {
    setStep(1);
    setForm(empty);
    setFiles({});
    close();
  };

  const next = () => {
    if (step === 1 && (!form.name.trim() || !form.mobile.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(form.dob))) {
      return Alert.alert("Required fields", "Name, mobile and date of birth (YYYY-MM-DD) are required.");
    }
    if (step === 2 && (!form.city.trim() || !form.state.trim() || !form.pinCode.trim())) {
      return Alert.alert("Required fields", "City, state and PIN code are required.");
    }
    setStep((x) => Math.min(4, x + 1));
  };

  const choose = async (category: (typeof categories)[number]) => {
    const asset = await pickDocument(category === "Photograph" ? "image/*" : "*/*");
    if (asset) setFiles({ ...files, [category]: asset });
  };

  const save = async () => {
    setBusy(true);
    try {
      const created = await platformApi.customers.create({
        fullName: form.name.trim(),
        dateOfBirth: form.dob.trim(),
        gender: form.gender || null,
        phone: form.mobile.trim(),
        email: form.email.trim() || null,
        addressLine1: [form.houseNumber, form.street].filter(Boolean).join(", ") || form.area,
        addressLine2: form.area || null,
        city: form.city.trim(),
        state: form.state.trim(),
        postalCode: form.pinCode.trim(),
        aadhaar: form.aadhaar.trim() || null,
        pan: form.pan.trim().toUpperCase() || null,
      });
      await Promise.all(
        Object.entries(files).map(([category, asset]) =>
          uploadPickedDocument(asset as PickedDocument, category, { customerId: created.id })
        )
      );
      await onCreated();
      dismiss();
    } catch (e) {
      Alert.alert("Customer not created", msg(e));
    } finally {
      setBusy(false);
    }
  };

  const names = ["Personal", "Address", "Identity", "Documents"];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={dismiss}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          <Text style={{ fontSize: 22, fontFamily: fonts.extrabold, color: colors.dark, letterSpacing: -0.3 }}>
            Add Customer · Step {step} of 4
          </Text>
          <Segmented options={names} value={names[step - 1] ?? names[0]!} onChange={(v) => setStep(names.indexOf(v) + 1)} />

          {step === 1 ? (
            <Card>
              <Field label="Full name *" value={form.name} onChangeText={(v) => update("name", v)} placeholder="e.g. Ramesh Kumar" />
              <Field label="Mobile *" value={form.mobile} onChangeText={(v) => update("mobile", v)} keyboardType="phone-pad" placeholder="10-digit mobile" />
              <Field label="Email" value={form.email} onChangeText={(v) => update("email", v)} keyboardType="email-address" autoCapitalize="none" placeholder="name@example.com" />
              <Field label="Date of birth *" value={form.dob} onChangeText={(v) => update("dob", v)} placeholder="YYYY-MM-DD" />
              <Text style={{ color: colors.dark, fontFamily: fonts.semibold, fontSize: 12, marginTop: 4 }}>Gender</Text>
              <Segmented options={["Male", "Female", "Other"]} value={form.gender || "Male"} onChange={(v) => update("gender", v)} />
            </Card>
          ) : null}

          {step === 2 ? (
            <Card>
              <Field label="House / Flat Number" value={form.houseNumber} onChangeText={(v) => update("houseNumber", v)} placeholder="Flat / Door / House No" />
              <Field label="Street" value={form.street} onChangeText={(v) => update("street", v)} placeholder="Street / Road" />
              <Field label="Area" value={form.area} onChangeText={(v) => update("area", v)} placeholder="Locality / Landmark" />
              <Field label="City *" value={form.city} onChangeText={(v) => update("city", v)} placeholder="City" />
              <Field label="State *" value={form.state} onChangeText={(v) => update("state", v)} placeholder="State" />
              <Field label="PIN Code *" value={form.pinCode} onChangeText={(v) => update("pinCode", v)} keyboardType="number-pad" placeholder="6-digit PIN" />
            </Card>
          ) : null}

          {step === 3 ? (
            <Card>
              <Field label="Aadhaar Number" value={form.aadhaar} onChangeText={(v) => update("aadhaar", v)} keyboardType="number-pad" placeholder="12-digit Aadhaar" />
              <Field label="PAN Number" value={form.pan} onChangeText={(v) => update("pan", v.toUpperCase())} autoCapitalize="characters" placeholder="10-character PAN" />
            </Card>
          ) : null}

          {step === 4 ? (
            <Card>
              {categories.map((category) => (
                <View key={category} style={{ gap: 6, marginVertical: 4 }}>
                  <Button label={`${files[category] ? "Change" : "Upload"} ${category}`} variant="secondary" icon="cloud-upload-outline" onPress={() => void choose(category)} />
                  {files[category] ? <Text style={{ color: colors.cyanDark, fontFamily: fonts.medium, fontSize: 12, paddingHorizontal: 4 }}>✓ {files[category]?.name}</Text> : null}
                </View>
              ))}
            </Card>
          ) : null}

          <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
            <Button label="Cancel" variant="ghost" style={{ flex: 1 }} onPress={dismiss} />
            {step > 1 ? <Button label="Back" variant="secondary" style={{ flex: 1 }} onPress={() => setStep((x) => x - 1)} /> : null}
            {step < 4 ? (
              <Button label="Continue" style={{ flex: 2 }} onPress={next} />
            ) : (
              <Button loading={busy} label="Save Customer" style={{ flex: 2 }} onPress={() => void save()} />
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
