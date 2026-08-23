import React, { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, ScrollView, Text, View, Modal } from "react-native";
import { Button, Card, DataRow, Field, Header, Screen, Segmented, SectionTitle } from "../../components/ui";
import { pageItems, platformApi } from "../../services/platformApi";
import { RemoteState, useRemote } from "./shared";
import { s } from "./styles";
import { Ionicons } from "../../components/AppIcon";
import { colors, fonts } from "../../theme/tokens";
import { SafeAreaView } from "react-native-safe-area-context";
import { downloadAndShareDocument, pickAndUploadDocument, pickDocument, uploadPickedDocument } from "../../services/nativeDocuments";

const rupees = (v: unknown) => `₹${Number(v ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export function CustomersScreen() {
  const load = useCallback(() => platformApi.customers.all(), []);
  const state = useRemote(load, { items: [] } as any);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isAdding, setIsAdding] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const rows = useMemo(() => {
    return pageItems(state.data).filter((x: any) => {
      const matchSearch = `${x.fullName} ${x.phone} ${x.customerNumber}`.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "All" || x.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [state.data, search, statusFilter]);

  if (isAdding) {
    return <AddCustomerWizard onCancel={() => setIsAdding(false)} onSaved={async () => { setIsAdding(false); await state.refresh(); }} />;
  }

  return (
    <Screen>
      <Header
        title="Customers"
        subtitle="Manage your customers and their loan accounts."
        action={<Button label="Add" icon="add" onPress={() => setIsAdding(true)} />}
      />

      <View style={s.gap}>
        <Field label="Search" value={search} onChangeText={setSearch} placeholder="Name, phone or customer ID" />
        <Segmented options={["All", "Active", "Due", "Overdue", "Closed"]} value={statusFilter} onChange={setStatusFilter} />
      </View>

      <RemoteState {...state} retry={() => void state.refresh()} />

      <FlatList
        data={rows}
        keyExtractor={x => x.id}
        contentContainerStyle={{ paddingBottom: 80, gap: 14, paddingTop: 14 }}
        renderItem={({ item: x }) => (
          <Card>
            <View style={s.between}>
              <View style={s.flex}>
                <Text style={s.title}>{x.fullName}</Text>
                <Text style={s.meta}>{x.customerNumber ?? x.id} · {x.phone ?? "—"}</Text>
              </View>
              <View>
                <Text style={s.balance}>{rupees(x.outstanding)}</Text>
                <Text style={[s.meta, { textAlign: "right" }]}>{x.status || "Active"}</Text>
              </View>
            </View>
            <View style={[s.row, { marginTop: 12 }]}>
              <Button style={s.flex} label="View" variant="secondary" onPress={() => setSelectedCustomer(x)} />
              <Button style={s.flex} label="Edit" variant="ghost" onPress={() => Alert.alert("Edit", "Edit customer coming soon")} />
            </View>
          </Card>
        )}
      />

      <Sheet visible={selectedCustomer !== null} title={selectedCustomer?.fullName ?? "Customer"} close={() => setSelectedCustomer(null)}>
        {selectedCustomer && <CustomerDetails customer={selectedCustomer} refreshList={() => void state.refresh()} />}
      </Sheet>
    </Screen>
  );
}

function AddCustomerWizard({ onCancel, onSaved }: { onCancel: () => void, onSaved: () => Promise<void> }) {
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);

  // Form State matching WEB
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("Other");

  const [houseNumber, setHouseNumber] = useState("");
  const [street, setStreet] = useState("");
  const [area, setArea] = useState("");
  const [city, setCity] = useState("");
  const [state, setStateName] = useState("");
  const [pinCode, setPinCode] = useState("");

  const [aadhaar, setAadhaar] = useState("");
  const [pan, setPan] = useState("");
  
  // Document State
  const [aadhaarDoc, setAadhaarDoc] = useState<any>(null);
  const [panDoc, setPanDoc] = useState<any>(null);
  const [addressProof, setAddressProof] = useState<any>(null);
  const [photograph, setPhotograph] = useState<any>(null);

  const save = async () => {
    if (!name.trim() || !phone.trim() || !city.trim() || !state.trim() || !pinCode.trim()) {
      return Alert.alert("Missing Fields", "Please complete all required fields.");
    }
    setBusy(true);
    try {
      const created = await platformApi.customers.create({
        fullName: name.trim(),
        dateOfBirth: dob || null,
        gender,
        phone: phone.trim(),
        email: email.trim() || null,
        addressLine1: `${houseNumber} ${street}`.trim(),
        addressLine2: area.trim(),
        city: city.trim(),
        state: state.trim(),
        postalCode: pinCode.trim(),
        aadhaar: aadhaar.trim() || null,
        pan: pan.trim() || null
      });
      
      const uploads = [
        [aadhaarDoc, "Aadhaar"],
        [panDoc, "Pan"],
        [addressProof, "AddressProof"],
        [photograph, "Photograph"]
      ].filter(([doc]) => doc !== null);
      
      await Promise.all(uploads.map(([doc, category]) => uploadPickedDocument(doc, category as string, { customerId: created.id })));
      
      await onSaved();
    } catch (e) {
      Alert.alert("Customer not saved", e instanceof Error ? e.message : "Error saving");
    } finally {
      setBusy(false);
    }
  };

  const handlePick = async (setter: (v: any) => void) => {
    try {
      const doc = await pickDocument();
      if (doc) setter(doc);
    } catch (e) {
      Alert.alert("Picker Error", "Could not select document.");
    }
  };

  return (
    <Screen>
      <Header
        title={`Add Customer (Step ${step}/4)`}
        action={<Button label="Cancel" variant="ghost" onPress={onCancel} />}
      />
      <ScrollView contentContainerStyle={s.gap}>
        {step === 1 && (
          <Card>
            <Text style={s.label}>Personal Information</Text>
            <View style={s.gap}>
              <Field label="Full name *" value={name} onChangeText={setName} />
              <Field label="Mobile *" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
              <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
              <Field label="Date of birth" value={dob} onChangeText={setDob} placeholder="YYYY-MM-DD" />
              <Segmented options={["Male", "Female", "Other"]} value={gender} onChange={setGender} />
            </View>
            <Button label="Next: Address" onPress={() => setStep(2)} style={{ marginTop: 20 }} />
          </Card>
        )}

        {step === 2 && (
          <Card>
            <Text style={s.label}>Address Details</Text>
            <View style={s.gap}>
              <Field label="House Number" value={houseNumber} onChangeText={setHouseNumber} />
              <Field label="Street" value={street} onChangeText={setStreet} />
              <Field label="Area/Village" value={area} onChangeText={setArea} />
              <Field label="City *" value={city} onChangeText={setCity} />
              <Field label="State *" value={state} onChangeText={setStateName} />
              <Field label="PIN Code *" value={pinCode} onChangeText={setPinCode} keyboardType="number-pad" />
            </View>
            <View style={[s.row, { marginTop: 20 }]}>
              <Button style={s.flex} label="Back" variant="secondary" onPress={() => setStep(1)} />
              <Button style={s.flex} label="Next: KYC" onPress={() => setStep(3)} />
            </View>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <Text style={s.label}>KYC Details</Text>
            <View style={s.gap}>
              <Field label="Aadhaar Number" value={aadhaar} onChangeText={setAadhaar} keyboardType="number-pad" />
              <Field label="PAN" value={pan} onChangeText={setPan} autoCapitalize="characters" />
            </View>
            <View style={[s.row, { marginTop: 20 }]}>
              <Button style={s.flex} label="Back" variant="secondary" onPress={() => setStep(2)} />
              <Button style={s.flex} label="Next: Documents" onPress={() => setStep(4)} />
            </View>
          </Card>
        )}

        {step === 4 && (
          <Card>
            <Text style={s.label}>Documents (Optional)</Text>
            <View style={s.gap}>
              <Text style={s.muted}>Select documents to attach to this customer profile.</Text>
              <Button label={aadhaarDoc ? `Selected: ${aadhaarDoc.name}` : "Select Aadhaar Document"} variant="secondary" onPress={() => void handlePick(setAadhaarDoc)} />
              <Button label={panDoc ? `Selected: ${panDoc.name}` : "Select PAN Document"} variant="secondary" onPress={() => void handlePick(setPanDoc)} />
              <Button label={addressProof ? `Selected: ${addressProof.name}` : "Select Address Proof"} variant="secondary" onPress={() => void handlePick(setAddressProof)} />
              <Button label={photograph ? `Selected: ${photograph.name}` : "Select Photograph"} variant="secondary" onPress={() => void handlePick(setPhotograph)} />
            </View>
            <View style={[s.row, { marginTop: 20 }]}>
              <Button style={s.flex} label="Back" variant="secondary" onPress={() => setStep(3)} disabled={busy} />
              <Button style={s.flex} label="Save Customer" loading={busy} onPress={() => void save()} />
            </View>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

function CustomerDetails({ customer, refreshList }: { customer: any, refreshList: () => void }) {
  const [tab, setTab] = useState("Overview");
  
  return (
    <View style={{ flex: 1 }}>
      <Segmented options={["Overview", "Loans", "Payments", "Schedule", "Ledger", "Documents"]} value={tab} onChange={setTab} />
      <ScrollView contentContainerStyle={{ gap: 16, paddingTop: 16, paddingBottom: 40 }}>
        {tab === "Overview" && (
          <Card>
            <DataRow title="Mobile" subtitle={customer.phone || "-"} />
            <DataRow title="City" subtitle={customer.city || "-"} />
            <DataRow title="Status" subtitle={customer.status || "Active"} />
            <DataRow title="Outstanding" subtitle={rupees(customer.outstanding)} />
            <View style={[s.row, { marginTop: 16 }]}>
              <Button style={s.flex} label="Add Loan" onPress={() => Alert.alert("Action", "Add loan")} />
              <Button style={s.flex} label="Record Payment" variant="secondary" onPress={() => Alert.alert("Action", "Record Payment")} />
            </View>
          </Card>
        )}
        {tab === "Loans" && <Text style={s.muted}>Loans list here</Text>}
        {tab === "Payments" && <Text style={s.muted}>Payments list here</Text>}
        {tab === "Schedule" && <Text style={s.muted}>Interest Schedule here</Text>}
        {tab === "Ledger" && <Text style={s.muted}>Ledger entries here</Text>}
        {tab === "Documents" && <CustomerDocuments customer={customer} />}
      </ScrollView>
    </View>
  );
}

function CustomerDocuments({ customer }: { customer: any }) {
  const load = useCallback(() => platformApi.documents.listForCustomer(customer.id), [customer.id]);
  const state = useRemote(load, { items: [] } as any);
  
  const upload = async () => {
    try {
      await pickAndUploadDocument("Other", { customerId: customer.id });
      await state.refresh();
    } catch (e) {
      Alert.alert("Upload failed", e instanceof Error ? e.message : "Error");
    }
  };
  
  return (
    <View style={s.gap}>
      <Button label="Upload Document" icon="add" onPress={() => void upload()} />
      <RemoteState {...state} retry={() => void state.refresh()} />
      {pageItems(state.data).map(x => (
        <Card key={x.id}>
          <DataRow title={x.originalFileName ?? x.fileName ?? "Document"} subtitle={`${x.category ?? ""} · ${x.status ?? ""}`} />
          <View style={s.row}>
            <Button style={s.flex} label="Open" variant="secondary" onPress={() => void downloadAndShareDocument(x.id, x.originalFileName)} />
            <Button style={s.flex} label="Delete" variant="danger" onPress={async () => {
              try { await platformApi.documents.remove(x.id); await state.refresh(); } 
              catch (e) { Alert.alert("Error", "Could not delete"); }
            }} />
          </View>
        </Card>
      ))}
    </View>
  );
}

function Sheet({ visible, title, close, children }: { visible: boolean; title: string; close: () => void; children: React.ReactNode }) { 
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={s.overlay}>
        <SafeAreaView edges={["bottom", "top"]} style={s.sheet}>
          <View style={s.between}>
            <Text style={s.sheetTitle}>{title}</Text>
            <Pressable onPress={close}><Ionicons name="close" size={25} /></Pressable>
          </View>
          <View style={s.form}>{children}</View>
        </SafeAreaView>
      </View>
    </Modal>
  ); 
}
