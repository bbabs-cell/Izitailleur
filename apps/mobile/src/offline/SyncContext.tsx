import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { syncNow, type SyncStatus, type SyncSummary } from "./syncEngine";
import { queueLength } from "./mutationQueue";
import { notificationsApi } from "../api/notifications";

interface SyncContextValue {
  status: SyncStatus;
  pendingCount: number;
  unreadNotifications: number;
  lastSummary: SyncSummary | null;
  lastError: string | null;
  syncNow: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | undefined>(undefined);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [lastSummary, setLastSummary] = useState<SyncSummary | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const runningRef = useRef(false);

  const refreshPendingCount = useCallback(async () => {
    setPendingCount(await queueLength());
  }, []);

  const refreshNotifications = useCallback(async () => {
    try {
      const notifications = await notificationsApi.scan();
      setUnreadNotifications(notifications.filter((n) => !n.read).length);
    } catch {
      // Hors connexion : le compteur reste tel quel, aucune alerte bloquante.
    }
  }, []);

  const triggerSync = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setStatus("syncing");
    setLastError(null);
    try {
      const summary = await syncNow();
      setLastSummary(summary);
      setStatus("idle");
      await refreshNotifications();
    } catch (e) {
      if (e instanceof Error && e.message === "offline") {
        setStatus("offline");
      } else {
        setStatus("error");
        setLastError(e instanceof Error ? e.message : "Synchronisation impossible");
      }
    } finally {
      runningRef.current = false;
      await refreshPendingCount();
    }
  }, [refreshPendingCount, refreshNotifications]);

  useEffect(() => {
    refreshPendingCount();
    triggerSync();

    const netUnsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        triggerSync();
      } else {
        setStatus("offline");
      }
    });

    const appStateSubscription = AppState.addEventListener("change", (next) => {
      if (next === "active") {
        triggerSync();
      }
    });

    return () => {
      netUnsubscribe();
      appStateSubscription.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: SyncContextValue = {
    status,
    pendingCount,
    unreadNotifications,
    lastSummary,
    lastError,
    syncNow: triggerSync,
  };
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) {
    throw new Error("useSync doit être utilisé à l'intérieur de SyncProvider");
  }
  return ctx;
}
