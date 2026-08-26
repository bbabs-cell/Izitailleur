import { formatFcfa } from "../domain/payments";

describe("formatFcfa", () => {
  it("formate un montant avec le suffixe FCFA", () => {
    expect(formatFcfa(25000)).toContain("FCFA");
    expect(formatFcfa(25000).replace(/\s/g, " ")).toBe("25 000 FCFA");
  });

  it("formate zéro correctement", () => {
    expect(formatFcfa(0)).toBe("0 FCFA");
  });
});
