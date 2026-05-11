export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin: {
        Row: {
          email: string
          id: string
          role: string | null
        }
        Insert: {
          email: string
          id: string
          role?: string | null
        }
        Update: {
          email?: string
          id?: string
          role?: string | null
        }
        Relationships: []
      }
      matches: {
        Row: {
          algorithm: string | null
          compatibility_score: number | null
          id: string
          is_stable: boolean | null
          matched_at: string | null
          matched_keywords: string[] | null
          mentee_group_id: string | null
          mentor_id: string | null
          status: string | null
        }
        Insert: {
          algorithm?: string | null
          compatibility_score?: number | null
          id?: string
          is_stable?: boolean | null
          matched_at?: string | null
          matched_keywords?: string[] | null
          mentee_group_id?: string | null
          mentor_id?: string | null
          status?: string | null
        }
        Update: {
          algorithm?: string | null
          compatibility_score?: number | null
          id?: string
          is_stable?: boolean | null
          matched_at?: string | null
          matched_keywords?: string[] | null
          mentee_group_id?: string | null
          mentor_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_mentee_group_id_fkey"
            columns: ["mentee_group_id"]
            isOneToOne: true
            referencedRelation: "MENTEE_GROUPS"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentor"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          created_at: string | null
          date: string
          description: string | null
          id: string
          is_recurring: boolean | null
          mentee_group_id: string | null
          mentor_id: string | null
          recurrence_day: string | null
          recurrence_time: string | null
          status: string | null
          time: string
          title: string
        }
        Insert: {
          created_at?: string | null
          date: string
          description?: string | null
          id?: string
          is_recurring?: boolean | null
          mentee_group_id?: string | null
          mentor_id?: string | null
          recurrence_day?: string | null
          recurrence_time?: string | null
          status?: string | null
          time: string
          title: string
        }
        Update: {
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          is_recurring?: boolean | null
          mentee_group_id?: string | null
          mentor_id?: string | null
          recurrence_day?: string | null
          recurrence_time?: string | null
          status?: string | null
          time?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_mentee_group_id_fkey"
            columns: ["mentee_group_id"]
            isOneToOne: false
            referencedRelation: "MENTEE_GROUPS"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentor"
            referencedColumns: ["id"]
          },
        ]
      }
      MENTEE_GROUPS: {
        Row: {
          available_days: string[]
          communication_preference: "FACE_TO_FACE" | "ONLINE_CHAT" | "ONLINE_CALL" | null
          created_at: string | null
          email: string | null
          group_members: string[]
          group_name: string
          id: string
          mentor_preference: string
          research_description: string
          research_title: string
          role: string
          time_slot: string[]
        }
        Insert: {
          available_days: string[]
          communication_preference?: "FACE_TO_FACE" | "ONLINE_CHAT" | "ONLINE_CALL" | null
          created_at?: string | null
          email?: string | null
          group_members: string[]
          group_name: string
          id: string
          mentor_preference: string
          research_description: string
          research_title: string
          role?: string
          time_slot: string[]
        }
        Update: {
          available_days?: string[]
          communication_preference?: "FACE_TO_FACE" | "ONLINE_CHAT" | "ONLINE_CALL" | null
          created_at?: string | null
          email?: string | null
          group_members?: string[]
          group_name?: string
          id?: string
          mentor_preference?: string
          research_description?: string
          research_title?: string
          role?: string
          time_slot?: string[]
        }
        Relationships: []
      }
      mentor: {
        Row: {
          available_days: string[] | null
          communication_preference: "FACE_TO_FACE" | "ONLINE_CHAT" | "ONLINE_CALL" | null
          email: string | null
          experience: number | null
          first_name: string | null
          forte: string[] | null
          id: string
          last_name: string | null
          mentor_capacity: number | null
          orcid: string | null
          prev_mentored_thesis: Json | null
          published_papers: Json | null
          profile_completed: boolean
          role: string
          self_description: string | null
          technical_skills: string[] | null
          time_slot: string[] | null
        }
        Insert: {
          available_days?: string[] | null
          communication_preference?: "FACE_TO_FACE" | "ONLINE_CHAT" | "ONLINE_CALL" | null
          email?: string | null
          experience?: number | null
          first_name?: string | null
          forte?: string[] | null
          id: string
          last_name?: string | null
          mentor_capacity?: number | null
          orcid?: string | null
          prev_mentored_thesis?: Json | null
          published_papers?: Json | null
          profile_completed?: boolean
          role?: string
          self_description?: string | null
          technical_skills?: string[] | null
          time_slot?: string[] | null
        }
        Update: {
          available_days?: string[] | null
          communication_preference?: "FACE_TO_FACE" | "ONLINE_CHAT" | "ONLINE_CALL" | null
          email?: string | null
          experience?: number | null
          first_name?: string | null
          forte?: string[] | null
          id?: string
          last_name?: string | null
          mentor_capacity?: number | null
          orcid?: string | null
          prev_mentored_thesis?: Json | null
          published_papers?: Json | null
          profile_completed?: boolean
          role?: string
          self_description?: string | null
          technical_skills?: string[] | null
          time_slot?: string[] | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
