import {
  collapseQueue,
  decidePushResultAction,
  shouldSkipPullOverwrite,
  buildRequeueAfterKeepMine,
} from "../offline/syncLogic";

describe("shouldSkipPullOverwrite", () => {
  it("saute l'écrasement si une mutation locale est encore en attente pour cet id", () => {
    expect(shouldSkipPullOverwrite(new Set(["a"]), "a")).toBe(true);
  });

  it("n'écrase pas la règle si aucune mutation en attente", () => {
    expect(shouldSkipPullOverwrite(new Set(["a"]), "b")).toBe(false);
  });
});

describe("decidePushResultAction", () => {
  it("efface l'état local sur succès et applique la version serveur", () => {
    const action = decidePushResultAction({ entity: "customer", id: "1", status: "applied", serverRecord: { id: "1" } });
    expect(action.kind).toBe("clear-local");
  });

  it("marque un conflit réel sans écraser silencieusement", () => {
    const action = decidePushResultAction({
      entity: "customer",
      id: "1",
      status: "conflict",
      serverRecord: { id: "1", notes: "serveur" },
    });
    expect(action.kind).toBe("mark-conflict");
    if (action.kind === "mark-conflict") {
      expect(action.serverRecord).toEqual({ id: "1", notes: "serveur" });
    }
  });

  it("signale un enregistrement manquant (supprimé côté serveur)", () => {
    expect(decidePushResultAction({ entity: "customer", id: "1", status: "not_found" }).kind).toBe(
      "mark-missing",
    );
  });

  it("remonte le message d'erreur de validation", () => {
    const action = decidePushResultAction({
      entity: "customer",
      id: "1",
      status: "error",
      message: "Nom invalide",
    });
    expect(action).toEqual({ kind: "surface-error", message: "Nom invalide" });
  });
});

describe("buildRequeueAfterKeepMine", () => {
  it("repousse la mutation avec la nouvelle base pour éviter un second conflit", () => {
    expect(buildRequeueAfterKeepMine("2026-01-01T00:00:00.000Z")).toEqual({
      baseUpdatedAt: "2026-01-01T00:00:00.000Z",
    });
  });
});

describe("collapseQueue", () => {
  it("ne garde qu'une seule mutation par entité+id, la plus récente", () => {
    const result = collapseQueue([
      { entity: "customer", id: "1", op: "update" },
      { entity: "customer", id: "1", op: "delete" },
      { entity: "customer", id: "2", op: "create" },
    ]);
    expect(result).toHaveLength(2);
    expect(result.find((m) => m.id === "1")?.op).toBe("delete");
  });

  it("gère une file vide", () => {
    expect(collapseQueue([])).toEqual([]);
  });
});
