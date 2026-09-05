import { useCallback, useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";
import { Button, Card, DataRow, Field, Grid, KpiCard, Segmented } from "../../components/ui";
import { pageItems, platformApi } from "../../services/platformApi";
import { isValidDateOnly, localDateOnly } from "../../utils/date";

const msg = (error: unknown) => error instanceof Error ? error.message : "Please try again.";
const validRate = (value: string) => Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100;
const setting = (value: string, valueType: string, description: string) => ({ value, valueType, description, isSecret: false, expectedVersion: null });

export function AdminServiceChargesScreen() {
  const [rows, setRows] = useState<any[]>([]);
  const [defaultRate, setDefaultRate] = useState("1");
  const [defaultDate, setDefaultDate] = useState(localDateOnly());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [rate, setRate] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [configurationStatus, setConfigurationStatus] = useState("Active");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [financerPayload, settingsPayload] = await Promise.all([
        platformApi.admin.allFinancers(),
        platformApi.settings.list("Platform"),
      ]);
      const platformSettings = pageItems(settingsPayload);
      const fallback = String(platformSettings.find((x: any) => x.key === "ServiceChargePercentage")?.value ?? 1);
      setDefaultRate(fallback);
      setDefaultDate(String(platformSettings.find((x: any) => x.key === "ServiceChargeEffectiveDate")?.value ?? localDateOnly()).slice(0, 10));
      const financers = pageItems(financerPayload);
      const scopes = await Promise.all(financers.map((x: any) => platformApi.settings.list(`Financer:${x.id}`).catch(() => [])));
      setRows(financers.map((financer: any, index: number) => {
        const values = pageItems(scopes[index]);
        const override = values.find((x: any) => x.key === "ServiceChargePercentage");
        return {
          ...financer,
          configuredRate: String(override?.value ?? financer.serviceChargePercentage ?? fallback),
          hasOverride: Boolean(override),
          effectiveDate: String(values.find((x: any) => x.key === "ServiceChargeEffectiveDate")?.value ?? financer.createdAt ?? localDateOnly()).slice(0, 10),
          configurationStatus: String(values.find((x: any) => x.key === "ServiceChargeConfigurationStatus")?.value ?? "Active"),
        };
      }));
    } catch (error) {
      Alert.alert("Service charges unavailable", msg(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const saveDefault = async () => {
    if (busy) return;
    if (!validRate(defaultRate)) return Alert.alert("Invalid rate", "Enter a percentage between 0 and 100.");
    if (!isValidDateOnly(defaultDate)) return Alert.alert("Invalid date", "Enter a real effective date as YYYY-MM-DD.");
    setBusy(true);
    try {
      await Promise.all([
        platformApi.settings.save("Platform", "ServiceChargePercentage", setting(String(Number(defaultRate)), "number", "Default platform service charge percentage")),
        platformApi.settings.save("Platform", "ServiceChargeEffectiveDate", setting(defaultDate, "date", "Default service charge effective date")),
      ]);
      await load();
      Alert.alert("Saved", "Default service charge configuration saved successfully.");
    } catch (error) {
      Alert.alert("Rate not saved", msg(error));
    } finally {
      setBusy(false);
    }
  };

  const saveOverride = async () => {
    if (busy || !selected) return;
    if (!validRate(rate)) return Alert.alert("Invalid rate", "Enter a percentage between 0 and 100.");
    if (!isValidDateOnly(effectiveDate)) return Alert.alert("Invalid date", "Enter a real effective date as YYYY-MM-DD.");
    setBusy(true);
    try {
      const scope = `Financer:${selected.id}`;
      await Promise.all([
        platformApi.settings.save(scope, "ServiceChargePercentage", setting(String(Number(rate)), "number", "Financer service charge override")),
        platformApi.settings.save(scope, "ServiceChargeEffectiveDate", setting(effectiveDate, "date", "Financer service charge effective date")),
        platformApi.settings.save(scope, "ServiceChargeConfigurationStatus", setting(configurationStatus, "string", "Financer service charge configuration status")),
      ]);
      await load();
      setSelected(null);
      Alert.alert("Saved", "Financer service charge updated successfully.");
    } catch (error) {
      Alert.alert("Override not saved", msg(error));
    } finally {
      setBusy(false);
    }
  };

  const edit = (item: any) => {
    setSelected(item);
    setRate(item.configuredRate);
    setEffectiveDate(item.effectiveDate ?? defaultDate);
    setConfigurationStatus(item.configurationStatus ?? "Active");
  };

  const toggle = async (item: any) => {
    if (busy) return;
    const next = item.configurationStatus === "Active" ? "Inactive" : "Active";
    setBusy(true);
    try {
      await platformApi.settings.save(`Financer:${item.id}`, "ServiceChargeConfigurationStatus", setting(next, "string", "Financer service charge configuration status"));
      await load();
    } catch (error) {
      Alert.alert("Status not saved", msg(error));
    } finally {
      setBusy(false);
    }
  };

  const filtered = rows.filter(item =>
    (statusFilter === "All" || item.configurationStatus === statusFilter)
    && `${item.displayName}${item.ownerName}${item.email}${item.id}`.toLowerCase().includes(search.toLowerCase())
  );

  if (selected) return <View style={{ gap: 14 }}>
    <Button label="Back to service charges" variant="ghost" disabled={busy} onPress={() => setSelected(null)}/>
    <Card>
      <Text>{selected.displayName ?? selected.legalName}</Text>
      <Field label="Financer ID" value={selected.id} editable={false}/>
      <Field label="Financer name" value={selected.displayName ?? selected.legalName} editable={false}/>
      <Field label="Service charge (%)" value={rate} onChangeText={setRate} keyboardType="decimal-pad" maxLength={6}/>
      <Field label="Effective date" value={effectiveDate} onChangeText={setEffectiveDate} placeholder="YYYY-MM-DD" maxLength={10}/>
      <Segmented options={["Active", "Inactive"]} value={configurationStatus} onChange={setConfigurationStatus} accent="purple"/>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button style={{ flex: 1 }} label="Cancel" variant="secondary" disabled={busy} onPress={() => setSelected(null)}/>
        <Button style={{ flex: 1 }} label="Save Changes" accent="purple" loading={busy} onPress={() => void saveOverride()}/>
      </View>
    </Card>
  </View>;

  return <View style={{ gap: 14 }}>
    <Grid>
      <KpiCard label="Total Configurations" value={String(rows.length)} accent="purple"/>
      <KpiCard label="Active" value={String(rows.filter(x => x.configurationStatus === "Active").length)} accent="green"/>
      <KpiCard label="Inactive" value={String(rows.filter(x => x.configurationStatus === "Inactive").length)} accent="orange"/>
      <KpiCard label="Default Rate" value={`${Number(defaultRate).toFixed(2)}%`} accent="cyan"/>
    </Grid>
    <Card>
      <Text>Default platform service charge</Text>
      <Text>This percentage applies when a financer does not have an active specific override.</Text>
      <Field label="Service charge (%)" value={defaultRate} onChangeText={setDefaultRate} keyboardType="decimal-pad" maxLength={6}/>
      <Field label="Effective date" value={defaultDate} onChangeText={setDefaultDate} placeholder="YYYY-MM-DD" maxLength={10}/>
      <DataRow title="Status" amount="Active"/>
      <Button label="Save default configuration" accent="purple" loading={busy} onPress={() => void saveDefault()}/>
    </Card>
    <Field label="Search financers" value={search} onChangeText={setSearch} placeholder="Name or financer ID"/>
    <Segmented options={["All", "Active", "Inactive"]} value={statusFilter} onChange={setStatusFilter} accent="purple"/>
    {loading ? <Card><Text>Loading…</Text></Card> : null}
    {filtered.map(item => <Card key={item.id}>
      <DataRow title={item.displayName ?? item.legalName} subtitle={`${item.id} · ${item.hasOverride ? "Financer-specific override" : "Using default/configured rate"}`} amount={`${Number(item.configuredRate).toFixed(2)}%`} status={item.configurationStatus}/>
      <DataRow title="Effective date" amount={item.effectiveDate}/>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button style={{ flex: 1 }} label="Edit" variant="secondary" disabled={busy} onPress={() => edit(item)}/>
        <Button style={{ flex: 1 }} label={item.configurationStatus === "Active" ? "Deactivate" : "Activate"} variant={item.configurationStatus === "Active" ? "danger" : "secondary"} disabled={busy} onPress={() => void toggle(item)}/>
      </View>
    </Card>)}
    {!loading && !filtered.length ? <Text style={{ textAlign: "center" }}>No service-charge configurations match the selected filters.</Text> : null}
  </View>;
}
