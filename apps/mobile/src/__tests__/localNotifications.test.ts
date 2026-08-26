import { computeReminderTriggerDate } from "../notifications/localNotifications";

describe("computeReminderTriggerDate", () => {
  it("calcule une date de rappel 2h avant le rendez-vous par défaut", () => {
    const startAt = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString();
    const trigger = computeReminderTriggerDate(startAt);
    expect(trigger).not.toBeNull();
    expect(trigger!.getTime()).toBeCloseTo(new Date(startAt).getTime() - 2 * 60 * 60 * 1000, -3);
  });

  it("retourne null si le rendez-vous est déjà passé", () => {
    const startAt = new Date(Date.now() - 3600000).toISOString();
    expect(computeReminderTriggerDate(startAt)).toBeNull();
  });

  it("retourne null si le rappel tomberait dans le passé (rendez-vous trop proche)", () => {
    const startAt = new Date(Date.now() + 30 * 60000).toISOString();
    expect(computeReminderTriggerDate(startAt, 120)).toBeNull();
  });

  it("accepte un délai personnalisé", () => {
    const startAt = new Date(Date.now() + 60 * 60000).toISOString();
    const trigger = computeReminderTriggerDate(startAt, 30);
    expect(trigger).not.toBeNull();
    expect(trigger!.getTime()).toBeCloseTo(new Date(startAt).getTime() - 30 * 60000, -3);
  });
});
