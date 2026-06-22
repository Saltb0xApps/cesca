import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { createProject, listProjects } from '@/repositories/projects';
import { STATUS_META } from '@/lib/projectStatus';
import type { Project } from '@/types';
import { theme } from '@/theme';

export default function ProjectsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState('');

  const reload = useCallback(() => {
    listProjects(db).then(setProjects);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const add = async () => {
    if (!name.trim()) return;
    const id = await createProject(db, name.trim());
    setName('');
    router.push(`/project/${id}`);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Projects</Text>
        <Text style={styles.subtitle}>
          Assemble clips and music for a video you&apos;re making.
        </Text>
        <View style={styles.addRow}>
          <View style={styles.flex}>
            <Field
              value={name}
              onChangeText={setName}
              placeholder="New project, e.g. ‘Italy trip’"
              onSubmitEditing={add}
              returnKeyType="done"
            />
          </View>
          <Button title="Create" onPress={add} />
        </View>
      </View>

      <FlatList
        data={projects}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const meta = STATUS_META[item.status];
          return (
            <Pressable
              style={styles.row}
              onPress={() => router.push(`/project/${item.id}`)}
            >
              <View style={styles.flex}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.count}>
                  {item.itemCount ?? 0}{' '}
                  {item.itemCount === 1 ? 'clip' : 'clips'}
                </Text>
              </View>
              <View style={[styles.badge, { borderColor: meta.color }]}>
                <Text style={[styles.badgeText, { color: meta.color }]}>
                  {meta.label}
                </Text>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="🎞️"
            title="No projects yet"
            subtitle="Create a project, then add saved clips and music to build its shot list."
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  header: { paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: '800' },
  subtitle: { color: theme.colors.textMuted, fontSize: 14 },
  addRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  flex: { flex: 1 },
  list: { padding: 12, gap: 8, flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  name: { color: theme.colors.text, fontSize: 16, fontWeight: '600' },
  count: { color: theme.colors.textMuted, fontSize: 13, marginTop: 2 },
  badge: {
    borderWidth: 1,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 12, fontWeight: '700' },
});
