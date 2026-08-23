import React, { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { Button, Card, DataRow, Field, Header, Screen, Segmented } from "../../components/ui";
import { pageItems, platformApi } from "../../services/platformApi";
import { RemoteState, useRemote } from "./shared";
import { s } from "./styles";
import { Ionicons } from "../../components/AppIcon";
import { colors } from "../../theme/tokens";

const rupees = (v: unknown) => `₹${Number(v ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export function CustomersScreen() {
  const load = useCallback(() => platformApi.customers.all(), []); 
  const state = useRemote(load, { items: [] } as any); 
  
  const [search, setSearch] = useState(""); 
  const [statusFilter, setStatusFilter] = useState("All");
  const [isAdding, setIsAdding] = useState(false);
  
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
        subtitle="Server-backed customer records" 
        action={<Button label="Add" icon="add" onPress={() => setIsAdding(true)}/>}
      />
      
      <View style={s.gap}>
        <Field label="Search" value={search} onChangeText={setSearch} placeholder="Name, phone or customer ID"/>
        <Segmented options={["All", "Active", "Overdue", "Inactive"]} value={statusFilter} onChange={setStatusFilter}/>
      </View>

      <RemoteState {...state} retry={() => void state.refresh()}/>
      
      <FlatList
        data={rows}
        keyExtractor={x => x.id}
        contentContainerStyle={{ paddingBottom: 80 }}
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
              <Button style={s.flex} label="View Details" variant="secondary" onPress={() => Alert.alert("Customer Details", "Routing to detailed view...")}/>
            </View>
          </Card>
        )}
      />
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

  const save = async () => { 
    if (!name.trim() || !phone.trim() || !city.trim() || !state.trim() || !pinCode.trim()) {
      return Alert.alert("Missing Fields", "Please complete all required fields.");
    }
    setBusy(true); 
    try { 
      await platformApi.customers.create({ 
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
      await onSaved();
    } catch (e) { 
      Alert.alert("Customer not saved", e instanceof Error ? e.message : "Error saving"); 
    } finally { 
      setBusy(false); 
    } 
  };

  return (
    <Screen>
      <Header 
        title={`Add Customer (Step ${step}/3)`} 
        action={<Button label="Cancel" variant="ghost" onPress={onCancel}/>}
      />
      <ScrollView contentContainerStyle={s.gap}>
        {step === 1 && (
          <Card>
            <Text style={s.label}>Personal Information</Text>
            <View style={s.gap}>
              <Field label="Full name *" value={name} onChangeText={setName}/>
              <Field label="Phone *" value={phone} onChangeText={setPhone} keyboardType="phone-pad"/>
              <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none"/>
              <Field label="Date of birth" value={dob} onChangeText={setDob} placeholder="YYYY-MM-DD"/>
              <Segmented options={["Male", "Female", "Other"]} value={gender} onChange={setGender}/>
            </View>
            <Button label="Next: Address" onPress={() => setStep(2)} style={{ marginTop: 20 }}/>
          </Card>
        )}
        
        {step === 2 && (
          <Card>
            <Text style={s.label}>Address Details</Text>
            <View style={s.gap}>
              <Field label="House Number" value={houseNumber} onChangeText={setHouseNumber}/>
              <Field label="Street" value={street} onChangeText={setStreet}/>
              <Field label="Area/Village" value={area} onChangeText={setArea}/>
              <Field label="City *" value={city} onChangeText={setCity}/>
              <Field label="State *" value={state} onChangeText={setStateName}/>
              <Field label="PIN Code *" value={pinCode} onChangeText={setPinCode} keyboardType="number-pad"/>
            </View>
            <View style={[s.row, { marginTop: 20 }]}>
              <Button style={s.flex} label="Back" variant="secondary" onPress={() => setStep(1)}/>
              <Button style={s.flex} label="Next: KYC" onPress={() => setStep(3)}/>
            </View>
          </Card>
        )}
        
        {step === 3 && (
          <Card>
            <Text style={s.label}>KYC & Documents</Text>
            <View style={s.gap}>
              <Field label="Aadhaar Number" value={aadhaar} onChangeText={setAadhaar} keyboardType="number-pad"/>
              <Field label="PAN" value={pan} onChangeText={setPan} autoCapitalize="characters"/>
            </View>
            <View style={[s.row, { marginTop: 20 }]}>
              <Button style={s.flex} label="Back" variant="secondary" onPress={() => setStep(2)} disabled={busy}/>
              <Button style={s.flex} label="Save Customer" loading={busy} onPress={() => void save()}/>
            </View>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}
