import React, { useCallback, useState } from "react";
import { View, Text, Alert, ScrollView } from "react-native";
import { Card, DataRow, Button, Field, Segmented, Header } from "../../components/ui";
import { pageItems, platformApi } from "../../services/platformApi";
import { RemoteState, useRemote } from "./shared";
import { s } from "./styles";

export function SupportScreen() {
  const load = useCallback(() => platformApi.support.list({ pageSize: 100 }), []);
  const state = useRemote(load, { items: [] } as any);
  
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Technical");
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!subject.trim() || !description.trim()) {
      return Alert.alert("Missing Fields", "Subject and description are required.");
    }
    setBusy(true);
    try {
      await platformApi.support.create({
        subject: subject.trim(),
        category,
        priority: "Medium",
        description: description.trim()
      });
      setOpen(false);
      setSubject("");
      setDescription("");
      await state.refresh();
    } catch (e) {
      Alert.alert("Ticket not created", e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  if (open) {
    return (
      <View style={s.gap}>
        <Header title="New Support Ticket" action={<Button label="Cancel" variant="ghost" onPress={() => setOpen(false)} />} />
        <Card>
          <View style={s.gap}>
            <Field label="Subject" value={subject} onChangeText={setSubject} />
            <Text style={s.meta}>Category</Text>
            <Segmented options={["Technical", "Billing", "Account", "Other"]} value={category} onChange={setCategory} />
            <Field label="Description" value={description} onChangeText={setDescription} multiline />
            <Button loading={busy} label="Submit ticket" onPress={() => void create()} />
          </View>
        </Card>
      </View>
    );
  }

  return (
    <View style={s.gap}>
      <Button label="Create support ticket" icon="add" onPress={() => setOpen(true)} />
      <RemoteState {...state} retry={() => void state.refresh()} />
      
      {pageItems(state.data).length === 0 && !state.loading && (
        <Text style={[s.muted, { textAlign: "center", marginTop: 20 }]}>No support tickets found.</Text>
      )}

      {pageItems(state.data).map((x: any) => (
        <Card key={x.id}>
          <DataRow 
            title={x.subject} 
            subtitle={`${x.ticketNumber ?? ""} · ${x.category} · ${new Date(x.createdAt).toLocaleDateString()}`} 
            amount={x.status} 
          />
          <View style={[s.row, { marginTop: 10 }]}>
            <Button label="View Details" variant="secondary" style={s.flex} onPress={() => Alert.alert("Ticket", x.description)} />
          </View>
        </Card>
      ))}
    </View>
  );
}
