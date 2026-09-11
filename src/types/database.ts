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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      equipment: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          name: string
          slug: string | null
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          name: string
          slug?: string | null
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          name?: string
          slug?: string | null
        }
        Relationships: []
      }
      exercise_equipment: {
        Row: {
          equipment_id: string
          exercise_id: string
        }
        Insert: {
          equipment_id: string
          exercise_id: string
        }
        Update: {
          equipment_id?: string
          exercise_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_equipment_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_equipment_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_media: {
        Row: {
          caption: string | null
          created_at: string
          exercise_id: string
          id: string
          is_primary: boolean
          media_type: Database["public"]["Enums"]["media_type"]
          metadata: Json
          position: number
          url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          exercise_id: string
          id?: string
          is_primary?: boolean
          media_type: Database["public"]["Enums"]["media_type"]
          metadata?: Json
          position?: number
          url: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          exercise_id?: string
          id?: string
          is_primary?: boolean
          media_type?: Database["public"]["Enums"]["media_type"]
          metadata?: Json
          position?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_media_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_muscle_groups: {
        Row: {
          exercise_id: string
          muscle_group_id: string
          role: Database["public"]["Enums"]["muscle_group_role"]
        }
        Insert: {
          exercise_id: string
          muscle_group_id: string
          role: Database["public"]["Enums"]["muscle_group_role"]
        }
        Update: {
          exercise_id?: string
          muscle_group_id?: string
          role?: Database["public"]["Enums"]["muscle_group_role"]
        }
        Relationships: [
          {
            foreignKeyName: "exercise_muscle_groups_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_muscle_groups_muscle_group_id_fkey"
            columns: ["muscle_group_id"]
            isOneToOne: false
            referencedRelation: "muscle_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          common_mistakes: Json
          created_at: string
          description: string | null
          form_cues: Json
          id: string
          movement_pattern: string | null
          name: string
          slug: string
        }
        Insert: {
          common_mistakes?: Json
          created_at?: string
          description?: string | null
          form_cues?: Json
          id?: string
          movement_pattern?: string | null
          name: string
          slug: string
        }
        Update: {
          common_mistakes?: Json
          created_at?: string
          description?: string | null
          form_cues?: Json
          id?: string
          movement_pattern?: string | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      muscle_groups: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          name: string
          slug: string | null
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          name: string
          slug?: string | null
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          name?: string
          slug?: string | null
        }
        Relationships: []
      }
      plans: {
        Row: {
          generated_at: string
          id: string
          input_snapshot: Json
          principles_version: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["plan_status"]
          user_id: string
        }
        Insert: {
          generated_at?: string
          id?: string
          input_snapshot: Json
          principles_version: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["plan_status"]
          user_id: string
        }
        Update: {
          generated_at?: string
          id?: string
          input_snapshot?: Json
          principles_version?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["plan_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      session_exercises: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          position: number
          prescribed_load: number | null
          prescribed_notes: string | null
          prescribed_reps: number | null
          prescribed_sets: number | null
          session_id: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id: string
          position: number
          prescribed_load?: number | null
          prescribed_notes?: string | null
          prescribed_reps?: number | null
          prescribed_sets?: number | null
          session_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          position?: number
          prescribed_load?: number | null
          prescribed_notes?: string | null
          prescribed_reps?: number | null
          prescribed_sets?: number | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_exercises_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string
          created_by: Database["public"]["Enums"]["session_creator"]
          id: string
          name: string | null
          performed_at: string | null
          plan_id: string | null
          status: Database["public"]["Enums"]["session_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by: Database["public"]["Enums"]["session_creator"]
          id: string
          name?: string | null
          performed_at?: string | null
          plan_id?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: Database["public"]["Enums"]["session_creator"]
          id?: string
          name?: string | null
          performed_at?: string | null
          plan_id?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sets: {
        Row: {
          id: string
          logged_at: string
          reps: number
          rpe: number | null
          session_exercise_id: string
          set_number: number
          weight: number
        }
        Insert: {
          id: string
          logged_at?: string
          reps: number
          rpe?: number | null
          session_exercise_id: string
          set_number: number
          weight: number
        }
        Update: {
          id?: string
          logged_at?: string
          reps?: number
          rpe?: number | null
          session_exercise_id?: string
          set_number?: number
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "sets_session_exercise_id_fkey"
            columns: ["session_exercise_id"]
            isOneToOne: false
            referencedRelation: "session_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          age: number | null
          created_at: string
          display_name: string | null
          experience_level:
            | Database["public"]["Enums"]["experience_level"]
            | null
          id: string
          sex: Database["public"]["Enums"]["sex"] | null
          training_days_per_week: number | null
          unit_preference: Database["public"]["Enums"]["unit_preference"]
        }
        Insert: {
          age?: number | null
          created_at?: string
          display_name?: string | null
          experience_level?:
            | Database["public"]["Enums"]["experience_level"]
            | null
          id: string
          sex?: Database["public"]["Enums"]["sex"] | null
          training_days_per_week?: number | null
          unit_preference?: Database["public"]["Enums"]["unit_preference"]
        }
        Update: {
          age?: number | null
          created_at?: string
          display_name?: string | null
          experience_level?:
            | Database["public"]["Enums"]["experience_level"]
            | null
          id?: string
          sex?: Database["public"]["Enums"]["sex"] | null
          training_days_per_week?: number | null
          unit_preference?: Database["public"]["Enums"]["unit_preference"]
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
      experience_level: "beginner" | "intermediate" | "advanced"
      media_type: "video" | "image"
      muscle_group_role: "primary" | "secondary"
      plan_status:
        | "pending_review"
        | "approved"
        | "rejected"
        | "active"
        | "archived"
      session_creator: "user" | "agent"
      session_status: "in_progress" | "completed"
      sex: "male" | "female"
      unit_preference: "kg" | "lb"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      experience_level: ["beginner", "intermediate", "advanced"],
      media_type: ["video", "image"],
      muscle_group_role: ["primary", "secondary"],
      plan_status: [
        "pending_review",
        "approved",
        "rejected",
        "active",
        "archived",
      ],
      session_creator: ["user", "agent"],
      session_status: ["in_progress", "completed"],
      sex: ["male", "female"],
      unit_preference: ["kg", "lb"],
    },
  },
} as const
