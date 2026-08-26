import { canManageTeam } from "../domain/roles";

describe("canManageTeam", () => {
  it("autorise le propriétaire et l'administrateur", () => {
    expect(canManageTeam("OWNER")).toBe(true);
    expect(canManageTeam("ADMIN")).toBe(true);
  });

  it("refuse un apprenti", () => {
    expect(canManageTeam("APPRENTICE")).toBe(false);
  });

  it("refuse un responsable (ne gère pas l'équipe elle-même)", () => {
    expect(canManageTeam("MANAGER")).toBe(false);
  });
});
