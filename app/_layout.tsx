import { useEffect } from 'react';
import { Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useShareIntent } from 'expo-share-intent';

import { DATABASE_NAME, migrateDb } from '@/db/database';
import { ingestShare } from '@/services/ingest';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ToastProvider } from '@/components/ui/Toast';
import { theme } from '@/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDb}>
          <ToastProvider>
            <StatusBar style="light" />
            <ShareIntentHandler />
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: theme.colors.bg },
                headerTintColor: theme.colors.text,
                headerShadowVisible: false,
                contentStyle: { backgroundColor: theme.colors.bg },
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="item/[id]" options={{ title: 'Saved video' }} />
              <Stack.Screen
                name="edit/[id]"
                options={{ title: 'Edit', presentation: 'modal' }}
              />
              <Stack.Screen name="folder/[id]" options={{ title: 'Folder' }} />
              <Stack.Screen
                name="add"
                options={{ title: 'Add a link', presentation: 'modal' }}
              />
            </Stack>
          </ToastProvider>
        </SQLiteProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

/**
 * Listens for content shared into the app from the OS Share Sheet (the
 * "Share → Cesca" flow from Instagram/TikTok), ingests it, and jumps to the
 * new item so the user can tag and file it.
 */
function ShareIntentHandler() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { hasShareIntent, shareIntent, resetShareIntent, error } =
    useShareIntent({ resetOnBackground: true });

  useEffect(() => {
    if (error) {
      Alert.alert('Share error', String(error));
    }
  }, [error]);

  useEffect(() => {
    if (!hasShareIntent) return;
    let cancelled = false;
    (async () => {
      try {
        const id = await ingestShare(db, {
          url: shareIntent.webUrl,
          text: shareIntent.text,
          files: shareIntent.files?.map((f) => f.path) ?? [],
        });
        if (!cancelled) {
          router.push(`/item/${id}`);
        }
      } catch (e) {
        Alert.alert('Could not save', String(e));
      } finally {
        resetShareIntent();
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasShareIntent]);

  return null;
}
