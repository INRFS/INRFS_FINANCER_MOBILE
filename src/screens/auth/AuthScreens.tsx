import { useState } from "react";
import { Ionicons } from "../../components/AppIcon";
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Logo } from "../../components/Logo";
import { Button, Card, Field, Header, IconBubble, Screen } from "../../components/ui";
import { colors, fonts, radii, shadows } from "../../theme/tokens";
import type { RootStackParamList } from "../../types/navigation";
import { api } from "../../services/apiClient";
import { useAuth } from "../../auth/AuthContext";

type PortalProps = NativeStackScreenProps<RootStackParamList, "PortalSelection">;
export function PortalSelectionScreen({ navigation }: PortalProps) {
  return (
    <LinearGradient colors={["#F8FAFC", "#E0F7FE", "#EDE9FE"]} style={styles.flex}>
      <SafeAreaView style={styles.portalSafe}>
        <View style={[styles.petal, styles.petalTop]} />
        <View style={[styles.petal, styles.petalBottom]} />
        <Logo size={62} />
        <View style={styles.portalTitle}>
          <Text style={styles.title}>Welcome to INRFS Platform</Text>
          <Text style={styles.subtitle}>Choose your portal to continue</Text>
        </View>
        <View style={styles.portalCards}>
          <PortalCard icon="person-outline" accent="cyan" title="Financer Portal" subtitle="Manage customers, loans & collections" onPress={() => navigation.navigate("FinancerLogin")} />
          <PortalCard icon="grid-outline" accent="purple" title="Admin Portal" subtitle="Platform management & oversight" onPress={() => navigation.navigate("AdminLogin")} />
        </View>
        <View style={styles.legalLinks}><Text style={styles.link} onPress={() => navigation.navigate("LegalNotice", { type: "privacy" })}>Privacy Policy</Text><Text style={styles.link} onPress={() => navigation.navigate("LegalNotice", { type: "terms" })}>Terms of Use</Text></View>
        <Text style={styles.copyright}>INRFS © 2026 · Secure Fintech Platform</Text>
      </SafeAreaView>
    </LinearGradient>
  );
}

function PortalCard({ icon, accent, title, subtitle, onPress }: { icon: "person-outline" | "grid-outline"; accent: "cyan" | "purple"; title: string; subtitle: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.portalCard, pressed && { transform: [{ scale: 0.98 }], opacity: 0.88 }]}><IconBubble icon={icon} accent={accent} size={56} /><Text style={styles.portalCardTitle}>{title}</Text><Text style={styles.portalCardSub}>{subtitle}</Text></Pressable>;
}

type LoginProps = NativeStackScreenProps<RootStackParamList, "FinancerLogin">;
export function FinancerLoginScreen({ navigation }: LoginProps) {
  const { completeLogin } = useAuth();
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    const digits = mobile.replace(/\D/g, "");
    if (digits.length < 10) return setError("Enter a valid 10-digit mobile number");
    if (forgotPassword) {
      setSubmitting(true); setError("");
      try { await api.post("/auth/password/forgot", { email: mobile }, { auth: false }); setError("If this account exists, password reset instructions have been sent."); }
      catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to request a password reset."); }
      finally { setSubmitting(false); }
      return;
    }
    if (!password.trim()) return setError("Enter your password");
    setSubmitting(true); setError("");
    try { const tokens = await api.post("/auth/login/financer", { email: mobile, password, portal: "financer" }, { auth: false }); await completeLogin(tokens); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to sign in."); }
    finally { setSubmitting(false); }
  };
  return <AuthShell><Logo size={50} /><View style={styles.authHeading}><Text style={styles.authTitle}>{forgotPassword ? "Forgot password?" : "Welcome back"}</Text><Text style={styles.authSub}>{forgotPassword ? "Enter your registered mobile number to reset your password." : "Manage your customers and loans with ease."}</Text></View><Field label="Mobile Number" placeholder="+91 98765 43210" keyboardType="phone-pad" value={mobile} onChangeText={(v) => { setMobile(v); setError(""); }} />{!forgotPassword ? <><View><Field label="Password" placeholder="Enter your password" secureTextEntry={!passwordVisible} value={password} onChangeText={(v) => { setPassword(v); setError(""); }} /><Pressable onPress={() => setPasswordVisible(!passwordVisible)} style={styles.eye}><Ionicons name={passwordVisible ? "eye-off-outline" : "eye-outline"} size={20} color={colors.muted} /></Pressable></View><Pressable onPress={() => { setForgotPassword(true); setError(""); }}><Text style={styles.forgotLink}>Forgot password?</Text></Pressable></> : null}{error ? <Text style={styles.formError}>{error}</Text> : null}<Button loading={submitting} label={forgotPassword ? "Send reset instructions" : "Login"} onPress={submit} style={styles.fullButton} />{forgotPassword ? <Button label="Back to Login" icon="arrow-back" variant="ghost" onPress={() => { setForgotPassword(false); setError(""); }} /> : <><Text style={styles.authLinkText}>New to INRFS? <Text style={styles.link} onPress={() => navigation.navigate("FinancerRegister")}>Create account</Text></Text><Button label="Back to portal selection" icon="arrow-back" variant="ghost" onPress={() => navigation.navigate("PortalSelection")} /></>}</AuthShell>;
}

