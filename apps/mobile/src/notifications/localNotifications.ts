import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const DEFAULT_LEAD_MINUTES = 120;

/**
 * Calcule la date de déclenchement d'un rappel local, ou null si le rendez-vous est déjà
 * trop proche (moins d'une minute) ou passé — fonction pure, testée unitairement.
 */
export function computeReminderTriggerDate(
  startAtIso: string,
  leadMinutes: number = DEFAULT_LEAD_MINUTES,
): Date | null {
  const start = new Date(startAtIso).getTime();
  const trigger = start - leadMinutes * 60000;
  if (trigger - Date.now() < 60000) {
    return null;
  }
  return new Date(trigger);
}

export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === "granted") return true;
  const { status: requested } = await Notifications.requestPermissionsAsync();
  return requested === "granted";
}

/**
 * Programme un rappel LOCAL (généré et affiché par l'appareil lui-même, sans passer par un
 * serveur de push) pour un rendez-vous. Nécessite la permission notifications ; échoue
 * silencieusement si elle est refusée — l'app reste utilisable sans.
 */
export async function scheduleAppointmentReminder(
  appointmentId: string,
  title: string,
  startAtIso: string,
): Promise<string | null> {
  const triggerDate = computeReminderTriggerDate(startAtIso);
  if (!triggerDate) return null;

  const granted = await requestNotificationPermission();
  if (!granted) return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("appointments", {
      name: "Rendez-vous",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      title: "Rendez-vous à venir",
      body: title,
      data: { appointmentId },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });
}

export async function cancelAppointmentReminder(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}
