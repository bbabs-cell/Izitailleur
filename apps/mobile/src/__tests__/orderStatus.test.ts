import { isOrderDueSoon, isOrderLate } from "../domain/orderStatus";

describe("isOrderLate", () => {
  it("est en retard si la date limite est passée et la commande active", () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    expect(isOrderLate(yesterday, "SEWING")).toBe(true);
  });

  it("n'est jamais en retard si déjà livrée", () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    expect(isOrderLate(yesterday, "DELIVERED")).toBe(false);
  });

  it("n'est jamais en retard si annulée", () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    expect(isOrderLate(yesterday, "CANCELLED")).toBe(false);
  });

  it("n'est pas en retard si la date limite est dans le futur", () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString();
    expect(isOrderLate(tomorrow, "SEWING")).toBe(false);
  });
});

describe("isOrderDueSoon", () => {
  it("est proche de l'échéance dans la fenêtre par défaut", () => {
    const inOneDay = new Date(Date.now() + 86400000).toISOString();
    expect(isOrderDueSoon(inOneDay, "SEWING")).toBe(true);
  });

  it("n'est pas proche de l'échéance si trop lointaine", () => {
    const inTenDays = new Date(Date.now() + 10 * 86400000).toISOString();
    expect(isOrderDueSoon(inTenDays, "SEWING")).toBe(false);
  });

  it("une commande déjà en retard n'est pas comptée 'due soon'", () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    expect(isOrderDueSoon(yesterday, "SEWING")).toBe(false);
  });
});
