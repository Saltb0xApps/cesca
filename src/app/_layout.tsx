import * as Notifications from 'expo-notifications';
import { DarkTheme, Stack, ThemeProvider, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useAppStore } from '@/lib/store';
import { colors } from '@/lib/theme';
import { questionFromResponse, rescheduleReminders } from '@/services/reminders';
import { processPending } from '@/services/sync';

SplashScreen.preventAutoHideAsync();

// Show nightly reminders even while the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.surface,
    text: colors.text,
    primary: colors.accent,
    border: colors.border,
  },
};

export default function RootLayout() {
  const router = useRouter();
  const hydrated = useAppStore((s) => s.hydrated);
  const handledNotificationIds = useRef<Set<string>>(new Set());

  // Boot: hide splash, re-arm the 14-night reminder window, resume any
  // recordings that never finished transcribing/syncing.
  useEffect(() => {
    if (!hydrated) return;
    SplashScreen.hideAsync();
    const settings = useAppStore.getState().settings;
    rescheduleReminders(settings).catch(() => {});
    processPending().catch(() => {});
  }, [hydrated]);

  // Retry unfinished work whenever the app returns to the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && useAppStore.getState().hydrated) {
        processPending().catch(() => {});
      }
    });
    return () => sub.remove();
  }, []);

  // Tapping the nightly notification goes straight into recording, carrying
  // that night's question.
  useEffect(() => {
    const openRecorder = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const requestId = response.notification.request.identifier;
      if (handledNotificationIds.current.has(requestId)) return;
      handledNotificationIds.current.add(requestId);
      const question = questionFromResponse(response);
      router.push(
        question
          ? { pathname: '/record', params: { question } }
          : { pathname: '/record' },
      );
    };

    // Cold start from a notification tap:
    Notifications.getLastNotificationResponseAsync().then(openRecorder);
    // Taps while the app is alive:
    const sub = Notifications.addNotificationResponseReceivedListener(openRecorder);
    return () => sub.remove();
  }, [router]);

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      />
    </ThemeProvider>
  );
}
