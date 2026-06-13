import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { colors } from '@/theme';

// Entry route: send authenticated users to the app, everyone else to sign-in.
export default function Index() {
  const { authed, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.tomato} />
      </View>
    );
  }

  return <Redirect href={authed ? '/(tabs)' : '/(auth)/sign-in'} />;
}
