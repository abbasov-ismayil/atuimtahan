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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admin_deletion_requests: {
        Row: {
          admin_email: string
          admin_id: string
          created_at: string
          id: string
          requested_by: string
          status: string
        }
        Insert: {
          admin_email: string
          admin_id: string
          created_at?: string
          id?: string
          requested_by: string
          status?: string
        }
        Update: {
          admin_email?: string
          admin_id?: string
          created_at?: string
          id?: string
          requested_by?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_deletion_requests_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      admins: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      exam_history: {
        Row: {
          correct_count: number
          created_at: string
          exam_name: string
          id: string
          percentage: number
          total_questions: number
          unanswered_count: number
          user_id: string
          wrong_count: number
        }
        Insert: {
          correct_count?: number
          created_at?: string
          exam_name?: string
          id?: string
          percentage?: number
          total_questions?: number
          unanswered_count?: number
          user_id: string
          wrong_count?: number
        }
        Update: {
          correct_count?: number
          created_at?: string
          exam_name?: string
          id?: string
          percentage?: number
          total_questions?: number
          unanswered_count?: number
          user_id?: string
          wrong_count?: number
        }
        Relationships: []
      }
      exam_results: {
        Row: {
          answers_data: Json | null
          correct_count: number
          created_at: string
          exam_name: string
          exam_type: string
          id: string
          is_official: boolean
          percentage: number
          score: number | null
          total_questions: number
          unanswered_count: number
          user_id: string
          wrong_count: number
        }
        Insert: {
          answers_data?: Json | null
          correct_count?: number
          created_at?: string
          exam_name?: string
          exam_type?: string
          id?: string
          is_official?: boolean
          percentage?: number
          score?: number | null
          total_questions?: number
          unanswered_count?: number
          user_id: string
          wrong_count?: number
        }
        Update: {
          answers_data?: Json | null
          correct_count?: number
          created_at?: string
          exam_name?: string
          exam_type?: string
          id?: string
          is_official?: boolean
          percentage?: number
          score?: number | null
          total_questions?: number
          unanswered_count?: number
          user_id?: string
          wrong_count?: number
        }
        Relationships: []
      }
      group_exams: {
        Row: {
          created_at: string
          exam_type: string
          group_id: string
          id: string
          name: string
          question_count: number
          questions_data: Json
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          exam_type?: string
          group_id: string
          id?: string
          name: string
          question_count?: number
          questions_data?: Json
          uploaded_by: string
        }
        Update: {
          created_at?: string
          exam_type?: string
          group_id?: string
          id?: string
          name?: string
          question_count?: number
          questions_data?: Json
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_exams_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          department_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          department_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          department_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          exam_result_id: string | null
          id: string
          is_from_admin: boolean
          read: boolean
          receiver_id: string | null
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          exam_result_id?: string | null
          id?: string
          is_from_admin?: boolean
          read?: boolean
          receiver_id?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          exam_result_id?: string | null
          id?: string
          is_from_admin?: boolean
          read?: boolean
          receiver_id?: string | null
          sender_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          department_id: string | null
          full_name: string
          group_id: string | null
          id: string
          onboarding_complete: boolean
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          full_name?: string
          group_id?: string | null
          id?: string
          onboarding_complete?: boolean
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          created_at?: string
          department_id?: string | null
          full_name?: string
          group_id?: string | null
          id?: string
          onboarding_complete?: boolean
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      user_credentials: {
        Row: {
          auth_user_id: string | null
          created_at: string
          id: string
          username: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          id?: string
          username: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          id?: string
          username?: string
        }
        Relationships: []
      }
      user_exams: {
        Row: {
          created_at: string
          id: string
          name: string
          question_count: number
          questions_data: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          question_count?: number
          questions_data?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          question_count?: number
          questions_data?: Json
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_is_admin: { Args: never; Returns: boolean }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
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
