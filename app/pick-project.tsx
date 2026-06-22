import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { EmptyState } from '@/components/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { STATUS_META } from '@/lib/projectStatus';
import {
  addItemToProject,
  addTrackToProject,
  createProject,
  listProjects,
} from '@/repositories/projects';
import type { Project } from '@/types';
import { theme } from '@/theme';

/** Adds a single item or track to a project the user picks (or creates). */
export default function PickProjectScreen() {
  const { itemId, trackId } = useLocalSearchParams<{
    itemId?: string;
    trackId?: string;
  }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const toast = useToast();
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

  const addTo = async (projectId: string, projectName: string) => {
    if (itemId) await addItemToProject(db, projectId, itemId);
    if (trackId) await addTrackToProject(db, projectId, trackId);
    toast.show(`Added to ${projectName}`);
    router.back();
  };

  const createAndAdd = async () => {
    if (!name.trim()) return;
    const projectId = await createProject(db, name.trim());
    await addTo(projectId, name.trim());
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Add to project', presentation: 'modal' }} />
      <View style={styles.header}>
        <View style={styles.addRow}>
          <View style={styles.flex}>
            <Field
              value={name}
              onChangeText={setName}
              placeholder="New project…"
              onSubmitEditing={createAndAdd}
              returnKeyType="done"
            />
          </View>
          <Button title="Create" onPress={createAndAdd} />
        </View>
      </View>
      <FlatList
        data={projects}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => addTo(item.id, item.name)}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={[styles.status, { color: STATUS_META[item.status].color }]}>
              {STATUS_META[item.status].label}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="🎞️"
            title="No projects yet"
            subtitle="Create one above to add this to it."
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  header: { padding: 16 },
  addRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  flex: { flex: 1 },
  list: { paddingHorizontal: 12, paddingBottom: 24, gap: 8, flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  name: { color: theme.colors.text, fontSize: 16, fontWeight: '600' },
  status: { fontSize: 12, fontWeight: '700' },
});
