import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';

import {
  DEFAULT_SETTINGS,
  getSettings,
  setSetting,
  type Settings,
} from '@/repositories/settings';
import { theme } from '@/theme';

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    let active = true;
    getSettings(db).then((s) => {
      if (active) setSettings(s);
    });
    return () => {
      active = false;
    };
  }, [db]);

  const toggle = async (key: keyof Settings) => {
    const next = !settings[key];
    setSettings((s) => ({ ...s, [key]: next }));
    await setSetting(db, key, next);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.groupLabel}>Saving reels</Text>
      <View style={styles.group}>
        <Row
          title="Download videos"
          subtitle="Store the actual clip so it plays in-app and survives the post being deleted. For personal use; downloading is a gray area under Instagram's terms."
          value={settings.downloadVideos}
          onToggle={() => toggle('downloadVideos')}
        />
        <View style={styles.divider} />
        <Row
          title="Wi-Fi only"
          subtitle="Avoid downloading videos over cellular data."
          value={settings.wifiOnly}
          onToggle={() => toggle('wifiOnly')}
        />
      </View>

      <Text style={styles.groupLabel}>About</Text>
      <View style={styles.group}>
        <Text style={styles.about}>
          Cesca keeps your saved reels, music and folders entirely on your
          device. Nothing is uploaded to any server.
        </Text>
      </View>
    </ScrollView>
  );
}

function Row({
  title,
  subtitle,
  value,
  onToggle,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ true: theme.colors.accent, false: theme.colors.border }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: 16, gap: 10 },
  groupLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
    marginLeft: 4,
  },
  group: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
  },
  rowText: { flex: 1, gap: 4 },
  rowTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '600' },
  rowSubtitle: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 18 },
  divider: { height: 1, backgroundColor: theme.colors.border },
  about: { color: theme.colors.textMuted, fontSize: 14, lineHeight: 20, paddingVertical: 16 },
});
