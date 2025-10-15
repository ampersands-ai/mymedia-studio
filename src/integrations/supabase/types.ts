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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_models: {
        Row: {
          api_endpoint: string | null
          base_token_cost: number
          content_type: string
          cost_multipliers: Json | null
          created_at: string
          estimated_time_seconds: number | null
          groups: Json | null
          id: string
          input_schema: Json
          is_active: boolean | null
          max_images: number | null
          model_name: string
          payload_structure: string
          provider: string
          record_id: string
          updated_at: string
        }
        Insert: {
          api_endpoint?: string | null
          base_token_cost: number
          content_type: string
          cost_multipliers?: Json | null
          created_at?: string
          estimated_time_seconds?: number | null
          groups?: Json | null
          id: string
          input_schema?: Json
          is_active?: boolean | null
          max_images?: number | null
          model_name: string
          payload_structure?: string
          provider: string
          record_id?: string
          updated_at?: string
        }
        Update: {
          api_endpoint?: string | null
          base_token_cost?: number
          content_type?: string
          cost_multipliers?: Json | null
          created_at?: string
          estimated_time_seconds?: number | null
          groups?: Json | null
          id?: string
          input_schema?: Json
          is_active?: boolean | null
          max_images?: number | null
          model_name?: string
          payload_structure?: string
          provider?: string
          record_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          resource_id: string | null
          resource_type: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      community_creations: {
        Row: {
          content_type: string
          created_at: string | null
          generation_id: string
          id: string
          is_featured: boolean | null
          likes_count: number | null
          model_id: string
          model_record_id: string | null
          output_url: string | null
          parameters: Json
          prompt: string
          shared_at: string | null
          user_id: string
          views_count: number | null
        }
        Insert: {
          content_type: string
          created_at?: string | null
          generation_id: string
          id?: string
          is_featured?: boolean | null
          likes_count?: number | null
          model_id: string
          model_record_id?: string | null
          output_url?: string | null
          parameters?: Json
          prompt: string
          shared_at?: string | null
          user_id: string
          views_count?: number | null
        }
        Update: {
          content_type?: string
          created_at?: string | null
          generation_id?: string
          id?: string
          is_featured?: boolean | null
          likes_count?: number | null
          model_id?: string
          model_record_id?: string | null
          output_url?: string | null
          parameters?: Json
          prompt?: string
          shared_at?: string | null
          user_id?: string
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "community_creations_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: true
            referencedRelation: "generations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_creations_model_record_id_fkey"
            columns: ["model_record_id"]
            isOneToOne: false
            referencedRelation: "ai_models"
            referencedColumns: ["record_id"]
          },
        ]
      }
      content_templates: {
        Row: {
          category: string
          created_at: string
          description: string | null
          display_order: number | null
          enhancement_instruction: string | null
          estimated_time_seconds: number | null
          hidden_field_defaults: Json | null
          id: string
          is_active: boolean | null
          is_custom_model: boolean | null
          model_id: string | null
          model_record_id: string | null
          name: string
          preset_parameters: Json
          thumbnail_url: string | null
          updated_at: string
          user_editable_fields: Json | null
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          enhancement_instruction?: string | null
          estimated_time_seconds?: number | null
          hidden_field_defaults?: Json | null
          id: string
          is_active?: boolean | null
          is_custom_model?: boolean | null
          model_id?: string | null
          model_record_id?: string | null
          name: string
          preset_parameters?: Json
          thumbnail_url?: string | null
          updated_at?: string
          user_editable_fields?: Json | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          enhancement_instruction?: string | null
          estimated_time_seconds?: number | null
          hidden_field_defaults?: Json | null
          id?: string
          is_active?: boolean | null
          is_custom_model?: boolean | null
          model_id?: string | null
          model_record_id?: string | null
          name?: string
          preset_parameters?: Json
          thumbnail_url?: string | null
          updated_at?: string
          user_editable_fields?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_content_templates_model_record"
            columns: ["model_record_id"]
            isOneToOne: false
            referencedRelation: "ai_models"
            referencedColumns: ["record_id"]
          },
        ]
      }
      generations: {
        Row: {
          actual_token_cost: number | null
          ai_caption: string | null
          ai_hashtags: string[] | null
          caption_generated_at: string | null
          created_at: string
          enhanced_prompt: string | null
          enhancement_provider: string | null
          file_size_bytes: number | null
          id: string
          is_batch_output: boolean | null
          model_id: string | null
          model_record_id: string | null
          original_prompt: string | null
          output_index: number | null
          output_url: string | null
          parent_generation_id: string | null
          prompt: string
          provider_request: Json | null
          provider_response: Json | null
          provider_task_id: string | null
          settings: Json | null
          status: string
          storage_path: string | null
          template_id: string | null
          tokens_used: number
          type: string
          user_id: string
        }
        Insert: {
          actual_token_cost?: number | null
          ai_caption?: string | null
          ai_hashtags?: string[] | null
          caption_generated_at?: string | null
          created_at?: string
          enhanced_prompt?: string | null
          enhancement_provider?: string | null
          file_size_bytes?: number | null
          id?: string
          is_batch_output?: boolean | null
          model_id?: string | null
          model_record_id?: string | null
          original_prompt?: string | null
          output_index?: number | null
          output_url?: string | null
          parent_generation_id?: string | null
          prompt: string
          provider_request?: Json | null
          provider_response?: Json | null
          provider_task_id?: string | null
          settings?: Json | null
          status?: string
          storage_path?: string | null
          template_id?: string | null
          tokens_used: number
          type: string
          user_id: string
        }
        Update: {
          actual_token_cost?: number | null
          ai_caption?: string | null
          ai_hashtags?: string[] | null
          caption_generated_at?: string | null
          created_at?: string
          enhanced_prompt?: string | null
          enhancement_provider?: string | null
          file_size_bytes?: number | null
          id?: string
          is_batch_output?: boolean | null
          model_id?: string | null
          model_record_id?: string | null
          original_prompt?: string | null
          output_index?: number | null
          output_url?: string | null
          parent_generation_id?: string | null
          prompt?: string
          provider_request?: Json | null
          provider_response?: Json | null
          provider_task_id?: string | null
          settings?: Json | null
          status?: string
          storage_path?: string | null
          template_id?: string | null
          tokens_used?: number
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_generations_model_record"
            columns: ["model_record_id"]
            isOneToOne: false
            referencedRelation: "ai_models"
            referencedColumns: ["record_id"]
          },
          {
            foreignKeyName: "generations_parent_generation_id_fkey"
            columns: ["parent_generation_id"]
            isOneToOne: false
            referencedRelation: "generations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generations_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "content_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          country: string | null
          created_at: string
          email: string | null
          email_verified: boolean | null
          full_name: string | null
          id: string
          phone_number: string | null
          updated_at: string
          zipcode: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          email?: string | null
          email_verified?: boolean | null
          full_name?: string | null
          id: string
          phone_number?: string | null
          updated_at?: string
          zipcode?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          email?: string | null
          email_verified?: boolean | null
          full_name?: string | null
          id?: string
          phone_number?: string | null
          updated_at?: string
          zipcode?: string | null
        }
        Relationships: []
      }
      rate_limit_tiers: {
        Row: {
          max_concurrent_generations: number
          max_generations_per_hour: number
          tier: string
        }
        Insert: {
          max_concurrent_generations: number
          max_generations_per_hour: number
          tier: string
        }
        Update: {
          max_concurrent_generations?: number
          max_generations_per_hour?: number
          tier?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action: string
          attempt_count: number
          blocked_until: string | null
          first_attempt_at: string
          id: string
          identifier: string
          last_attempt_at: string
        }
        Insert: {
          action: string
          attempt_count?: number
          blocked_until?: string | null
          first_attempt_at?: string
          id?: string
          identifier: string
          last_attempt_at?: string
        }
        Update: {
          action?: string
          attempt_count?: number
          blocked_until?: string | null
          first_attempt_at?: string
          id?: string
          identifier?: string
          last_attempt_at?: string
        }
        Relationships: []
      }
      token_dispute_history: {
        Row: {
          admin_notes: string | null
          archived_at: string
          auto_resolved: boolean | null
          created_at: string
          dispute_id: string
          generation_id: string
          generation_snapshot: Json
          id: string
          profile_snapshot: Json
          reason: string
          refund_amount: number | null
          reviewed_at: string
          reviewed_by: string
          status: Database["public"]["Enums"]["dispute_status"]
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          archived_at?: string
          auto_resolved?: boolean | null
          created_at: string
          dispute_id: string
          generation_id: string
          generation_snapshot: Json
          id?: string
          profile_snapshot: Json
          reason: string
          refund_amount?: number | null
          reviewed_at: string
          reviewed_by: string
          status: Database["public"]["Enums"]["dispute_status"]
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          archived_at?: string
          auto_resolved?: boolean | null
          created_at?: string
          dispute_id?: string
          generation_id?: string
          generation_snapshot?: Json
          id?: string
          profile_snapshot?: Json
          reason?: string
          refund_amount?: number | null
          reviewed_at?: string
          reviewed_by?: string
          status?: Database["public"]["Enums"]["dispute_status"]
          user_id?: string
        }
        Relationships: []
      }
      token_dispute_reports: {
        Row: {
          admin_notes: string | null
          auto_resolved: boolean | null
          created_at: string
          generation_id: string
          id: string
          reason: string
          refund_amount: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["dispute_status"]
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          auto_resolved?: boolean | null
          created_at?: string
          generation_id: string
          id?: string
          reason: string
          refund_amount?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          auto_resolved?: boolean | null
          created_at?: string
          generation_id?: string
          id?: string
          reason?: string
          refund_amount?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "token_dispute_reports_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "generations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "token_dispute_reports_user_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          ip_address: string | null
          is_active: boolean
          last_activity_at: string
          session_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: string | null
          is_active?: boolean
          last_activity_at?: string
          session_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean
          last_activity_at?: string
          session_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          dodo_customer_id: string | null
          dodo_subscription_id: string | null
          id: string
          last_webhook_at: string | null
          last_webhook_event: string | null
          plan: Database["public"]["Enums"]["subscription_plan"]
          status: string
          stripe_subscription_id: string | null
          tokens_remaining: number
          tokens_total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          dodo_customer_id?: string | null
          dodo_subscription_id?: string | null
          id?: string
          last_webhook_at?: string | null
          last_webhook_event?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: string
          stripe_subscription_id?: string | null
          tokens_remaining?: number
          tokens_total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          dodo_customer_id?: string | null
          dodo_subscription_id?: string | null
          id?: string
          last_webhook_at?: string | null
          last_webhook_event?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: string
          stripe_subscription_id?: string | null
          tokens_remaining?: number
          tokens_total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_rate_limits: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_tokens: {
        Args: { amount: number; user_id_param: string }
        Returns: undefined
      }
      sanitize_provider_data: {
        Args: { data: Json }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      dispute_status: "pending" | "reviewed" | "resolved" | "rejected"
      subscription_plan:
        | "freemium"
        | "explorer"
        | "creators"
        | "professional"
        | "ultimate"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
      dispute_status: ["pending", "reviewed", "resolved", "rejected"],
      subscription_plan: [
        "freemium",
        "explorer",
        "creators",
        "professional",
        "ultimate",
      ],
    },
  },
} as const
