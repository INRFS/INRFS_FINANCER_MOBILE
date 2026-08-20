import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, AuthUser, tokenStore, TokenResponse } from "../services/apiClient";

type AuthValue = { user: AuthUser | null; loading: boolean; completeLogin: (tokens: TokenResponse) => Promise<void>; logout: () => Promise<void>; hasRole: (...roles: string[]) => boolean };
const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null); const [loading, setLoading] = useState(true);
  const logout = useCallback(async () => { try { if (tokenStore.access()) await api.post("/auth/revoke", {}, { retryAuth: false }); } catch {} finally { await tokenStore.clear(); setUser(null); } }, []);
  useEffect(() => { tokenStore.onExpired(() => setUser(null)); void (async () => { try { await tokenStore.restore(); if (tokenStore.access() || tokenStore.refresh()) setUser(await api.get("/auth/me")); } catch { await tokenStore.clear(); } finally { setLoading(false); } })(); }, []);
  const completeLogin = useCallback(async (tokens: TokenResponse) => { await tokenStore.save(tokens); setUser(tokens.user); }, []);
  const value = useMemo(() => ({ user, loading, completeLogin, logout, hasRole: (...roles: string[]) => roles.some((role) => user?.roles?.includes(role)) }), [user, loading, completeLogin, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error("useAuth must be used inside AuthProvider"); return value; }
