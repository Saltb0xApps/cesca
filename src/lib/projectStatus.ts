import type { ProjectStatus } from '@/types';
import { theme } from '@/theme';

export const STATUS_META: Record<
  ProjectStatus,
  { label: string; color: string }
> = {
  idea: { label: 'Idea', color: theme.colors.textMuted },
  editing: { label: 'Editing', color: theme.colors.accent },
  done: { label: 'Done', color: theme.colors.success },
};

export const PROJECT_STATUSES: ProjectStatus[] = ['idea', 'editing', 'done'];
