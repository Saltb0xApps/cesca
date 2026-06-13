import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { queryClient } from '@/lib/queryClient';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { useLedgerStore } from '@/stores/ledgerStore';
import { useProfileStore } from '@/stores/profileStore';

function RootNavigator() {
  const { authed, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';

    // Only force unauthenticated users out. Forward navigation after auth is
    // driven by the sign-in / onboarding screens so onboarding isn't skipped.
    // `authed` is true for a real session OR demo mode.
    if (!authed && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    }
  }, [authed, loading, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="round" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="rules" options={{ presentation: 'modal' }} />
      <Stack.Screen name="recap" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    void useLedgerStore.getState().load();
    void useProfileStore.getState().load();
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
