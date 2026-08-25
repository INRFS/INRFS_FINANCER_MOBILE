import React, { useCallback, useEffect, useState } from "react";
import { Alert, Image, StyleSheet, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Button, Card, Field, Header, Segmented, ToggleRow, Screen } from "../../components/ui";
import { useAuth } from "../../auth/AuthContext";
import { platformApi } from "../../services/platformApi";
import { Ionicons } from "../../components/AppIcon";
import { colors, fonts, radii, spacing } from "../../theme/tokens";

const msg = (e: unknown) => e instanceof Error ? e.message : "Please try again.";

const defaultNotifications = {
  duePayment: true,
  overdue: true,
  paymentReceived: true,
  smsStatus: true,
  weeklySummary: true,
};

export function FinancerSettingsScreen() {
  const { updateUser } = useAuth();
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("Profile");
  const [form, setForm] = useState({
    name: "",
    businessName: "",
    mobile: "",
    email: "",
    city: "",
    state: "",
    profileImage: "",
    plan: "",
    avatarLetter: "U"
  });

  const [notifications, setNotifications] = useState({
    duePayment: true,
    overdue: true,
    paymentReceived: true,
    smsStatus: true,
    weeklySummary: true,
  });

  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = await platformApi.profile.get();
      setData(p);
      const fullName = p.user?.fullName ?? [p.user?.firstName, p.user?.lastName].filter(Boolean).join(" ");
      setForm({
        name: fullName ?? "",
        businessName: p.financer?.displayName ?? "",
        mobile: p.user?.phone ?? "",
        email: p.user?.email ?? "",
        city: p.financer?.city ?? "",
        state: p.financer?.state ?? "",
        profileImage: p.profileImage ?? "",
        plan: p.plan ?? "No active plan",
        avatarLetter: (fullName || "U").charAt(0).toUpperCase()
      });
      setNotifications({
        ...defaultNotifications,
        ...(p.notifications ?? {}),
      });
    } catch (e) {
      Alert.alert("Profile unavailable", msg(e));
    } finally {
      setLoading(false);
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
    if ((asset.size ?? 0) > 2 * 1024 * 1024) {
      return Alert.alert(
        "Image too large",
        "Profile photo must be 2 MB or smaller.",
      );
    }
    const base64 = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    setForm({
      ...form,
      profileImage: `data:${asset.mimeType ?? "image/jpeg"};base64,${base64}`,
    });
  };

  const save = async () => {
    if (!form.name.trim() || !form.businessName.trim() || !form.city.trim() || !form.state.trim()) {
      return Alert.alert("Required fields", "Name, business name, city, and state are required.");
    }
    const mobile = form.mobile.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
    if (!/^[6-9]\d{9}$/.test(mobile)) return Alert.alert("Invalid mobile", "Enter a valid 10-digit Indian mobile number.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return Alert.alert("Invalid email", "Enter a valid email address.");
    setBusy(true);
    try {
      const saved = await platformApi.profile.update({
        fullName: form.name.trim(),
        businessName: form.businessName.trim(),
        mobile,
        email: form.email.trim().toLowerCase(),
        city: form.city.trim(),
        state: form.state.trim(),
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
      Alert.alert("Saved", "Settings saved successfully.");
    } catch (e) {
      Alert.alert("Settings not saved", msg(e));
    } finally {
      setBusy(false);
    }
  };

  const handleNotificationChange = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };
  return (
    <Screen>
      <Header 
        title="Settings" 
        subtitle="Manage your account and preferences" 
      />
      
      <View style={{ marginBottom: spacing.xl }}>
        <Segmented 
          options={["Profile"]}
          value={activeTab} 
          onChange={setActiveTab} 
        />
      </View>

      {!data && loading ? (
        <Card style={{ padding: 40, alignItems: 'center' }}>
          <Text style={{ color: colors.muted, fontFamily: fonts.medium }}>Loading profile...</Text>
        </Card>
      ) : null}

      {/* PROFILE TAB */}
      {activeTab === "Profile" && data && (
        <View style={s.gap}>
          <Card>
            <View style={s.profileTop}>
              <View style={s.avatarContainer}>
                {form.profileImage ? (
                  <Image source={{ uri: form.profileImage }} style={s.avatarImage} />
                ) : (
                  <View style={s.avatarPlaceholder}>
                    <Text style={s.avatarText}>{form.avatarLetter}</Text>
                  </View>
                )}
              </View>
              
              <View style={s.profileIdentity}>
                <Text style={s.nameText}>{form.name}</Text>
                <Text style={s.planBadge}>{form.plan}</Text>
              </View>
            </View>

            <View style={s.photoActions}>
              <Button
                label={form.profileImage ? "Change photo" : "Add photo"}
                variant="secondary"
                icon="cloud-upload-outline"
                style={{ flex: 1 }}
                onPress={() => void pickPhoto()}
              />
              {form.profileImage ? (
                <Button
                  label="Remove"
                  variant="danger"
                  icon="close"
                  style={{ flex: 1 }}
                  onPress={() => setForm({ ...form, profileImage: "" })}
                />
              ) : null}
            </View>
          </Card>

          <Card>
            <Text style={s.sectionTitle}>PERSONAL INFORMATION</Text>
            
            <View style={s.formGrid}>
              <Field
                label="Full Name"
                value={form.name}
                onChangeText={(v) => setForm({ ...form, name: v })}
              />
              <Field
                label="Business Name"
                value={form.businessName}
                onChangeText={(v) => setForm({ ...form, businessName: v })}
              />
              <Field
                label="Mobile"
                value={form.mobile}
                onChangeText={(v) => setForm({ ...form, mobile: v })}
                keyboardType="phone-pad"
              />
              <Field
                label="Email"
                value={form.email}
                onChangeText={(v) => setForm({ ...form, email: v })}
                keyboardType="email-address"
                autoCapitalize="none"
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
            </View>

            <View style={{ marginTop: 24 }}>
              <Button
                loading={busy}
                label="Save Changes"
                onPress={() => void save()}
              />
            </View>
          </Card>
        </View>
      )}

      {/* NOTIFICATIONS TAB */}
      {activeTab === "Notifications" && (
        <View style={s.gap}>
          <Card>
            <Text style={s.sectionTitle}>PREFERENCES</Text>
            <View style={s.toggleList}>
              <ToggleRow 
                label="Due payment reminders" 
                value={notifications.duePayment} 
                onValueChange={() => handleNotificationChange('duePayment')} 
              />
              <ToggleRow 
                label="Overdue alerts" 
                value={notifications.overdue} 
                onValueChange={() => handleNotificationChange('overdue')} 
              />
              <ToggleRow 
                label="Payment received" 
                value={notifications.paymentReceived} 
                onValueChange={() => handleNotificationChange('paymentReceived')} 
              />
              <ToggleRow 
                label="SMS delivery status" 
                value={notifications.smsStatus} 
                onValueChange={() => handleNotificationChange('smsStatus')} 
              />
              <ToggleRow 
                label="Weekly summary" 
                value={notifications.weeklySummary} 
                onValueChange={() => handleNotificationChange('weeklySummary')} 
              />
            </View>
          </Card>
          
          <Button
            loading={busy}
            label="Save notification preferences"
            onPress={() => void save()}
          />
        </View>
      )}
      {/* SMS SETTINGS TAB */}
      {activeTab === "SMS Settings" && (
        <View style={s.gap}>
          <Card style={s.creditBox}>
            <Text style={s.creditLabel}>SMS Credits Remaining</Text>
            <Text style={s.creditNumber}>760 credits</Text>
            <Text style={s.creditPlan}>Premium Plan · 2,000/month</Text>
          </Card>
          
          <Card>
            <Field 
              label="Sender ID" 
              value="INRFS" 
              editable={false} 
              style={{ marginBottom: 16 }} 
            />
            <Field 
              label="Default SMS Template" 
              value="Dear {name}, your interest payment of ₹{amount} is due on {date}. - INRFS" 
              editable={true} 
              multiline 
            />
          </Card>
        </View>
      )}

      {/* SECURITY TAB */}
      {activeTab === "Security" && (
        <Card>
          <Text style={s.sectionTitle}>SECURITY</Text>
          <Text style={s.securityDesc}>
            Your account uses Mobile OTP authentication. No password is required.
          </Text>
          
          <View style={s.securityStatusBox}>
            <Ionicons name="shield-checkmark" size={24} color="#08743b" />
            <Text style={s.securityStatusText}>OTP-secured account</Text>
          </View>
        </Card>
      )}

    </Screen>
  );
}

const s = StyleSheet.create({
  gap: {
    gap: spacing.xl,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.muted,
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  avatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    backgroundColor: '#0aaee8',
    elevation: 2,
    shadowColor: '#173B62',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.bold,
    fontSize: 28,
    color: colors.white,
  },
  profileIdentity: {
    flex: 1,
  },
  nameText: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.dark,
    marginBottom: 4,
  },
  planBadge: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.muted,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 12,
  },
  formGrid: {
    gap: 16,
  },
  toggleList: {
    marginTop: 8,
  },
  creditBox: {
    backgroundColor: '#dff6fc',
    borderColor: '#bcebf7',
    alignItems: 'flex-start',
    padding: 24,
  },
  creditLabel: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: '#0788c2',
    marginBottom: 4,
  },
  creditNumber: {
    fontFamily: fonts.extrabold,
    fontSize: 32,
    color: '#0874b7',
    marginBottom: 6,
  },
  creditPlan: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: '#0874b7',
  },
  securityDesc: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.muted,
    lineHeight: 22,
    marginBottom: 24,
  },
  securityStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#d9fbe5',
    padding: 16,
    borderRadius: radii.md,
  },
  securityStatusText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: '#08743b',
  }
});
