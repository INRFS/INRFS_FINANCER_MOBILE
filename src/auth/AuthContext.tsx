import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, AuthUser, tokenStore, TokenResponse } from "../services/apiClient";

type AuthValue = { user: AuthUser | null; loading: boolean; showWelcome: boolean; completeLogin: (tokens: TokenResponse) => Promise<void>; dismissWelcome: () => void; updateUser: (fields: Partial<AuthUser>) => void; logout: () => Promise<void>; hasRole: (...roles: string[]) => boolean };
const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null); const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const logout = useCallback(async () => { try { if (tokenStore.access()) await api.post("/auth/revoke", {}, { retryAuth: false }); } catch {} finally { await tokenStore.clear(); setUser(null); } }, []);
  useEffect(() => { tokenStore.onExpired(() => setUser(null)); void (async () => { try { await tokenStore.restore(); if (tokenStore.access() || tokenStore.refresh()) setUser(await api.get("/auth/me")); } catch { await tokenStore.clear(); } finally { setLoading(false); } })(); }, []);
  const completeLogin = useCallback(async (tokens: TokenResponse) => {
    if (!tokens || typeof tokens.accessToken !== "string" || !tokens.accessToken.trim() ||
        typeof tokens.refreshToken !== "string" || !tokens.refreshToken.trim()) {
      throw new Error("The server returned an invalid login response. Please try again.");
    }

    await tokenStore.save(tokens);
    try {
      const verifiedUser = await api.get("/auth/me", { retryAuth: false });
      const verifiedId = verifiedUser?.userId ?? verifiedUser?.id;
      if (!verifiedId || !Array.isArray(verifiedUser.roles)) {
        throw new Error("The authenticated account could not be verified.");
      }
      const authenticatedUser: AuthUser = {
        ...tokens.user,
        id: String(verifiedId),
        financerId: verifiedUser.financerId ?? tokens.user?.financerId ?? null,
        roles: verifiedUser.roles,
      };
      setShowWelcome(true);
      setUser(authenticatedUser);
    } catch (error) {
      await tokenStore.clear();
      setUser(null);
      throw error;
    }
  }, []);
  const dismissWelcome = useCallback(() => setShowWelcome(false), []);
  const updateUser = useCallback((fields: Partial<AuthUser>) => setUser(current => current ? { ...current, ...fields } : current), []);
  const value = useMemo(() => ({ user, loading, showWelcome, completeLogin, dismissWelcome, updateUser, logout, hasRole: (...roles: string[]) => roles.some((role) => user?.roles?.includes(role)) }), [user, loading, showWelcome, completeLogin, dismissWelcome, updateUser, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error("useAuth must be used inside AuthProvider"); return value; }
