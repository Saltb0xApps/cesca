/**
 * The nightly notification. Because a scheduled local notification has fixed
 * content, we schedule the next 14 nights individually — each carrying that
 * night's rotating question — and re-arm the window every time the app opens.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { questionForDate } from '@/lib/questions';
import { AppSettings } from '@/lib/types';

const CHANNEL_ID = 'nightly-reminder';
const DAYS_AHEAD = 14;

export const REMINDER_TITLE = 'Time for your brain dump 🌙';

export async function ensureNotificationSetup(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Nightly reminder',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/**
 * Drop every scheduled reminder and (if enabled) schedule the next 14 nights
 * at the configured time, each with its own question.
 */
export async function rescheduleReminders(settings: AppSettings): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!settings.reminderEnabled) return;

  const granted = await ensureNotificationSetup();
  if (!granted) return;

  const now = new Date();
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const fireDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + i,
      settings.reminderHour,
      settings.reminderMinute,
      0,
      0,
    );
    if (fireDate.getTime() <= now.getTime()) continue; // tonight already passed
    const question = questionForDate(fireDate, settings.questions);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: REMINDER_TITLE,
        body: question,
        sound: 'default',
        data: { question },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireDate,
        channelId: CHANNEL_ID,
      },
    });
  }
}

/** Settings-screen helper: fire tonight's notification right now as a preview. */
export async function sendPreviewNotification(settings: AppSettings): Promise<boolean> {
  const granted = await ensureNotificationSetup();
  if (!granted) return false;
  const question = questionForDate(new Date(), settings.questions);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: REMINDER_TITLE,
      body: question,
      sound: 'default',
      data: { question },
    },
    trigger: null, // fire immediately
  });
  return true;
}

/** The question payload of a tapped notification, if present. */
export function questionFromResponse(
  response: Notifications.NotificationResponse | null,
): string | null {
  const q = response?.notification.request.content.data?.question;
  return typeof q === 'string' ? q : null;
}
