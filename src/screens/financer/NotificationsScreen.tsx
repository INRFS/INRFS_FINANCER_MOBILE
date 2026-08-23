import React, { useCallback, useMemo, useState } from "react";
import { View, Text, Pressable, Alert } from "react-native";
import { Card, Button, Segmented, Field } from "../../components/ui";
import { pageItems, platformApi } from "../../services/platformApi";
import { RemoteState, useRemote } from "./shared";
import { s } from "./styles";

export function NotificationsScreen() {
  const load = useCallback(() => platformApi.notifications.list({ pageSize: 100 }), []);
  const state = useRemote(load, { items: [] } as any);
  
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    return pageItems(state.data).filter((x: any) => {
      const matchStatus = filter === "All" || (filter === "Unread" ? !x.isRead : x.isRead);
      const matchSearch = !search || x.title?.toLowerCase().includes(search.toLowerCase()) || x.message?.toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [state.data, filter, search]);

  const markAllRead = async () => {
    try {
      await platformApi.notifications.readAll();
      await state.refresh();
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to mark all as read");
    }
  };

  const markRead = async (id: string) => {
    try {
      await platformApi.notifications.read(id);
      await state.refresh();
    } catch (e) {
      // Background fail
    }
  };

  return (
    <View style={s.gap}>
      <View style={s.between}>
        <Segmented options={["All", "Unread", "Read"]} value={filter} onChange={setFilter} />
        <Button label="Mark all read" variant="ghost" onPress={() => void markAllRead()} />
      </View>
      <Field label="Search" value={search} onChangeText={setSearch} placeholder="Search notifications" />
      
      <RemoteState {...state} retry={() => void state.refresh()} />

      {rows.length === 0 && !state.loading && (
        <Text style={[s.muted, { textAlign: "center", marginTop: 20 }]}>No notifications found.</Text>
      )}

      {rows.map((x: any) => (
        <Card key={x.id}>
          <Pressable onPress={async () => {
            if (!x.isRead) await markRead(x.id);
            Alert.alert(x.title, x.message);
          }}>
            <View style={s.between}>
              <Text style={[s.title, !x.isRead && { color: "#000" }]}>{x.title}</Text>
              {!x.isRead && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#3b82f6" }} />}
            </View>
            <Text style={s.muted}>{x.message}</Text>
            <Text style={s.meta}>{new Date(x.createdAt || Date.now()).toLocaleString()}</Text>
          </Pressable>
        </Card>
      ))}
    </View>
  );
}