type RegisterProps = NativeStackScreenProps<RootStackParamList, "FinancerRegister">;
export function FinancerRegisterScreen({ navigation }: RegisterProps) {
  const [form, setForm] = useState({ name: "", business: "", mobile: "", email: "", city: "", state: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const update = (key: keyof typeof form, value: string) => setForm((old) => ({ ...old, [key]: value }));
  const submit = async () => {
    if (Object.values(form).some((v) => !v.trim())) return setError("Complete all fields to continue");
    if (!form.email.includes("@") || form.mobile.replace(/\D/g, "").length < 10) return setError("Enter a valid mobile number and email address");
    setSubmitting(true); setError("");
    try {
      const challenge = await api.post("/auth/register/financer", { fullName: form.name, businessName: form.business, mobile: form.mobile, email: form.email, city: form.city, state: form.state }, { auth: false });
      navigation.navigate("FinancerOtp", { mobile: form.mobile, challengeId: challenge.challengeId, registering: true });
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to create the account."); }
    finally { setSubmitting(false); }
  };
  return <AuthShell scroll><Logo size={46} /><View style={styles.authHeading}><Text style={styles.authTitle}>Create your INRFS account</Text><Text style={styles.authSub}>Join thousands of financers managing loans digitally</Text></View><Field label="Full Name" placeholder="Suresh Patel" value={form.name} onChangeText={(v) => update("name", v)} /><Field label="Business / Finance Name" placeholder="Patel Finance Services" value={form.business} onChangeText={(v) => update("business", v)} /><Field label="Mobile Number" placeholder="+91 98765 43210" keyboardType="phone-pad" value={form.mobile} onChangeText={(v) => update("mobile", v)} /><Field label="Email Address" placeholder="suresh@patelfinance.in" keyboardType="email-address" autoCapitalize="none" value={form.email} onChangeText={(v) => update("email", v)} /><Field label="City" placeholder="Ahmedabad" value={form.city} onChangeText={(v) => update("city", v)} /><Field label="State" placeholder="Gujarat" value={form.state} onChangeText={(v) => update("state", v)} />{error ? <Text style={styles.formError}>{error}</Text> : null}<Button loading={submitting} label="Send OTP to Verify" onPress={submit} /><Text style={styles.authLinkText}>Already have an account? <Text style={styles.link} onPress={() => navigation.navigate("FinancerLogin")}>Login</Text></Text></AuthShell>;
}

type OtpProps = NativeStackScreenProps<RootStackParamList, "FinancerOtp">;
export function FinancerOtpScreen({ navigation, route }: OtpProps) {
  const { completeLogin } = useAuth();
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [challengeId, setChallengeId] = useState(route.params.challengeId);
  const verify = async () => {
    if (otp.length !== 6) return setError("Please enter the complete 6-digit OTP.");
    setSubmitting(true); setError("");
    try {
      if (route.params.registering) {
        await api.post("/auth/otp/verify-registration", { challengeId, code: otp }, { auth: false });
        Alert.alert("Account created", "Your account was verified. Sign in with the temporary password sent to you.");
        navigation.replace("FinancerLogin");
      } else {
        const tokens = await api.post("/auth/otp/verify", { challengeId, code: otp }, { auth: false });
        await completeLogin(tokens);
      }
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "OTP verification failed."); }
    finally { setSubmitting(false); }
  };
  const resend = async () => { setOtp(""); setError(""); setSubmitting(true); try { const challenge = await api.post("/auth/otp/request", { destination: route.params.mobile, purpose: route.params.registering ? "Registration" : "Login" }, { auth: false }); setChallengeId(challenge.challengeId); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to resend the OTP."); } finally { setSubmitting(false); } };
  return <AuthShell><Logo size={44} /><IconBubble icon="call-outline" accent="cyan" size={64} /><View style={styles.authHeading}><Text style={styles.authTitle}>Verify your {route.params.admin ? "email" : "mobile number"}</Text><Text style={styles.authSub}>Enter the 6-digit OTP sent to your registered contact.</Text><Text style={styles.mobileText}>{route.params.mobile}</Text></View><Field label="6-digit OTP" placeholder="• • • • • •" keyboardType="number-pad" maxLength={6} value={otp} onChangeText={(v) => { setOtp(v.replace(/\D/g, "")); setError(""); }} error={error} /><Button loading={submitting} label="Verify OTP" onPress={verify} /><View style={styles.twoButtons}><Button disabled={submitting} label="Resend OTP" variant="secondary" style={styles.flex} onPress={() => void resend()} /><Button disabled={submitting} label="Change Number" variant="secondary" style={styles.flex} onPress={() => navigation.replace(route.params.registering ? "FinancerRegister" : route.params.admin ? "AdminLogin" : "FinancerLogin")} /></View></AuthShell>;
}

type WelcomeProps = NativeStackScreenProps<RootStackParamList, "FinancerWelcome">;
export function FinancerWelcomeScreen({ navigation }: WelcomeProps) {
  return <LinearGradient colors={[colors.cyan, colors.purple]} style={styles.welcome}><View style={styles.logoDisc}><Logo size={54} showText={false} /></View><Text style={styles.welcomeTitle}>Welcome to INRFS! 🎉</Text><Text style={styles.welcomeSub}>Your account is ready. Start managing your loans.</Text><Button label="Continue to Dashboard" icon="arrow-forward" variant="secondary" onPress={() => navigation.replace("FinancerApp")} style={styles.welcomeButton} /></LinearGradient>;
}

type AdminProps = NativeStackScreenProps<RootStackParamList, "AdminLogin">;
export function AdminLoginScreen({ navigation }: AdminProps) {
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [visible, setVisible] = useState(false); const [remember, setRemember] = useState(true); const [error, setError] = useState("");
  const submit = async () => {
    if (!email.includes("@") || password.length < 4) return setError("Enter a valid email address and password");
    setSubmitting(true); setError("");
    try { const challenge = await api.post("/auth/login", { email, password, portal: "admin" }, { auth: false }); navigation.navigate("FinancerOtp", { mobile: email, challengeId: challenge.challengeId, admin: true }); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to sign in."); }
    finally { setSubmitting(false); }
  };
  const forgot = async () => { if (!email.includes("@")) return setError("Enter your registered email address first."); setSubmitting(true); setError(""); try { await api.post("/auth/password/forgot", { email }, { auth: false }); setError("If this account exists, password reset instructions have been sent."); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to request a password reset."); } finally { setSubmitting(false); } };
  return <AuthShell><Logo size={50} /><View style={styles.adminBadge}><Ionicons name="shield-checkmark-outline" size={20} color={colors.purple} /><Text style={styles.adminBadgeText}>ADMIN PORTAL</Text></View><View style={styles.authHeading}><Text style={styles.authTitle}>INRFS Administration</Text><Text style={styles.authSub}>Secure access for platform administrators</Text></View><Field label="Email Address" placeholder="admin@inrfs.in" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={(v) => { setEmail(v); setError(""); }} /><View><Field label="Password" placeholder="Enter password" secureTextEntry={!visible} value={password} onChangeText={(v) => { setPassword(v); setError(""); }} /><Pressable onPress={() => setVisible(!visible)} style={styles.eye}><Ionicons name={visible ? "eye-off-outline" : "eye-outline"} size={20} color={colors.muted} /></Pressable></View>{error ? <Text style={styles.formError}>{error}</Text> : null}<View style={styles.rememberRow}><Pressable onPress={() => setRemember(!remember)} style={styles.checkRow}><Ionicons name={remember ? "checkbox" : "square-outline"} color={colors.purple} size={21} /><Text style={styles.rememberText}>Remember Me</Text></Pressable><Text style={[styles.link, { color: colors.purple }]} onPress={() => void forgot()}>Forgot Password?</Text></View><Button loading={submitting} label="Login" accent="purple" onPress={submit} /><Button label="Back to portal selection" icon="arrow-back" variant="ghost" onPress={() => navigation.navigate("PortalSelection")} /></AuthShell>;
}

type ResetProps = NativeStackScreenProps<RootStackParamList, "ResetPassword">;
export function ResetPasswordScreen({ navigation, route }: ResetProps) {
  const [token, setToken] = useState(route.params?.token ?? ""); const [password, setPassword] = useState(""); const [confirmPassword, setConfirmPassword] = useState(""); const [error, setError] = useState(""); const [submitting, setSubmitting] = useState(false);
  const submit = async () => { if (password !== confirmPassword) return setError("Passwords do not match."); if (password.length < 10) return setError("Use at least 10 characters."); if (!token.trim()) return setError("Reset token is required."); setSubmitting(true); setError(""); try { await api.post("/auth/password/reset", { token: token.trim(), newPassword: password, confirmPassword }, { auth: false }); Alert.alert("Password reset", "Sign in with your new password."); navigation.replace("FinancerLogin"); } catch (e) { setError(e instanceof Error ? e.message : "Password reset failed."); } finally { setSubmitting(false); } };
  return <AuthShell><Logo size={48}/><View style={styles.authHeading}><Text style={styles.authTitle}>Create a new password</Text><Text style={styles.authSub}>Use the reset token from your password-reset message.</Text></View><Field label="Reset token" value={token} onChangeText={setToken}/><Field label="New password" value={password} onChangeText={setPassword} secureTextEntry/><Field label="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry/>{error ? <Text style={styles.formError}>{error}</Text> : null}<Button loading={submitting} label="Reset password" onPress={() => void submit()}/><Button label="Back to sign in" variant="ghost" onPress={() => navigation.replace("FinancerLogin")}/></AuthShell>;
}

type LegalProps = NativeStackScreenProps<RootStackParamList, "LegalNotice">;
export function LegalNoticeScreen({ navigation, route }: LegalProps) {
  const privacy = route.params.type === "privacy"; return <Screen><Button label="Back to INRFS" icon="arrow-back" variant="ghost" onPress={() => navigation.goBack()}/><Logo size={42}/><Header title={privacy ? "Privacy Policy" : "Terms of Use"} subtitle="Legal information"/><Card><Text style={styles.legalStatus}>Draft placeholder — replace with content reviewed and approved by your legal adviser before public launch.</Text><Text style={styles.legalHeading}>{privacy ? "How information is handled" : "Using the platform"}</Text><Text style={styles.legalBody}>{privacy ? "INRFS processes account and operational information required to provide its financer workflows. The final policy should identify the data controller, retention periods, subprocessors, user rights, and applicable contact details." : "Access to INRFS is intended for authorized users operating within their assigned role. The final terms should define account responsibilities, acceptable use, service availability, fees, limitations, and dispute handling."}</Text><Text style={styles.legalHeading}>Questions</Text><Text style={styles.legalBody}>Contact support@inrfs.in for platform-related enquiries.</Text></Card></Screen>;
}

function AuthShell({ children, scroll = false }: { children: React.ReactNode; scroll?: boolean }) {
  return <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>{scroll ? <Screen contentStyle={styles.authScroll}><Card style={styles.authCard}>{children}</Card></Screen> : <SafeAreaView style={styles.authSafe}><Card style={styles.authCard}>{children}</Card></SafeAreaView>}</KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, portalSafe: { flex: 1, alignItems: "center", justifyContent: "center", padding: 22, overflow: "hidden" }, legalLinks: { flexDirection: "row", gap: 20, marginTop: 20 }, legalStatus: { color: colors.orange, fontFamily: fonts.medium, fontSize: 13, lineHeight: 20, marginBottom: 18 }, legalHeading: { color: colors.dark, fontFamily: fonts.bold, fontSize: 17, marginTop: 14, marginBottom: 6 }, legalBody: { color: colors.muted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 22 },
  petal: { position: "absolute", width: 270, height: 150, borderRadius: 100, backgroundColor: colors.purple, opacity: 0.035 },
  petalTop: { right: -100, top: 80, transform: [{ rotate: "45deg" }] }, petalBottom: { left: -100, bottom: 40, transform: [{ rotate: "-30deg" }] },
  portalTitle: { alignItems: "center", marginTop: 36, marginBottom: 34 }, title: { color: colors.dark, fontFamily: fonts.extrabold, fontSize: 25, textAlign: "center" }, subtitle: { color: colors.muted, fontFamily: fonts.regular, fontSize: 14, marginTop: 8 },
  portalCards: { width: "100%", maxWidth: 430, flexDirection: "row", gap: 12 }, portalCard: { flex: 1, minHeight: 190, padding: 16, alignItems: "center", justifyContent: "center", backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border, borderRadius: radii.xl, ...shadows.card }, portalCardTitle: { color: colors.dark, fontFamily: fonts.bold, fontSize: 14, marginTop: 17, textAlign: "center" }, portalCardSub: { color: colors.muted, fontFamily: fonts.regular, fontSize: 10, lineHeight: 15, textAlign: "center", marginTop: 7 }, copyright: { color: colors.subtle, fontFamily: fonts.regular, fontSize: 10, marginTop: 30 },
  authSafe: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: colors.background }, authScroll: { flexGrow: 1, justifyContent: "center", paddingVertical: 26 }, authCard: { width: "100%", maxWidth: 480, alignSelf: "center", padding: 25, gap: 17, borderRadius: radii.xxl }, authHeading: { alignItems: "center", gap: 5 }, authTitle: { color: colors.dark, fontFamily: fonts.bold, fontSize: 21, textAlign: "center" }, authSub: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, textAlign: "center" }, authLinkText: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13, textAlign: "center" }, link: { color: colors.cyan, fontFamily: fonts.semibold, fontSize: 13 }, forgotLink: { color: colors.cyan, fontFamily: fonts.semibold, fontSize: 12, textAlign: "right", marginTop: -8 }, fullButton: { width: "100%" }, formError: { color: colors.error, fontFamily: fonts.regular, fontSize: 12, textAlign: "center" }, mobileText: { color: colors.cyan, fontFamily: fonts.semibold, fontSize: 13, marginTop: 3 }, twoButtons: { flexDirection: "row", gap: 10 }, demo: { color: colors.subtle, fontFamily: fonts.regular, fontSize: 10, textAlign: "center" }, adminBadge: { alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.purpleSoft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radii.pill }, adminBadgeText: { color: colors.purple, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1 }, eye: { position: "absolute", right: 12, bottom: 13 }, rememberRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, checkRow: { flexDirection: "row", alignItems: "center", gap: 6 }, rememberText: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12 }, welcome: { flex: 1, alignItems: "center", justifyContent: "center", padding: 25 }, logoDisc: { backgroundColor: colors.white, padding: 14, borderRadius: 50, marginBottom: 24 }, welcomeTitle: { color: colors.white, fontFamily: fonts.extrabold, fontSize: 28, textAlign: "center" }, welcomeSub: { color: "rgba(255,255,255,0.88)", fontFamily: fonts.regular, fontSize: 15, textAlign: "center", lineHeight: 22, marginTop: 10, marginBottom: 34 }, welcomeButton: { paddingHorizontal: 26 },
});
