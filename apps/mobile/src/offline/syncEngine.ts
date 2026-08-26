import NetInfo from "@react-native-community/netinfo";
import type { SyncMutationResult } from "@izitailleur/shared";
import { apiClient } from "../api/client";
import { getLastSyncAt, setLastSyncAt } from "./db";
import { listQueue, removeFromQueue, pendingIdsForEntity } from "./mutationQueue";
import { customersRepo } from "./customersRepo";
import { appointmentsRepo } from "./appointmentsRepo";
import { decidePushResultAction, shouldSkipPullOverwrite } from "./syncLogic";

export type SyncStatus = "idle" | "syncing" | "offline" | "error";

export interface SyncSummary {
  pushed: number;
  conflicts: number;
  pulled: number;
}

export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return Boolean(state.isConnected && state.isInternetReachable !== false);
}

export async function syncNow(): Promise<SyncSummary> {
  const online = await isOnline();
  if (!online) {
    throw new Error("offline");
  }

  const summary: SyncSummary = { pushed: 0, conflicts: 0, pulled: 0 };

  const queue = await listQueue();
  if (queue.length > 0) {
    const mutations = queue.map((row) => ({
      op: row.op,
      entity: row.entity,
      id: row.recordId,
      ...(row.op !== "create" ? { baseUpdatedAt: row.baseUpdatedAt } : {}),
      ...(row.op !== "delete" ? { data: row.data ? JSON.parse(row.data) : {} } : {}),
    }));

    const results = await apiClient.post<SyncMutationResult[]>("/sync/push", { mutations });

    for (const result of results) {
      const action = decidePushResultAction(result);
      const repo = result.entity === "customer" ? customersRepo : appointmentsRepo;

      if (action.kind === "clear-local") {
        const record = action.serverRecord as { updatedAt: string };
        await repo.applyServerRecord(record as never);
        await removeFromQueue(result.entity, result.id);
        summary.pushed += 1;
      } else if (action.kind === "mark-conflict") {
        await repo.markConflict(result.id, action.serverRecord);
        await removeFromQueue(result.entity, result.id);
        summary.conflicts += 1;
      } else if (action.kind === "mark-missing" || action.kind === "surface-error") {
        // Retiré de la file : une nouvelle tentative aveugle échouerait de la même façon.
        // L'utilisateur peut recréer/ajuster l'enregistrement si besoin (limite connue).
        await removeFromQueue(result.entity, result.id);
      }
    }
  }

  const since = await getLastSyncAt();
  const pulled = await apiClient.get<{
    serverTime: string;
    customers: Array<{ id: string; updatedAt: string; [key: string]: unknown }>;
    appointments: Array<{ id: string; updatedAt: string; [key: string]: unknown }>;
  }>(`/sync/pull?since=${encodeURIComponent(since)}`);

  const pendingCustomerIds = await pendingIdsForEntity("customer");
  for (const record of pulled.customers) {
    if (shouldSkipPullOverwrite(pendingCustomerIds, record.id)) continue;
    await customersRepo.applyServerRecord(record as never);
    summary.pulled += 1;
  }

  const pendingAppointmentIds = await pendingIdsForEntity("appointment");
  for (const record of pulled.appointments) {
    if (shouldSkipPullOverwrite(pendingAppointmentIds, record.id)) continue;
    await appointmentsRepo.applyServerRecord(record as never);
    summary.pulled += 1;
  }

  await setLastSyncAt(pulled.serverTime);
  return summary;
}
