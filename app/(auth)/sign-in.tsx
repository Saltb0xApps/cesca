import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { colors } from '@/theme';

export default function SignIn() {
  const router = useRouter();
  const { enterDemo } = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);

  const sendCode = async () => {
    if (!email.includes('@')) {
      Alert.alert('Enter a valid email');
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email });
    setBusy(false);
    if (error) {
      Alert.alert('Could not send code', error.message);
      return;
    }
    setStage('code');
  };

  const verify = async () => {
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
    setBusy(false);
    if (error) {
      Alert.alert('Invalid code', error.message);
      return;
    }
    // New users continue to onboarding; the tabs gate handles existing users.
    router.replace('/(auth)/onboarding');
  };

  const exploreDemo = async () => {
    await enterDemo();
    router.replace('/(auth)/onboarding');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <Text style={styles.brand}>PomoLeague</Text>
        <Text style={styles.tagline}>Study, scored as a sport.</Text>

        {!isSupabaseConfigured && (
          <Text style={styles.warn}>
            ⚠️ Supabase isn&apos;t configured. Copy .env.example to .env and fill in your keys.
          </Text>
        )}

        {stage === 'email' ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="you@school.edu"
              placeholderTextColor={colors.subtle}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
            />
            <Button label="Send me a code" onPress={sendCode} busy={busy} />
          </>
        ) : (
          <>
            <Text style={styles.hint}>We emailed a 6-digit code to {email}.</Text>
            <TextInput
              style={styles.input}
              placeholder="123456"
              placeholderTextColor={colors.subtle}
              keyboardType="number-pad"
              value={code}
              onChangeText={setCode}
              maxLength={6}
            />
            <Button label="Verify" onPress={verify} busy={busy} />
            <Pressable onPress={() => setStage('email')}>
              <Text style={styles.link}>Use a different email</Text>
            </Pressable>
          </>
        )}

        <Text style={styles.or}>— or —</Text>
        <Pressable style={styles.demo} onPress={exploreDemo}>
          <Text style={styles.demoText}>Explore the app (no account)</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Button({ label, onPress, busy }: { label: string; onPress: () => void; busy: boolean }) {
  return (
    <Pressable style={styles.button} onPress={onPress} disabled={busy}>
      {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 14 },
  brand: { fontSize: 38, fontWeight: '800', color: colors.tomato },
  tagline: { fontSize: 16, color: colors.subtle, marginBottom: 20 },
  hint: { color: colors.subtle },
  warn: { color: colors.tomatoDark, marginBottom: 8 },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: colors.ink,
  },
  button: {
    backgroundColor: colors.tomato,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  link: { color: colors.subtle, textAlign: 'center', marginTop: 4 },
  or: { color: colors.subtle, textAlign: 'center', marginTop: 18 },
  demo: {
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  demoText: { color: colors.ink, fontSize: 16, fontWeight: '700' },
});
