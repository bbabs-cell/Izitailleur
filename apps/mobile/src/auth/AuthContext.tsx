import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { LoginDto, RegisterDto } from "@izitailleur/shared";
import { authApi, type CurrentUser } from "../api/auth";
import { clearTokens, hasStoredSession, storeTokens } from "../api/client";

interface AuthContextValue {
  status: "loading" | "authenticated" | "unauthenticated";
  user: CurrentUser | null;
  login: (dto: LoginDto) => Promise<void>;
  register: (dto: RegisterDto) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");
  const [user, setUser] = useState<CurrentUser | null>(null);

  const loadSession = useCallback(async () => {
    const hasSession = await hasStoredSession();
    if (!hasSession) {
      setStatus("unauthenticated");
      return;
    }
    try {
      const me = await authApi.me();
      setUser(me);
      setStatus("authenticated");
    } catch {
      await clearTokens();
      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const login = useCallback(async (dto: LoginDto) => {
    const tokens = await authApi.login(dto);
    await storeTokens(tokens);
    const me = await authApi.me();
    setUser(me);
    setStatus("authenticated");
  }, []);

  const register = useCallback(async (dto: RegisterDto) => {
    const tokens = await authApi.register(dto);
    await storeTokens(tokens);
    const me = await authApi.me();
    setUser(me);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    await clearTokens();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo(
    () => ({ status, user, login, register, logout }),
    [status, user, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth doit être utilisé à l'intérieur de AuthProvider");
  }
  return ctx;
}
