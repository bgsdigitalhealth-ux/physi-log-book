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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      attendance: {
        Row: {
          id: string
          marked_at: string | null
          marked_by: string | null
          session_id: string
          status: string
          student_id: string
        }
        Insert: {
          id?: string
          marked_at?: string | null
          marked_by?: string | null
          session_id: string
          status?: string
          student_id: string
        }
        Update: {
          id?: string
          marked_at?: string | null
          marked_by?: string | null
          session_id?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      batches: {
        Row: {
          created_at: string
          id: string
          mentor: string | null
          name: string
          roll_range: string | null
          student_count: number
          venue: string | null
        }
        Insert: {
          created_at?: string
          id: string
          mentor?: string | null
          name: string
          roll_range?: string | null
          student_count?: number
          venue?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          mentor?: string | null
          name?: string
          roll_range?: string | null
          student_count?: number
          venue?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_view: string | null
          audience: Database["public"]["Enums"]["app_role"] | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          action_view?: string | null
          audience?: Database["public"]["Enums"]["app_role"] | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          type?: string
          user_id?: string | null
        }
        Update: {
          action_view?: string | null
          audience?: Database["public"]["Enums"]["app_role"] | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      practical_templates: {
        Row: {
          aim: string
          apparatus: string
          author: string | null
          category: string
          code: string
          columns: Json
          formula: string
          inference: string
          max_marks: number
          observation_rows: Json
          penalty: number
          principle: string
          procedure: string
          reference_caption: string
          reference_image: string
          req_calculations: boolean
          req_diagram: boolean
          req_viva: boolean
          seq: number
          status: string
          title: string
          type: string
          updated_at: string
          version: string
          viva_questions: Json
        }
        Insert: {
          aim?: string
          apparatus?: string
          author?: string | null
          category: string
          code: string
          columns?: Json
          formula?: string
          inference?: string
          max_marks?: number
          observation_rows?: Json
          penalty?: number
          principle?: string
          procedure?: string
          reference_caption?: string
          reference_image?: string
          req_calculations?: boolean
          req_diagram?: boolean
          req_viva?: boolean
          seq: number
          status?: string
          title: string
          type: string
          updated_at?: string
          version?: string
          viva_questions?: Json
        }
        Update: {
          aim?: string
          apparatus?: string
          author?: string | null
          category?: string
          code?: string
          columns?: Json
          formula?: string
          inference?: string
          max_marks?: number
          observation_rows?: Json
          penalty?: number
          principle?: string
          procedure?: string
          reference_caption?: string
          reference_image?: string
          req_calculations?: boolean
          req_diagram?: boolean
          req_viva?: boolean
          seq?: number
          status?: string
          title?: string
          type?: string
          updated_at?: string
          version?: string
          viva_questions?: Json
        }
        Relationships: [
          {
            foreignKeyName: "practical_templates_code_fkey"
            columns: ["code"]
            isOneToOne: true
            referencedRelation: "practicals"
            referencedColumns: ["code"]
          },
        ]
      }
      practicals: {
        Row: {
          active: boolean
          category: string
          code: string
          seq: number
          title: string
          type: string
        }
        Insert: {
          active?: boolean
          category: string
          code: string
          seq: number
          title: string
          type: string
        }
        Update: {
          active?: boolean
          category?: string
          code?: string
          seq?: number
          title?: string
          type?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          academic_phase: string | null
          academic_program: string | null
          admission_year: number | null
          batch_id: string | null
          created_at: string
          department: string | null
          designation: string | null
          email: string | null
          emergency_phone: string | null
          full_name: string
          gender: string | null
          guardian_name: string | null
          hold_reason: string | null
          is_active: boolean
          is_held: boolean
          locker: string | null
          phone: string | null
          photo_path: string | null
          register_number: string | null
          roll_number: string | null
          user_id: string
        }
        Insert: {
          academic_phase?: string | null
          academic_program?: string | null
          admission_year?: number | null
          batch_id?: string | null
          created_at?: string
          department?: string | null
          designation?: string | null
          email?: string | null
          emergency_phone?: string | null
          full_name?: string
          gender?: string | null
          guardian_name?: string | null
          hold_reason?: string | null
          is_active?: boolean
          is_held?: boolean
          locker?: string | null
          phone?: string | null
          photo_path?: string | null
          register_number?: string | null
          roll_number?: string | null
          user_id: string
        }
        Update: {
          academic_phase?: string | null
          academic_program?: string | null
          admission_year?: number | null
          batch_id?: string | null
          created_at?: string
          department?: string | null
          designation?: string | null
          email?: string | null
          emergency_phone?: string | null
          full_name?: string
          gender?: string | null
          guardian_name?: string | null
          hold_reason?: string | null
          is_active?: boolean
          is_held?: boolean
          locker?: string | null
          phone?: string | null
          photo_path?: string | null
          register_number?: string | null
          roll_number?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          batch_id: string | null
          faculty_id: string | null
          faculty_name: string | null
          id: string
          practical_code: string | null
          session_date: string
          status: string
          topic: string
          venue: string | null
        }
        Insert: {
          batch_id?: string | null
          faculty_id?: string | null
          faculty_name?: string | null
          id: string
          practical_code?: string | null
          session_date: string
          status?: string
          topic: string
          venue?: string | null
        }
        Update: {
          batch_id?: string | null
          faculty_id?: string | null
          faculty_name?: string | null
          id?: string
          practical_code?: string | null
          session_date?: string
          status?: string
          topic?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "sessions_practical_code_fkey"
            columns: ["practical_code"]
            isOneToOne: false
            referencedRelation: "practicals"
            referencedColumns: ["code"]
          },
        ]
      }
      submissions: {
        Row: {
          created_at: string
          entry: Json
          id: string
          marks: number | null
          max_marks: number
          page_no: number | null
          practical_code: string
          remarks: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          session_id: string | null
          status: string
          student_id: string
          submitted_at: string | null
        }
        Insert: {
          created_at?: string
          entry?: Json
          id?: string
          marks?: number | null
          max_marks?: number
          page_no?: number | null
          practical_code: string
          remarks?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          session_id?: string | null
          status?: string
          student_id: string
          submitted_at?: string | null
        }
        Update: {
          created_at?: string
          entry?: Json
          id?: string
          marks?: number | null
          max_marks?: number
          page_no?: number | null
          practical_code?: string
          remarks?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          session_id?: string | null
          status?: string
          student_id?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submissions_practical_code_fkey"
            columns: ["practical_code"]
            isOneToOne: false
            referencedRelation: "practicals"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "submissions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      viva_questions: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          id: string
          question: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          id?: string
          question: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          question?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_own_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: undefined
      }
      find_login_email: { Args: { _id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      save_journal_template: { Args: { payload: Json }; Returns: undefined }
      set_student_hold: {
        Args: { _held: boolean; _reason?: string; _student_id: string }
        Returns: undefined
      }
      student_growth_stats: {
        Args: never
        Returns: {
          avg_pct: number
          certified: number
          rank: number
          total_students: number
        }[]
      }
    }
    Enums: {
      app_role: "student" | "faculty" | "admin"
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
      app_role: ["student", "faculty", "admin"],
    },
  },
} as const
