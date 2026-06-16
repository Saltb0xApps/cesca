// Generated types placeholder.
//
// After your migrations are applied, regenerate the real types:
//   npx supabase gen types typescript --local > src/types/database.ts
// (or `--project-id <ref>` against the hosted project)
//
// Until then, this minimal shape keeps the typed client honest in the scaffold.

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar: string | null;
          exam_tag: string | null;
          timezone: string;
          streak_count: number;
          streak_freezes: number;
          last_pomo_date: string | null;
          created_at: string | null;
        };
        Insert: {
          id: string;
          display_name: string;
          avatar?: string | null;
          exam_tag?: string | null;
          timezone?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      rounds: {
        Row: {
          id: string;
          user_id: string;
          started_at: string;
          completed_at: string | null;
          status: 'running' | 'completed' | 'failed';
          chain_index: number;
          fail_reason: string | null;
          counts_for_league: boolean;
        };
        Insert: {
          user_id: string;
          chain_index?: number;
        };
        Update: {
          status?: 'running' | 'completed' | 'failed';
          fail_reason?: string | null;
          completed_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      start_round: {
        Args: { p_chain_index?: number };
        Returns: Database['public']['Tables']['rounds']['Row'];
      };
      bank_pomo: {
        Args: { p_task?: string | null; p_chain_index?: number };
        Returns: { weekly_pomos: number; league_rank: number }[];
      };
      league_standings: {
        Args: Record<string, never>;
        Returns: {
          user_id: string;
          display_name: string;
          avatar: string | null;
          pomos: number;
          is_you: boolean;
        }[];
      };
      ensure_current_league: {
        Args: { p_user: string };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
