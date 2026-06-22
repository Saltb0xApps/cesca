import { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/Field';
import { EmptyState } from '@/components/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { PROJECT_STATUSES, STATUS_META } from '@/lib/projectStatus';
import {
  deleteProject,
  getProject,
  listProjectItems,
  listProjectTracks,
  moveProjectItem,
  removeItemFromProject,
  removeTrackFromProject,
  updateProject,
} from '@/repositories/projects';
import { buildShotList } from '@/services/export';
import type { Project, ProjectStatus, SavedItem, Track } from '@/types';
import { theme } from '@/theme';

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const toast = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [items, setItems] = useState<SavedItem[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    const p = await getProject(db, id);
    setProject(p);
    setName(p?.name ?? '');
    setNotes(p?.notes ?? '');
    setItems(await listProjectItems(db, id));
    setTracks(await listProjectTracks(db, id));
  }, [db, id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!project) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Loading…</Text>
      </View>
    );
  }

  const setStatus = async (status: ProjectStatus) => {
    setProject({ ...project, status });
    await updateProject(db, id, { status });
  };

  const saveName = async () => {
    if (name.trim() && name.trim() !== project.name) {
      await updateProject(db, id, { name: name.trim() });
    }
  };

  const saveNotes = async () => {
    await updateProject(db, id, { notes: notes.trim() || null });
  };

  const move = async (itemId: string, dir: -1 | 1) => {
    await moveProjectItem(db, id, itemId, dir);
    setItems(await listProjectItems(db, id));
  };

  const removeItem = async (itemId: string) => {
    await removeItemFromProject(db, id, itemId);
    setItems(await listProjectItems(db, id));
  };

  const removeTrack = async (trackId: string) => {
    await removeTrackFromProject(db, id, trackId);
    setTracks(await listProjectTracks(db, id));
  };

  const exportList = async () => {
    const text = buildShotList(project, items, tracks);
    await Share.share({ message: text, title: project.name });
  };

  const remove = async () => {
    await deleteProject(db, id);
    router.back();
    toast.show('Project deleted');
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: project.name }} />

      <Field
        label="Project name"
        value={name}
        onChangeText={setName}
        onEndEditing={saveName}
      />

      <View style={styles.statusRow}>
        {PROJECT_STATUSES.map((s) => (
          <Chip
            key={s}
            label={STATUS_META[s].label}
            active={project.status === s}
            onPress={() => setStatus(s)}
          />
        ))}
      </View>

      <Field
        label="Notes"
        value={notes}
        onChangeText={setNotes}
        onEndEditing={saveNotes}
        placeholder="Direction, pacing, hook ideas…"
        multiline
        style={styles.multiline}
      />

      <View style={styles.sectionHead}>
        <Text style={styles.sectionLabel}>Shot list ({items.length})</Text>
        <Pressable onPress={() => router.push(`/pick-clips/${id}`)}>
          <Text style={styles.addLink}>+ Add clips</Text>
        </Pressable>
      </View>

      {items.length === 0 ? (
        <EmptyState
          icon="🎬"
          title="No clips yet"
          subtitle="Add saved videos to build the shot list, then reorder them."
        />
      ) : (
        items.map((item, index) => (
          <View key={item.id} style={styles.shotRow}>
            <Text style={styles.shotIndex}>{index + 1}</Text>
            <Pressable
              style={styles.shotMain}
              onPress={() => router.push(`/item/${item.id}`)}
            >
              {item.thumbnailUri ? (
                <Image source={{ uri: item.thumbnailUri }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.thumbFallback]}>
                  <Text>🎬</Text>
                </View>
              )}
              <Text style={styles.shotCaption} numberOfLines={2}>
                {item.caption || item.title || 'Untitled clip'}
              </Text>
            </Pressable>
            <View style={styles.shotControls}>
              <Pressable hitSlop={6} onPress={() => move(item.id, -1)}>
                <Text style={styles.control}>▲</Text>
              </Pressable>
              <Pressable hitSlop={6} onPress={() => move(item.id, 1)}>
                <Text style={styles.control}>▼</Text>
              </Pressable>
              <Pressable hitSlop={6} onPress={() => removeItem(item.id)}>
                <Text style={styles.remove}>✕</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}

      <View style={styles.sectionHead}>
        <Text style={styles.sectionLabel}>Music ({tracks.length})</Text>
      </View>
      {tracks.length === 0 ? (
        <Text style={styles.hint}>
          Add music from a track&apos;s page using “Add to a project”.
        </Text>
      ) : (
        tracks.map((t) => (
          <View key={t.id} style={styles.trackRow}>
            <Text style={styles.trackText} numberOfLines={1}>
              ♪ {[t.title, t.artist].filter(Boolean).join(' · ') || 'Untitled'}
            </Text>
            <Pressable hitSlop={6} onPress={() => removeTrack(t.id)}>
              <Text style={styles.remove}>✕</Text>
            </Pressable>
          </View>
        ))
      )}

      <Button title="Export shot list" onPress={exportList} style={styles.exportBtn} />
      <Button title="Delete project" variant="danger" onPress={remove} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: 16, gap: 14, paddingBottom: 48 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.bg,
  },
  muted: { color: theme.colors.textMuted },
  statusRow: { flexDirection: 'row', gap: 8 },
  multiline: { minHeight: 80, paddingTop: 12, textAlignVertical: 'top' },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  sectionLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addLink: { color: theme.colors.accent, fontSize: 14, fontWeight: '700' },
  hint: { color: theme.colors.textMuted, fontSize: 13 },
  shotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 8,
  },
  shotIndex: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
    width: 20,
    textAlign: 'center',
  },
  shotMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  thumb: {
    width: 44,
    height: 58,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceAlt,
  },
  thumbFallback: { alignItems: 'center', justifyContent: 'center' },
  shotCaption: { flex: 1, color: theme.colors.text, fontSize: 13, lineHeight: 17 },
  shotControls: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingRight: 6 },
  control: { color: theme.colors.textMuted, fontSize: 16 },
  remove: { color: theme.colors.danger, fontSize: 15, fontWeight: '700' },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  trackText: { color: theme.colors.text, fontSize: 14, flex: 1 },
  exportBtn: { marginTop: 12 },
});
