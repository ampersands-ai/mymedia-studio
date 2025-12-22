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
      account_deletion_requests: {
        Row: {
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          deletion_metadata: Json | null
          id: string
          reason: string | null
          requested_at: string
          scheduled_deletion_at: string
          status: string
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          deletion_metadata?: Json | null
          id?: string
          reason?: string | null
          requested_at?: string
          scheduled_deletion_at?: string
          status?: string
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          deletion_metadata?: Json | null
          id?: string
          reason?: string | null
          requested_at?: string
          scheduled_deletion_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      animation_jobs: {
        Row: {
          audio_url: string | null
          background_type: string
          background_url: string | null
          callback_email: string | null
          caption_style: string
          color_scheme: Json | null
          completed_at: string | null
          created_at: string | null
          duration: number
          error_message: string | null
          id: string
          llm_cost: number | null
          overlay_type: string
          render_cost: number | null
          render_progress: number | null
          render_started_at: string | null
          retry_count: number | null
          scenes: Json | null
          script: string
          status: string
          style: string
          updated_at: string | null
          user_id: string
          video_config: Json | null
          video_url: string | null
          webhook_url: string | null
        }
        Insert: {
          audio_url?: string | null
          background_type?: string
          background_url?: string | null
          callback_email?: string | null
          caption_style?: string
          color_scheme?: Json | null
          completed_at?: string | null
          created_at?: string | null
          duration: number
          error_message?: string | null
          id?: string
          llm_cost?: number | null
          overlay_type?: string
          render_cost?: number | null
          render_progress?: number | null
          render_started_at?: string | null
          retry_count?: number | null
          scenes?: Json | null
          script: string
          status?: string
          style?: string
          updated_at?: string | null
          user_id: string
          video_config?: Json | null
          video_url?: string | null
          webhook_url?: string | null
        }
        Update: {
          audio_url?: string | null
          background_type?: string
          background_url?: string | null
          callback_email?: string | null
          caption_style?: string
          color_scheme?: Json | null
          completed_at?: string | null
          created_at?: string | null
          duration?: number
          error_message?: string | null
          id?: string
          llm_cost?: number | null
          overlay_type?: string
          render_cost?: number | null
          render_progress?: number | null
          render_started_at?: string | null
          retry_count?: number | null
          scenes?: Json | null
          script?: string
          status?: string
          style?: string
          updated_at?: string | null
          user_id?: string
          video_config?: Json | null
          video_url?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      api_call_logs: {
        Row: {
          additional_metadata: Json | null
          created_at: string
          endpoint: string
          error_details: Json | null
          error_message: string | null
          generation_id: string | null
          http_method: string
          id: string
          is_error: boolean | null
          latency_ms: number | null
          request_headers: Json | null
          request_payload: Json
          request_sent_at: string
          response_headers: Json | null
          response_payload: Json | null
          response_received_at: string | null
          response_status_code: number | null
          service_name: string
          step_name: string | null
          user_id: string
          video_job_id: string | null
        }
        Insert: {
          additional_metadata?: Json | null
          created_at?: string
          endpoint: string
          error_details?: Json | null
          error_message?: string | null
          generation_id?: string | null
          http_method?: string
          id?: string
          is_error?: boolean | null
          latency_ms?: number | null
          request_headers?: Json | null
          request_payload?: Json
          request_sent_at?: string
          response_headers?: Json | null
          response_payload?: Json | null
          response_received_at?: string | null
          response_status_code?: number | null
          service_name: string
          step_name?: string | null
          user_id: string
          video_job_id?: string | null
        }
        Update: {
          additional_metadata?: Json | null
          created_at?: string
          endpoint?: string
          error_details?: Json | null
          error_message?: string | null
          generation_id?: string | null
          http_method?: string
          id?: string
          is_error?: boolean | null
          latency_ms?: number | null
          request_headers?: Json | null
          request_payload?: Json
          request_sent_at?: string
          response_headers?: Json | null
          response_payload?: Json | null
          response_received_at?: string | null
          response_status_code?: number | null
          service_name?: string
          step_name?: string | null
          user_id?: string
          video_job_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_call_logs_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "generations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_call_logs_video_job_id_fkey"
            columns: ["video_job_id"]
            isOneToOne: false
            referencedRelation: "video_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      api_health_alerts: {
        Row: {
          admins_notified: boolean | null
          api_config_id: string
          consecutive_failures: number | null
          created_at: string | null
          failure_started_at: string | null
          id: string
          last_successful_check: string | null
          message: string
          notification_method: string | null
          notified_at: string | null
          resolution_notes: string | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
        }
        Insert: {
          admins_notified?: boolean | null
          api_config_id: string
          consecutive_failures?: number | null
          created_at?: string | null
          failure_started_at?: string | null
          id?: string
          last_successful_check?: string | null
          message: string
          notification_method?: string | null
          notified_at?: string | null
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
        }
        Update: {
          admins_notified?: boolean | null
          api_config_id?: string
          consecutive_failures?: number | null
          created_at?: string | null
          failure_started_at?: string | null
          id?: string
          last_successful_check?: string | null
          message?: string
          notification_method?: string | null
          notified_at?: string | null
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_health_alerts_api_config_id_fkey"
            columns: ["api_config_id"]
            isOneToOne: false
            referencedRelation: "external_api_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      api_health_checks: {
        Row: {
          api_config_id: string
          checked_at: string | null
          error_message: string | null
          id: string
          response_body: string | null
          response_headers: Json | null
          response_time_ms: number | null
          status: string
          status_code: number | null
        }
        Insert: {
          api_config_id: string
          checked_at?: string | null
          error_message?: string | null
          id?: string
          response_body?: string | null
          response_headers?: Json | null
          response_time_ms?: number | null
          status: string
          status_code?: number | null
        }
        Update: {
          api_config_id?: string
          checked_at?: string | null
          error_message?: string | null
          id?: string
          response_body?: string | null
          response_headers?: Json | null
          response_time_ms?: number | null
          status?: string
          status_code?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "api_health_checks_api_config_id_fkey"
            columns: ["api_config_id"]
            isOneToOne: false
            referencedRelation: "external_api_configs"
            referencedColumns: ["id"]
          },
        ]
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
      azure_voices: {
        Row: {
          country: string
          created_at: string | null
          description: string | null
          display_order: number | null
          has_preview: boolean | null
          id: string
          is_active: boolean | null
          language: string
          language_code: string
          preview_url: string | null
          provider: string
          tags: Json | null
          updated_at: string | null
          voice_id: string
          voice_name: string
        }
        Insert: {
          country: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          has_preview?: boolean | null
          id?: string
          is_active?: boolean | null
          language: string
          language_code: string
          preview_url?: string | null
          provider?: string
          tags?: Json | null
          updated_at?: string | null
          voice_id: string
          voice_name: string
        }
        Update: {
          country?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          has_preview?: boolean | null
          id?: string
          is_active?: boolean | null
          language?: string
          language_code?: string
          preview_url?: string | null
          provider?: string
          tags?: Json | null
          updated_at?: string | null
          voice_id?: string
          voice_name?: string
        }
        Relationships: []
      }
      blog_backlinks: {
        Row: {
          anchor_text: string
          blog_post_id: string
          created_at: string
          id: string
          is_internal: boolean
          position: number | null
          rel_attribute: string | null
          url: string
        }
        Insert: {
          anchor_text: string
          blog_post_id: string
          created_at?: string
          id?: string
          is_internal?: boolean
          position?: number | null
          rel_attribute?: string | null
          url: string
        }
        Update: {
          anchor_text?: string
          blog_post_id?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          position?: number | null
          rel_attribute?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_backlinks_blog_post_id_fkey"
            columns: ["blog_post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          meta_description: string | null
          name: string
          parent_id: string | null
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          meta_description?: string | null
          name: string
          parent_id?: string | null
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          meta_description?: string | null
          name?: string
          parent_id?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_email_distributions: {
        Row: {
          blog_post_id: string
          click_count: number
          created_at: string
          email_service_id: string | null
          id: string
          open_count: number
          recipient_count: number
          sent_at: string
          status: string
        }
        Insert: {
          blog_post_id: string
          click_count?: number
          created_at?: string
          email_service_id?: string | null
          id?: string
          open_count?: number
          recipient_count?: number
          sent_at?: string
          status?: string
        }
        Update: {
          blog_post_id?: string
          click_count?: number
          created_at?: string
          email_service_id?: string | null
          id?: string
          open_count?: number
          recipient_count?: number
          sent_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_email_distributions_blog_post_id_fkey"
            columns: ["blog_post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_images: {
        Row: {
          alt_text: string
          blog_post_id: string
          caption: string | null
          created_at: string
          generation_id: string | null
          id: string
          image_url: string
          is_featured: boolean
          model_id: string | null
          position: number
          prompt: string | null
          title: string | null
        }
        Insert: {
          alt_text: string
          blog_post_id: string
          caption?: string | null
          created_at?: string
          generation_id?: string | null
          id?: string
          image_url: string
          is_featured?: boolean
          model_id?: string | null
          position?: number
          prompt?: string | null
          title?: string | null
        }
        Update: {
          alt_text?: string
          blog_post_id?: string
          caption?: string | null
          created_at?: string
          generation_id?: string | null
          id?: string
          image_url?: string
          is_featured?: boolean
          model_id?: string | null
          position?: number
          prompt?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_images_blog_post_id_fkey"
            columns: ["blog_post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_post_categories: {
        Row: {
          blog_post_id: string
          category_id: string
        }
        Insert: {
          blog_post_id: string
          category_id: string
        }
        Update: {
          blog_post_id?: string
          category_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_categories_blog_post_id_fkey"
            columns: ["blog_post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_post_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_post_tags: {
        Row: {
          blog_post_id: string
          tag_id: string
        }
        Insert: {
          blog_post_id: string
          tag_id: string
        }
        Update: {
          blog_post_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_tags_blog_post_id_fkey"
            columns: ["blog_post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_post_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "blog_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          ai_generated: boolean
          author_id: string
          canonical_url: string | null
          content: string
          created_at: string
          excerpt: string | null
          featured_image_url: string | null
          generation_prompt: string | null
          id: string
          is_featured: boolean
          meta_description: string | null
          meta_keywords: string[] | null
          meta_title: string | null
          og_description: string | null
          og_image_url: string | null
          og_title: string | null
          published_at: string | null
          reading_time: number | null
          scheduled_for: string | null
          schema_data: Json | null
          schema_type: string | null
          share_count: number
          slug: string
          status: string
          title: string
          topic_prompt: string | null
          twitter_card_type: string | null
          twitter_description: string | null
          twitter_image_url: string | null
          twitter_title: string | null
          updated_at: string
          view_count: number
        }
        Insert: {
          ai_generated?: boolean
          author_id: string
          canonical_url?: string | null
          content: string
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          generation_prompt?: string | null
          id?: string
          is_featured?: boolean
          meta_description?: string | null
          meta_keywords?: string[] | null
          meta_title?: string | null
          og_description?: string | null
          og_image_url?: string | null
          og_title?: string | null
          published_at?: string | null
          reading_time?: number | null
          scheduled_for?: string | null
          schema_data?: Json | null
          schema_type?: string | null
          share_count?: number
          slug: string
          status?: string
          title: string
          topic_prompt?: string | null
          twitter_card_type?: string | null
          twitter_description?: string | null
          twitter_image_url?: string | null
          twitter_title?: string | null
          updated_at?: string
          view_count?: number
        }
        Update: {
          ai_generated?: boolean
          author_id?: string
          canonical_url?: string | null
          content?: string
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          generation_prompt?: string | null
          id?: string
          is_featured?: boolean
          meta_description?: string | null
          meta_keywords?: string[] | null
          meta_title?: string | null
          og_description?: string | null
          og_image_url?: string | null
          og_title?: string | null
          published_at?: string | null
          reading_time?: number | null
          scheduled_for?: string | null
          schema_data?: Json | null
          schema_type?: string | null
          share_count?: number
          slug?: string
          status?: string
          title?: string
          topic_prompt?: string | null
          twitter_card_type?: string | null
          twitter_description?: string | null
          twitter_image_url?: string | null
          twitter_title?: string | null
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      blog_tags: {
        Row: {
          created_at: string
          id: string
          meta_description: string | null
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          meta_description?: string | null
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          meta_description?: string | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      cinematic_prompts: {
        Row: {
          category: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          prompt: string
          quality_score: number | null
          source: string | null
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          prompt: string
          quality_score?: number | null
          source?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          prompt?: string
          quality_score?: number | null
          source?: string | null
          updated_at?: string | null
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
        ]
      }
      data_export_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          download_url: string | null
          error_message: string | null
          expires_at: string | null
          file_size_bytes: number | null
          id: string
          requested_at: string
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          download_url?: string | null
          error_message?: string | null
          expires_at?: string | null
          file_size_bytes?: number | null
          id?: string
          requested_at?: string
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          download_url?: string | null
          error_message?: string | null
          expires_at?: string | null
          file_size_bytes?: number | null
          id?: string
          requested_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      email_history: {
        Row: {
          clicked_at: string | null
          created_at: string
          delivery_status: string
          email_type: string
          error_message: string | null
          id: string
          metadata: Json | null
          opened_at: string | null
          recipient_email: string
          resend_email_id: string | null
          sent_at: string
          subject: string
          user_id: string | null
        }
        Insert: {
          clicked_at?: string | null
          created_at?: string
          delivery_status?: string
          email_type: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          recipient_email: string
          resend_email_id?: string | null
          sent_at?: string
          subject: string
          user_id?: string | null
        }
        Update: {
          clicked_at?: string | null
          created_at?: string
          delivery_status?: string
          email_type?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          recipient_email?: string
          resend_email_id?: string | null
          sent_at?: string
          subject?: string
          user_id?: string | null
        }
        Relationships: []
      }
      email_verification_tokens: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          token: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      error_events: {
        Row: {
          admin_notified: boolean | null
          category: string
          created_at: string | null
          endpoint: string | null
          error_code: string | null
          fingerprint: string | null
          function_name: string | null
          id: string
          message: string
          metadata: Json | null
          notified_at: string | null
          request_id: string | null
          resolution_notes: string | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          stack_trace: string | null
          user_facing: boolean | null
          user_id: string | null
          user_message: string | null
        }
        Insert: {
          admin_notified?: boolean | null
          category: string
          created_at?: string | null
          endpoint?: string | null
          error_code?: string | null
          fingerprint?: string | null
          function_name?: string | null
          id?: string
          message: string
          metadata?: Json | null
          notified_at?: string | null
          request_id?: string | null
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          stack_trace?: string | null
          user_facing?: boolean | null
          user_id?: string | null
          user_message?: string | null
        }
        Update: {
          admin_notified?: boolean | null
          category?: string
          created_at?: string | null
          endpoint?: string | null
          error_code?: string | null
          fingerprint?: string | null
          function_name?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          notified_at?: string | null
          request_id?: string | null
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          stack_trace?: string | null
          user_facing?: boolean | null
          user_id?: string | null
          user_message?: string | null
        }
        Relationships: []
      }
      external_api_configs: {
        Row: {
          alert_email: string[] | null
          alert_threshold: number | null
          alert_webhook_url: string | null
          category: string
          created_at: string | null
          display_name: string
          expected_response_time_ms: number | null
          expected_status_code: number | null
          health_check_interval_minutes: number | null
          health_check_method: string | null
          health_check_url: string
          id: string
          is_critical: boolean | null
          is_enabled: boolean | null
          metadata: Json | null
          name: string
          timeout_seconds: number | null
          updated_at: string | null
        }
        Insert: {
          alert_email?: string[] | null
          alert_threshold?: number | null
          alert_webhook_url?: string | null
          category: string
          created_at?: string | null
          display_name: string
          expected_response_time_ms?: number | null
          expected_status_code?: number | null
          health_check_interval_minutes?: number | null
          health_check_method?: string | null
          health_check_url: string
          id?: string
          is_critical?: boolean | null
          is_enabled?: boolean | null
          metadata?: Json | null
          name: string
          timeout_seconds?: number | null
          updated_at?: string | null
        }
        Update: {
          alert_email?: string[] | null
          alert_threshold?: number | null
          alert_webhook_url?: string | null
          category?: string
          created_at?: string | null
          display_name?: string
          expected_response_time_ms?: number | null
          expected_status_code?: number | null
          health_check_interval_minutes?: number | null
          health_check_method?: string | null
          health_check_url?: string
          id?: string
          is_critical?: boolean | null
          is_enabled?: boolean | null
          metadata?: Json | null
          name?: string
          timeout_seconds?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      function_logs: {
        Row: {
          context: Json | null
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          error_name: string | null
          error_stack: string | null
          function_name: string
          id: string
          log_level: string
          message: string
          request_id: string | null
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          error_name?: string | null
          error_stack?: string | null
          function_name: string
          id?: string
          log_level: string
          message: string
          request_id?: string | null
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          error_name?: string | null
          error_stack?: string | null
          function_name?: string
          id?: string
          log_level?: string
          message?: string
          request_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      function_performance_metrics: {
        Row: {
          created_at: string | null
          duration_ms: number
          function_name: string
          id: string
          metadata: Json | null
          request_id: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          duration_ms: number
          function_name: string
          id?: string
          metadata?: Json | null
          request_id?: string | null
          status: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          duration_ms?: number
          function_name?: string
          id?: string
          metadata?: Json | null
          request_id?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      generation_notifications: {
        Row: {
          clicked_at: string | null
          created_at: string
          delivery_status: string
          email_id: string | null
          error_message: string | null
          generation_id: string
          id: string
          notification_type: string
          opened_at: string | null
          sent_at: string
          user_id: string
        }
        Insert: {
          clicked_at?: string | null
          created_at?: string
          delivery_status?: string
          email_id?: string | null
          error_message?: string | null
          generation_id: string
          id?: string
          notification_type: string
          opened_at?: string | null
          sent_at?: string
          user_id: string
        }
        Update: {
          clicked_at?: string | null
          created_at?: string
          delivery_status?: string
          email_id?: string | null
          error_message?: string | null
          generation_id?: string
          id?: string
          notification_type?: string
          opened_at?: string | null
          sent_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generation_notifications_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "generations"
            referencedColumns: ["id"]
          },
        ]
      }
      generations: {
        Row: {
          actual_token_cost: number | null
          ai_caption: string | null
          ai_hashtags: string[] | null
          caption_generated_at: string | null
          completed_at: string | null
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
          tokens_charged: number | null
          tokens_used: number
          type: string
          user_id: string
          workflow_execution_id: string | null
          workflow_step_number: number | null
        }
        Insert: {
          actual_token_cost?: number | null
          ai_caption?: string | null
          ai_hashtags?: string[] | null
          caption_generated_at?: string | null
          completed_at?: string | null
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
          tokens_charged?: number | null
          tokens_used: number
          type: string
          user_id: string
          workflow_execution_id?: string | null
          workflow_step_number?: number | null
        }
        Update: {
          actual_token_cost?: number | null
          ai_caption?: string | null
          ai_hashtags?: string[] | null
          caption_generated_at?: string | null
          completed_at?: string | null
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
          tokens_charged?: number | null
          tokens_used?: number
          type?: string
          user_id?: string
          workflow_execution_id?: string | null
          workflow_step_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "generations_parent_generation_id_fkey"
            columns: ["parent_generation_id"]
            isOneToOne: false
            referencedRelation: "generations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generations_workflow_execution_id_fkey"
            columns: ["workflow_execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      kie_credit_audits: {
        Row: {
          api_callback_payload: Json
          api_callback_received_at: string
          api_request_payload: Json
          api_request_sent_at: string
          created_at: string | null
          credit_multiplier: number | null
          generation_id: string
          id: string
          is_threshold_breach: boolean | null
          kie_credits_consumed: number
          kie_credits_remaining: number | null
          model_id: string
          our_tokens_charged: number
          processing_time_seconds: number | null
          task_status: string
        }
        Insert: {
          api_callback_payload: Json
          api_callback_received_at: string
          api_request_payload: Json
          api_request_sent_at: string
          created_at?: string | null
          credit_multiplier?: number | null
          generation_id: string
          id?: string
          is_threshold_breach?: boolean | null
          kie_credits_consumed: number
          kie_credits_remaining?: number | null
          model_id: string
          our_tokens_charged: number
          processing_time_seconds?: number | null
          task_status: string
        }
        Update: {
          api_callback_payload?: Json
          api_callback_received_at?: string
          api_request_payload?: Json
          api_request_sent_at?: string
          created_at?: string | null
          credit_multiplier?: number | null
          generation_id?: string
          id?: string
          is_threshold_breach?: boolean | null
          kie_credits_consumed?: number
          kie_credits_remaining?: number | null
          model_id?: string
          our_tokens_charged?: number
          processing_time_seconds?: number | null
          task_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "kie_credit_audits_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: true
            referencedRelation: "generations"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_exemptions: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          is_active: boolean
          reason: string | null
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          reason?: string | null
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          email: string
          id: string
          is_active: boolean
          source: string | null
          subscribed_at: string
          unsubscribed_at: string | null
        }
        Insert: {
          email: string
          id?: string
          is_active?: boolean
          source?: string | null
          subscribed_at?: string
          unsubscribed_at?: string | null
        }
        Update: {
          email?: string
          id?: string
          is_active?: boolean
          source?: string | null
          subscribed_at?: string
          unsubscribed_at?: string | null
        }
        Relationships: []
      }
      password_reset_tokens: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          token: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          country: string | null
          created_at: string
          email: string | null
          email_verified: boolean | null
          full_name: string | null
          id: string
          keep_logged_in: boolean | null
          last_activity_at: string | null
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
          keep_logged_in?: boolean | null
          last_activity_at?: string | null
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
          keep_logged_in?: boolean | null
          last_activity_at?: string | null
          phone_number?: string | null
          updated_at?: string
          zipcode?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          endpoint: string
          id: string
          is_active: boolean
          last_used_at: string | null
          p256dh_key: string
          platform: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          endpoint: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          p256dh_key: string
          platform?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          endpoint?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          p256dh_key?: string
          platform?: string
          user_agent?: string | null
          user_id?: string
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
      saved_caption_presets: {
        Row: {
          created_at: string
          id: string
          name: string
          settings: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          settings: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          settings?: Json
          user_id?: string
        }
        Relationships: []
      }
      security_config: {
        Row: {
          config_key: string
          config_value: Json
          created_at: string | null
          description: string | null
          id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          config_key: string
          config_value: Json
          created_at?: string | null
          description?: string | null
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          config_key?: string
          config_value?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      share_tokens: {
        Row: {
          bucket_name: string
          content_type: string
          created_at: string
          expires_at: string
          generation_id: string | null
          id: string
          last_viewed_at: string | null
          storage_path: string
          token: string
          user_id: string
          video_job_id: string | null
          view_count: number
        }
        Insert: {
          bucket_name?: string
          content_type: string
          created_at?: string
          expires_at?: string
          generation_id?: string | null
          id?: string
          last_viewed_at?: string | null
          storage_path: string
          token: string
          user_id: string
          video_job_id?: string | null
          view_count?: number
        }
        Update: {
          bucket_name?: string
          content_type?: string
          created_at?: string
          expires_at?: string
          generation_id?: string | null
          id?: string
          last_viewed_at?: string | null
          storage_path?: string
          token?: string
          user_id?: string
          video_job_id?: string | null
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "share_tokens_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "generations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_tokens_video_job_id_fkey"
            columns: ["video_job_id"]
            isOneToOne: false
            referencedRelation: "video_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      storyboard_scenes: {
        Row: {
          created_at: string | null
          id: string
          image_preview_url: string | null
          image_prompt: string
          is_edited: boolean | null
          motion_effect: Json | null
          order_number: number
          storyboard_id: string
          updated_at: string | null
          video_url: string | null
          voice_over_text: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_preview_url?: string | null
          image_prompt: string
          is_edited?: boolean | null
          motion_effect?: Json | null
          order_number: number
          storyboard_id: string
          updated_at?: string | null
          video_url?: string | null
          voice_over_text: string
        }
        Update: {
          created_at?: string | null
          id?: string
          image_preview_url?: string | null
          image_prompt?: string
          is_edited?: boolean | null
          motion_effect?: Json | null
          order_number?: number
          storyboard_id?: string
          updated_at?: string | null
          video_url?: string | null
          voice_over_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "storyboard_scenes_storyboard_id_fkey"
            columns: ["storyboard_id"]
            isOneToOne: false
            referencedRelation: "storyboards"
            referencedColumns: ["id"]
          },
        ]
      }
      storyboards: {
        Row: {
          api_quota_remaining: number | null
          aspect_ratio: string | null
          background_music_url: string | null
          background_music_volume: number | null
          completed_at: string | null
          created_at: string | null
          custom_height: number | null
          custom_width: number | null
          draft_mode: boolean | null
          duration: number
          enable_cache: boolean | null
          estimated_render_cost: number | null
          font_family: string | null
          id: string
          image_animation_settings: Json | null
          image_model: string | null
          intro_image_preview_url: string | null
          intro_image_prompt: string | null
          intro_video_url: string | null
          intro_voiceover_text: string | null
          media_type: string | null
          music_settings: Json | null
          notify_on_completion: boolean | null
          original_character_count: number | null
          render_job_id: string | null
          status: string
          style: string
          subtitle_all_caps: boolean | null
          subtitle_box_color: string | null
          subtitle_font_family: string | null
          subtitle_language: string | null
          subtitle_line_color: string | null
          subtitle_max_words_per_line: number | null
          subtitle_model: string | null
          subtitle_settings: Json | null
          subtitle_shadow_color: string | null
          subtitle_shadow_offset: number | null
          subtitle_style: string | null
          subtitle_word_color: string | null
          subtitles_model: string | null
          template_id: string | null
          tokens_cost: number | null
          tone: string
          topic: string
          updated_at: string | null
          user_id: string
          video_quality: string | null
          video_search_query: string | null
          video_storage_path: string | null
          video_url: string | null
          voice_id: string
          voice_model: string | null
          voice_name: string
          voice_provider: string | null
        }
        Insert: {
          api_quota_remaining?: number | null
          aspect_ratio?: string | null
          background_music_url?: string | null
          background_music_volume?: number | null
          completed_at?: string | null
          created_at?: string | null
          custom_height?: number | null
          custom_width?: number | null
          draft_mode?: boolean | null
          duration: number
          enable_cache?: boolean | null
          estimated_render_cost?: number | null
          font_family?: string | null
          id?: string
          image_animation_settings?: Json | null
          image_model?: string | null
          intro_image_preview_url?: string | null
          intro_image_prompt?: string | null
          intro_video_url?: string | null
          intro_voiceover_text?: string | null
          media_type?: string | null
          music_settings?: Json | null
          notify_on_completion?: boolean | null
          original_character_count?: number | null
          render_job_id?: string | null
          status?: string
          style: string
          subtitle_all_caps?: boolean | null
          subtitle_box_color?: string | null
          subtitle_font_family?: string | null
          subtitle_language?: string | null
          subtitle_line_color?: string | null
          subtitle_max_words_per_line?: number | null
          subtitle_model?: string | null
          subtitle_settings?: Json | null
          subtitle_shadow_color?: string | null
          subtitle_shadow_offset?: number | null
          subtitle_style?: string | null
          subtitle_word_color?: string | null
          subtitles_model?: string | null
          template_id?: string | null
          tokens_cost?: number | null
          tone: string
          topic: string
          updated_at?: string | null
          user_id: string
          video_quality?: string | null
          video_search_query?: string | null
          video_storage_path?: string | null
          video_url?: string | null
          voice_id: string
          voice_model?: string | null
          voice_name: string
          voice_provider?: string | null
        }
        Update: {
          api_quota_remaining?: number | null
          aspect_ratio?: string | null
          background_music_url?: string | null
          background_music_volume?: number | null
          completed_at?: string | null
          created_at?: string | null
          custom_height?: number | null
          custom_width?: number | null
          draft_mode?: boolean | null
          duration?: number
          enable_cache?: boolean | null
          estimated_render_cost?: number | null
          font_family?: string | null
          id?: string
          image_animation_settings?: Json | null
          image_model?: string | null
          intro_image_preview_url?: string | null
          intro_image_prompt?: string | null
          intro_video_url?: string | null
          intro_voiceover_text?: string | null
          media_type?: string | null
          music_settings?: Json | null
          notify_on_completion?: boolean | null
          original_character_count?: number | null
          render_job_id?: string | null
          status?: string
          style?: string
          subtitle_all_caps?: boolean | null
          subtitle_box_color?: string | null
          subtitle_font_family?: string | null
          subtitle_language?: string | null
          subtitle_line_color?: string | null
          subtitle_max_words_per_line?: number | null
          subtitle_model?: string | null
          subtitle_settings?: Json | null
          subtitle_shadow_color?: string | null
          subtitle_shadow_offset?: number | null
          subtitle_style?: string | null
          subtitle_word_color?: string | null
          subtitles_model?: string | null
          template_id?: string | null
          tokens_cost?: number | null
          tone?: string
          topic?: string
          updated_at?: string | null
          user_id?: string
          video_quality?: string | null
          video_search_query?: string | null
          video_storage_path?: string | null
          video_url?: string | null
          voice_id?: string
          voice_model?: string | null
          voice_name?: string
          voice_provider?: string | null
        }
        Relationships: []
      }
      template_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_visible: boolean | null
          meta_description: string | null
          meta_title: string | null
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_visible?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_visible?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      template_landing_pages: {
        Row: {
          category_slug: string
          conversion_rate: number | null
          created_at: string
          default_settings: Json | null
          demo_video_url: string | null
          example_images: Json | null
          faqs: Json | null
          hero_after_image: string | null
          hero_before_image: string | null
          id: string
          is_published: boolean | null
          keywords: string[] | null
          long_description: string | null
          meta_description: string
          meta_title: string
          published_at: string | null
          related_template_ids: string[] | null
          schema_markup: Json | null
          slug: string
          steps: Json | null
          subtitle: string | null
          target_audience: string[] | null
          thumbnail_url: string | null
          tips: Json | null
          title: string
          token_cost: number | null
          tutorial_content: string | null
          updated_at: string
          use_cases: Json | null
          use_count: number
          view_count: number
          workflow_id: string | null
        }
        Insert: {
          category_slug: string
          conversion_rate?: number | null
          created_at?: string
          default_settings?: Json | null
          demo_video_url?: string | null
          example_images?: Json | null
          faqs?: Json | null
          hero_after_image?: string | null
          hero_before_image?: string | null
          id?: string
          is_published?: boolean | null
          keywords?: string[] | null
          long_description?: string | null
          meta_description: string
          meta_title: string
          published_at?: string | null
          related_template_ids?: string[] | null
          schema_markup?: Json | null
          slug: string
          steps?: Json | null
          subtitle?: string | null
          target_audience?: string[] | null
          thumbnail_url?: string | null
          tips?: Json | null
          title: string
          token_cost?: number | null
          tutorial_content?: string | null
          updated_at?: string
          use_cases?: Json | null
          use_count?: number
          view_count?: number
          workflow_id?: string | null
        }
        Update: {
          category_slug?: string
          conversion_rate?: number | null
          created_at?: string
          default_settings?: Json | null
          demo_video_url?: string | null
          example_images?: Json | null
          faqs?: Json | null
          hero_after_image?: string | null
          hero_before_image?: string | null
          id?: string
          is_published?: boolean | null
          keywords?: string[] | null
          long_description?: string | null
          meta_description?: string
          meta_title?: string
          published_at?: string | null
          related_template_ids?: string[] | null
          schema_markup?: Json | null
          slug?: string
          steps?: Json | null
          subtitle?: string | null
          target_audience?: string[] | null
          thumbnail_url?: string | null
          tips?: Json | null
          title?: string
          token_cost?: number | null
          tutorial_content?: string | null
          updated_at?: string
          use_cases?: Json | null
          use_count?: number
          view_count?: number
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_category"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "template_categories"
            referencedColumns: ["slug"]
          },
        ]
      }
      test_execution_logs: {
        Row: {
          created_at: string | null
          data: Json | null
          execution_context: string
          file_path: string | null
          function_name: string | null
          generation_id: string | null
          id: string
          line_number: number | null
          log_level: string
          message: string
          metadata: Json | null
          parent_step_number: number | null
          step_number: number
          step_type: string
          test_run_id: string
          timestamp: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          execution_context: string
          file_path?: string | null
          function_name?: string | null
          generation_id?: string | null
          id?: string
          line_number?: number | null
          log_level: string
          message: string
          metadata?: Json | null
          parent_step_number?: number | null
          step_number: number
          step_type: string
          test_run_id: string
          timestamp?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          execution_context?: string
          file_path?: string | null
          function_name?: string | null
          generation_id?: string | null
          id?: string
          line_number?: number | null
          log_level?: string
          message?: string
          metadata?: Json | null
          parent_step_number?: number | null
          step_number?: number
          step_type?: string
          test_run_id?: string
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_execution_logs_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "generations"
            referencedColumns: ["id"]
          },
        ]
      }
      test_execution_runs: {
        Row: {
          admin_user_id: string | null
          bookmark_name: string | null
          bookmarked: boolean | null
          completed_at: string | null
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          error_stack: string | null
          execution_data: Json
          generation_id: string | null
          id: string
          model_name: string
          model_provider: string
          model_record_id: string
          notes: string | null
          skip_billing: boolean | null
          started_at: string | null
          status: string
          steps_completed: number | null
          steps_total: number | null
          tags: string[] | null
          test_mode_enabled: boolean | null
          test_run_id: string
          updated_at: string | null
        }
        Insert: {
          admin_user_id?: string | null
          bookmark_name?: string | null
          bookmarked?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          error_stack?: string | null
          execution_data: Json
          generation_id?: string | null
          id?: string
          model_name: string
          model_provider: string
          model_record_id: string
          notes?: string | null
          skip_billing?: boolean | null
          started_at?: string | null
          status: string
          steps_completed?: number | null
          steps_total?: number | null
          tags?: string[] | null
          test_mode_enabled?: boolean | null
          test_run_id?: string
          updated_at?: string | null
        }
        Update: {
          admin_user_id?: string | null
          bookmark_name?: string | null
          bookmarked?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          error_stack?: string | null
          execution_data?: Json
          generation_id?: string | null
          id?: string
          model_name?: string
          model_provider?: string
          model_record_id?: string
          notes?: string | null
          skip_billing?: boolean | null
          started_at?: string | null
          status?: string
          steps_completed?: number | null
          steps_total?: number | null
          tags?: string[] | null
          test_mode_enabled?: boolean | null
          test_run_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_execution_runs_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "generations"
            referencedColumns: ["id"]
          },
        ]
      }
      test_execution_snapshots: {
        Row: {
          created_at: string | null
          id: string
          snapshot_type: string
          state_data: Json
          step_number: number
          test_run_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          snapshot_type: string
          state_data: Json
          step_number: number
          test_run_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          snapshot_type?: string
          state_data?: Json
          step_number?: number
          test_run_id?: string
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
            isOneToOne: true
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
      user_activity_logs: {
        Row: {
          activity_name: string
          activity_type: string
          created_at: string | null
          description: string | null
          duration_ms: number | null
          id: string
          metadata: Json | null
          route_name: string | null
          route_path: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          activity_name: string
          activity_type: string
          created_at?: string | null
          description?: string | null
          duration_ms?: number | null
          id?: string
          metadata?: Json | null
          route_name?: string | null
          route_path?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          activity_name?: string
          activity_type?: string
          created_at?: string | null
          description?: string | null
          duration_ms?: number | null
          id?: string
          metadata?: Json | null
          route_name?: string | null
          route_path?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_consent_records: {
        Row: {
          consent_type: string
          consented: boolean
          consented_at: string | null
          created_at: string
          device_id: string | null
          id: string
          ip_address: string | null
          updated_at: string
          user_agent: string | null
          user_id: string | null
          withdrawn_at: string | null
        }
        Insert: {
          consent_type: string
          consented?: boolean
          consented_at?: string | null
          created_at?: string
          device_id?: string | null
          id?: string
          ip_address?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
          withdrawn_at?: string | null
        }
        Update: {
          consent_type?: string
          consented?: boolean
          consented_at?: string | null
          created_at?: string
          device_id?: string | null
          id?: string
          ip_address?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
          withdrawn_at?: string | null
        }
        Relationships: []
      }
      user_error_logs: {
        Row: {
          admin_notes: string | null
          alert_sent: boolean | null
          browser_info: Json | null
          category: string | null
          component_name: string | null
          component_stack: string | null
          created_at: string | null
          error_message: string
          error_stack: string | null
          error_type: string
          id: string
          is_resolved: boolean | null
          metadata: Json | null
          resolved_at: string | null
          route_name: string
          route_path: string | null
          session_id: string | null
          severity: string
          user_action: string | null
          user_id: string | null
          viewport: Json | null
        }
        Insert: {
          admin_notes?: string | null
          alert_sent?: boolean | null
          browser_info?: Json | null
          category?: string | null
          component_name?: string | null
          component_stack?: string | null
          created_at?: string | null
          error_message: string
          error_stack?: string | null
          error_type: string
          id?: string
          is_resolved?: boolean | null
          metadata?: Json | null
          resolved_at?: string | null
          route_name: string
          route_path?: string | null
          session_id?: string | null
          severity: string
          user_action?: string | null
          user_id?: string | null
          viewport?: Json | null
        }
        Update: {
          admin_notes?: string | null
          alert_sent?: boolean | null
          browser_info?: Json | null
          category?: string | null
          component_name?: string | null
          component_stack?: string | null
          created_at?: string | null
          error_message?: string
          error_stack?: string | null
          error_type?: string
          id?: string
          is_resolved?: boolean | null
          metadata?: Json | null
          resolved_at?: string | null
          route_name?: string
          route_path?: string | null
          session_id?: string | null
          severity?: string
          user_action?: string | null
          user_id?: string | null
          viewport?: Json | null
        }
        Relationships: []
      }
      user_error_notifications: {
        Row: {
          action_label: string | null
          action_url: string | null
          created_at: string | null
          dismissed: boolean | null
          dismissed_at: string | null
          error_event_id: string
          expires_at: string | null
          id: string
          message: string
          shown: boolean | null
          shown_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string | null
          dismissed?: boolean | null
          dismissed_at?: string | null
          error_event_id: string
          expires_at?: string | null
          id?: string
          message: string
          shown?: boolean | null
          shown_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string | null
          dismissed?: boolean | null
          dismissed_at?: string | null
          error_event_id?: string
          expires_at?: string | null
          id?: string
          message?: string
          shown?: boolean | null
          shown_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_error_notifications_error_event_id_fkey"
            columns: ["error_event_id"]
            isOneToOne: false
            referencedRelation: "error_events"
            referencedColumns: ["id"]
          },
        ]
      }
      user_log_summaries: {
        Row: {
          created_at: string | null
          critical_errors: number | null
          full_log_data: Json | null
          health_score: number | null
          high_severity_errors: number | null
          id: string
          period_end: string
          period_start: string
          period_type: string
          summary_text: string | null
          technical_summary: string | null
          top_errors: Json | null
          total_activities: number | null
          total_errors: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          critical_errors?: number | null
          full_log_data?: Json | null
          health_score?: number | null
          high_severity_errors?: number | null
          id?: string
          period_end: string
          period_start: string
          period_type: string
          summary_text?: string | null
          technical_summary?: string | null
          top_errors?: Json | null
          total_activities?: number | null
          total_errors?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          critical_errors?: number | null
          full_log_data?: Json | null
          health_score?: number | null
          high_severity_errors?: number | null
          id?: string
          period_end?: string
          period_start?: string
          period_type?: string
          summary_text?: string | null
          technical_summary?: string | null
          top_errors?: Json | null
          total_activities?: number | null
          total_errors?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_notification_preferences: {
        Row: {
          created_at: string
          email_marketing: boolean
          email_on_completion: boolean
          email_on_profile_created: boolean
          email_on_subscription_change: boolean
          id: string
          notification_threshold_seconds: number
          push_on_completion: boolean
          unsubscribe_token: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_marketing?: boolean
          email_on_completion?: boolean
          email_on_profile_created?: boolean
          email_on_subscription_change?: boolean
          id?: string
          notification_threshold_seconds?: number
          push_on_completion?: boolean
          unsubscribe_token?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_marketing?: boolean
          email_on_completion?: boolean
          email_on_profile_created?: boolean
          email_on_subscription_change?: boolean
          id?: string
          notification_threshold_seconds?: number
          push_on_completion?: boolean
          unsubscribe_token?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_onboarding_progress: {
        Row: {
          bonus_awarded: boolean | null
          clicked_enhance_prompt: boolean | null
          clicked_generate: boolean | null
          clicked_generate_caption: boolean | null
          clicked_surprise_me: boolean | null
          completed_at: string | null
          completed_first_generation: boolean | null
          created_at: string | null
          dismissed: boolean | null
          downloaded_result: boolean | null
          entered_prompt: boolean | null
          first_generation_id: string | null
          id: string
          is_complete: boolean | null
          navigated_to_text_to_image: boolean | null
          selected_template: boolean | null
          selected_z_image: boolean | null
          updated_at: string | null
          user_id: string
          viewed_result: boolean | null
          viewed_templates: boolean | null
          viewed_token_cost: boolean | null
          visited_my_creations: boolean | null
        }
        Insert: {
          bonus_awarded?: boolean | null
          clicked_enhance_prompt?: boolean | null
          clicked_generate?: boolean | null
          clicked_generate_caption?: boolean | null
          clicked_surprise_me?: boolean | null
          completed_at?: string | null
          completed_first_generation?: boolean | null
          created_at?: string | null
          dismissed?: boolean | null
          downloaded_result?: boolean | null
          entered_prompt?: boolean | null
          first_generation_id?: string | null
          id?: string
          is_complete?: boolean | null
          navigated_to_text_to_image?: boolean | null
          selected_template?: boolean | null
          selected_z_image?: boolean | null
          updated_at?: string | null
          user_id: string
          viewed_result?: boolean | null
          viewed_templates?: boolean | null
          viewed_token_cost?: boolean | null
          visited_my_creations?: boolean | null
        }
        Update: {
          bonus_awarded?: boolean | null
          clicked_enhance_prompt?: boolean | null
          clicked_generate?: boolean | null
          clicked_generate_caption?: boolean | null
          clicked_surprise_me?: boolean | null
          completed_at?: string | null
          completed_first_generation?: boolean | null
          created_at?: string | null
          dismissed?: boolean | null
          downloaded_result?: boolean | null
          entered_prompt?: boolean | null
          first_generation_id?: string | null
          id?: string
          is_complete?: boolean | null
          navigated_to_text_to_image?: boolean | null
          selected_template?: boolean | null
          selected_z_image?: boolean | null
          updated_at?: string | null
          user_id?: string
          viewed_result?: boolean | null
          viewed_templates?: boolean | null
          viewed_token_cost?: boolean | null
          visited_my_creations?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "user_onboarding_progress_first_generation_id_fkey"
            columns: ["first_generation_id"]
            isOneToOne: false
            referencedRelation: "generations"
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
          billing_period: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          dodo_customer_id: string | null
          dodo_customer_id_encrypted: string | null
          dodo_subscription_id: string | null
          dodo_subscription_id_encrypted: string | null
          frozen_credits: number | null
          grace_period_end: string | null
          id: string
          last_webhook_at: string | null
          last_webhook_event: string | null
          payment_provider: string | null
          pending_downgrade_at: string | null
          pending_downgrade_plan: string | null
          plan: Database["public"]["Enums"]["subscription_plan"]
          status: string
          stripe_customer_id: string | null
          stripe_customer_id_encrypted: string | null
          stripe_subscription_id: string | null
          stripe_subscription_id_encrypted: string | null
          tokens_remaining: number
          tokens_total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_period?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          dodo_customer_id?: string | null
          dodo_customer_id_encrypted?: string | null
          dodo_subscription_id?: string | null
          dodo_subscription_id_encrypted?: string | null
          frozen_credits?: number | null
          grace_period_end?: string | null
          id?: string
          last_webhook_at?: string | null
          last_webhook_event?: string | null
          payment_provider?: string | null
          pending_downgrade_at?: string | null
          pending_downgrade_plan?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: string
          stripe_customer_id?: string | null
          stripe_customer_id_encrypted?: string | null
          stripe_subscription_id?: string | null
          stripe_subscription_id_encrypted?: string | null
          tokens_remaining?: number
          tokens_total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_period?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          dodo_customer_id?: string | null
          dodo_customer_id_encrypted?: string | null
          dodo_subscription_id?: string | null
          dodo_subscription_id_encrypted?: string | null
          frozen_credits?: number | null
          grace_period_end?: string | null
          id?: string
          last_webhook_at?: string | null
          last_webhook_event?: string | null
          payment_provider?: string | null
          pending_downgrade_at?: string | null
          pending_downgrade_plan?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: string
          stripe_customer_id?: string | null
          stripe_customer_id_encrypted?: string | null
          stripe_subscription_id?: string | null
          stripe_subscription_id_encrypted?: string | null
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
      vapid_keys: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          private_key: string
          public_key: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          private_key: string
          public_key: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          private_key?: string
          public_key?: string
        }
        Relationships: []
      }
      video_editor_jobs: {
        Row: {
          audio_track: Json | null
          clips: Json | null
          cost_credits: number | null
          created_at: string
          error_message: string | null
          final_video_url: string | null
          id: string
          output_settings: Json | null
          shotstack_render_id: string | null
          status: string
          subtitle_config: Json | null
          total_duration: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          audio_track?: Json | null
          clips?: Json | null
          cost_credits?: number | null
          created_at?: string
          error_message?: string | null
          final_video_url?: string | null
          id?: string
          output_settings?: Json | null
          shotstack_render_id?: string | null
          status?: string
          subtitle_config?: Json | null
          total_duration?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          audio_track?: Json | null
          clips?: Json | null
          cost_credits?: number | null
          created_at?: string
          error_message?: string | null
          final_video_url?: string | null
          id?: string
          output_settings?: Json | null
          shotstack_render_id?: string | null
          status?: string
          subtitle_config?: Json | null
          total_duration?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      video_jobs: {
        Row: {
          actual_audio_duration: number | null
          ai_caption: string | null
          ai_hashtags: string[] | null
          aspect_ratio: string | null
          background_media_type: string | null
          background_video_thumbnail: string | null
          background_video_url: string | null
          caption_generated_at: string | null
          caption_style: Json | null
          completed_at: string | null
          cost_tokens: number
          created_at: string
          custom_background_video: string | null
          duration: number
          error_details: Json | null
          error_message: string | null
          final_video_url: string | null
          id: string
          notify_on_completion: boolean | null
          renderer: string
          script: string | null
          shotstack_render_id: string | null
          status: string
          storage_path: string | null
          style: string
          topic: string
          updated_at: string
          user_id: string
          voice_id: string
          voice_name: string | null
          voiceover_regeneration_count: number
          voiceover_tier: string
          voiceover_url: string | null
        }
        Insert: {
          actual_audio_duration?: number | null
          ai_caption?: string | null
          ai_hashtags?: string[] | null
          aspect_ratio?: string | null
          background_media_type?: string | null
          background_video_thumbnail?: string | null
          background_video_url?: string | null
          caption_generated_at?: string | null
          caption_style?: Json | null
          completed_at?: string | null
          cost_tokens?: number
          created_at?: string
          custom_background_video?: string | null
          duration?: number
          error_details?: Json | null
          error_message?: string | null
          final_video_url?: string | null
          id?: string
          notify_on_completion?: boolean | null
          renderer?: string
          script?: string | null
          shotstack_render_id?: string | null
          status?: string
          storage_path?: string | null
          style?: string
          topic: string
          updated_at?: string
          user_id: string
          voice_id?: string
          voice_name?: string | null
          voiceover_regeneration_count?: number
          voiceover_tier?: string
          voiceover_url?: string | null
        }
        Update: {
          actual_audio_duration?: number | null
          ai_caption?: string | null
          ai_hashtags?: string[] | null
          aspect_ratio?: string | null
          background_media_type?: string | null
          background_video_thumbnail?: string | null
          background_video_url?: string | null
          caption_generated_at?: string | null
          caption_style?: Json | null
          completed_at?: string | null
          cost_tokens?: number
          created_at?: string
          custom_background_video?: string | null
          duration?: number
          error_details?: Json | null
          error_message?: string | null
          final_video_url?: string | null
          id?: string
          notify_on_completion?: boolean | null
          renderer?: string
          script?: string | null
          shotstack_render_id?: string | null
          status?: string
          storage_path?: string | null
          style?: string
          topic?: string
          updated_at?: string
          user_id?: string
          voice_id?: string
          voice_name?: string | null
          voiceover_regeneration_count?: number
          voiceover_tier?: string
          voiceover_url?: string | null
        }
        Relationships: []
      }
      webhook_alert_config: {
        Row: {
          alert_cooldown_minutes: number | null
          created_at: string | null
          enabled: boolean | null
          failure_threshold: number | null
          id: string
          provider: string
          success_rate_threshold: number | null
          timeout_threshold_ms: number | null
          updated_at: string | null
        }
        Insert: {
          alert_cooldown_minutes?: number | null
          created_at?: string | null
          enabled?: boolean | null
          failure_threshold?: number | null
          id?: string
          provider: string
          success_rate_threshold?: number | null
          timeout_threshold_ms?: number | null
          updated_at?: string | null
        }
        Update: {
          alert_cooldown_minutes?: number | null
          created_at?: string | null
          enabled?: boolean | null
          failure_threshold?: number | null
          id?: string
          provider?: string
          success_rate_threshold?: number | null
          timeout_threshold_ms?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      webhook_alert_history: {
        Row: {
          alert_type: string
          channels_failed: Json
          channels_sent: Json
          created_at: string | null
          id: string
          is_resolved: boolean | null
          message: string
          metadata: Json | null
          recipients: string[] | null
          resolution_notes: string | null
          resolved_at: string | null
          severity: string
          threshold_value: number
          trigger_value: number
        }
        Insert: {
          alert_type: string
          channels_failed?: Json
          channels_sent?: Json
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          message: string
          metadata?: Json | null
          recipients?: string[] | null
          resolution_notes?: string | null
          resolved_at?: string | null
          severity: string
          threshold_value: number
          trigger_value: number
        }
        Update: {
          alert_type?: string
          channels_failed?: Json
          channels_sent?: Json
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          message?: string
          metadata?: Json | null
          recipients?: string[] | null
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: string
          threshold_value?: number
          trigger_value?: number
        }
        Relationships: []
      }
      webhook_analytics: {
        Row: {
          created_at: string | null
          duration_ms: number | null
          error_code: string | null
          event_type: string
          id: string
          metadata: Json | null
          provider: string
          status: string
        }
        Insert: {
          created_at?: string | null
          duration_ms?: number | null
          error_code?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          provider: string
          status: string
        }
        Update: {
          created_at?: string | null
          duration_ms?: number | null
          error_code?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          provider?: string
          status?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          idempotency_key: string
          processed_at: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          idempotency_key: string
          processed_at?: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          idempotency_key?: string
          processed_at?: string
        }
        Relationships: []
      }
      webhook_health_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          details: Json | null
          id: string
          provider: string
          resolved_at: string | null
          severity: string
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          details?: Json | null
          id?: string
          provider: string
          resolved_at?: string | null
          severity: string
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          provider?: string
          resolved_at?: string | null
          severity?: string
        }
        Relationships: []
      }
      workflow_executions: {
        Row: {
          completed_at: string | null
          created_at: string
          current_step: number | null
          error_message: string | null
          final_output_url: string | null
          generation_ids: string[] | null
          id: string
          status: string
          step_outputs: Json | null
          tokens_used: number | null
          total_steps: number
          user_id: string
          user_inputs: Json
          workflow_template_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_step?: number | null
          error_message?: string | null
          final_output_url?: string | null
          generation_ids?: string[] | null
          id?: string
          status?: string
          step_outputs?: Json | null
          tokens_used?: number | null
          total_steps: number
          user_id: string
          user_inputs: Json
          workflow_template_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_step?: number | null
          error_message?: string | null
          final_output_url?: string | null
          generation_ids?: string[] | null
          id?: string
          status?: string
          step_outputs?: Json | null
          tokens_used?: number | null
          total_steps?: number
          user_id?: string
          user_inputs?: Json
          workflow_template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_workflow_template_id_fkey"
            columns: ["workflow_template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_workflow_template_id_fkey"
            columns: ["workflow_template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates_public"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_templates: {
        Row: {
          after_image_url: string | null
          before_image_url: string | null
          category: string
          created_at: string
          description: string | null
          display_order: number | null
          estimated_time_seconds: number | null
          id: string
          is_active: boolean | null
          name: string
          thumbnail_url: string | null
          updated_at: string
          user_input_fields: Json | null
          workflow_steps: Json
        }
        Insert: {
          after_image_url?: string | null
          before_image_url?: string | null
          category: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          estimated_time_seconds?: number | null
          id: string
          is_active?: boolean | null
          name: string
          thumbnail_url?: string | null
          updated_at?: string
          user_input_fields?: Json | null
          workflow_steps?: Json
        }
        Update: {
          after_image_url?: string | null
          before_image_url?: string | null
          category?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          estimated_time_seconds?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          thumbnail_url?: string | null
          updated_at?: string
          user_input_fields?: Json | null
          workflow_steps?: Json
        }
        Relationships: []
      }
    }
    Views: {
      community_creations_public: {
        Row: {
          content_type: string | null
          created_at: string | null
          generation_id: string | null
          id: string | null
          is_featured: boolean | null
          likes_count: number | null
          model_id: string | null
          model_record_id: string | null
          output_url: string | null
          prompt: string | null
          shared_at: string | null
          user_id: string | null
          views_count: number | null
        }
        Insert: {
          content_type?: string | null
          created_at?: string | null
          generation_id?: string | null
          id?: string | null
          is_featured?: boolean | null
          likes_count?: number | null
          model_id?: string | null
          model_record_id?: string | null
          output_url?: string | null
          prompt?: string | null
          shared_at?: string | null
          user_id?: never
          views_count?: number | null
        }
        Update: {
          content_type?: string | null
          created_at?: string | null
          generation_id?: string | null
          id?: string | null
          is_featured?: boolean | null
          likes_count?: number | null
          model_id?: string | null
          model_record_id?: string | null
          output_url?: string | null
          prompt?: string | null
          shared_at?: string | null
          user_id?: never
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
        ]
      }
      template_landing_pages_public: {
        Row: {
          category_slug: string | null
          created_at: string | null
          default_settings: Json | null
          demo_video_url: string | null
          example_images: Json | null
          faqs: Json | null
          hero_after_image: string | null
          hero_before_image: string | null
          id: string | null
          is_published: boolean | null
          keywords: string[] | null
          long_description: string | null
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          related_template_ids: string[] | null
          schema_markup: Json | null
          slug: string | null
          steps: Json | null
          subtitle: string | null
          target_audience: string[] | null
          thumbnail_url: string | null
          tips: Json | null
          title: string | null
          token_cost: number | null
          tutorial_content: string | null
          updated_at: string | null
          use_cases: Json | null
          workflow_id: string | null
        }
        Insert: {
          category_slug?: string | null
          created_at?: string | null
          default_settings?: Json | null
          demo_video_url?: string | null
          example_images?: Json | null
          faqs?: Json | null
          hero_after_image?: string | null
          hero_before_image?: string | null
          id?: string | null
          is_published?: boolean | null
          keywords?: string[] | null
          long_description?: string | null
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          related_template_ids?: string[] | null
          schema_markup?: Json | null
          slug?: string | null
          steps?: Json | null
          subtitle?: string | null
          target_audience?: string[] | null
          thumbnail_url?: string | null
          tips?: Json | null
          title?: string | null
          token_cost?: number | null
          tutorial_content?: string | null
          updated_at?: string | null
          use_cases?: Json | null
          workflow_id?: string | null
        }
        Update: {
          category_slug?: string | null
          created_at?: string | null
          default_settings?: Json | null
          demo_video_url?: string | null
          example_images?: Json | null
          faqs?: Json | null
          hero_after_image?: string | null
          hero_before_image?: string | null
          id?: string | null
          is_published?: boolean | null
          keywords?: string[] | null
          long_description?: string | null
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          related_template_ids?: string[] | null
          schema_markup?: Json | null
          slug?: string | null
          steps?: Json | null
          subtitle?: string | null
          target_audience?: string[] | null
          thumbnail_url?: string | null
          tips?: Json | null
          title?: string | null
          token_cost?: number | null
          tutorial_content?: string | null
          updated_at?: string | null
          use_cases?: Json | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_category"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "template_categories"
            referencedColumns: ["slug"]
          },
        ]
      }
      user_available_credits: {
        Row: {
          available_credits: number | null
          reserved_credits: number | null
          total_credits: number | null
          user_id: string | null
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
      user_content_history: {
        Row: {
          ai_caption: string | null
          ai_hashtags: string[] | null
          caption_generated_at: string | null
          completed_at: string | null
          created_at: string | null
          enhanced_prompt: string | null
          id: string | null
          is_batch_output: boolean | null
          model_id: string | null
          model_record_id: string | null
          output_index: number | null
          output_url: string | null
          parent_generation_id: string | null
          prompt: string | null
          provider_response: Json | null
          settings: Json | null
          source_table: string | null
          status: string | null
          storage_path: string | null
          storyboard_id: string | null
          tokens_used: number | null
          type: string | null
          user_id: string | null
          video_job_id: string | null
          workflow_execution_id: string | null
        }
        Relationships: []
      }
      webhook_analytics_summary: {
        Row: {
          event_type: string | null
          hour: string | null
          pending_count: number | null
          processed_count: number | null
          total_events: number | null
        }
        Relationships: []
      }
      workflow_templates_public: {
        Row: {
          after_image_url: string | null
          before_image_url: string | null
          category: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          estimated_time_seconds: number | null
          id: string | null
          is_active: boolean | null
          name: string | null
          primary_model_id: string | null
          primary_model_record_id: string | null
          thumbnail_url: string | null
          updated_at: string | null
          user_input_fields: Json | null
        }
        Insert: {
          after_image_url?: string | null
          before_image_url?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          estimated_time_seconds?: number | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          primary_model_id?: never
          primary_model_record_id?: never
          thumbnail_url?: string | null
          updated_at?: string | null
          user_input_fields?: Json | null
        }
        Update: {
          after_image_url?: string | null
          before_image_url?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          estimated_time_seconds?: number | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          primary_model_id?: never
          primary_model_record_id?: never
          thumbnail_url?: string | null
          updated_at?: string | null
          user_input_fields?: Json | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_and_fail_stuck_jobs: { Args: never; Returns: undefined }
      check_existing_dispute: {
        Args: { _generation_id: string }
        Returns: boolean
      }
      check_plaintext_payment_ids: {
        Args: never
        Returns: {
          check_name: string
          encrypted_count: number
          has_plaintext: boolean
          plaintext_count: number
        }[]
      }
      cleanup_all_old_logs: {
        Args: never
        Returns: {
          deleted_count: number
          table_name: string
        }[]
      }
      cleanup_expired_password_reset_tokens: { Args: never; Returns: undefined }
      cleanup_expired_sessions: { Args: never; Returns: undefined }
      cleanup_expired_verification_tokens: { Args: never; Returns: undefined }
      cleanup_old_audit_logs: {
        Args: { retention_days?: number }
        Returns: number
      }
      cleanup_old_function_logs: { Args: never; Returns: undefined }
      cleanup_old_webhook_events: { Args: never; Returns: undefined }
      cleanup_rate_limits: { Args: never; Returns: undefined }
      decrypt_payment_id: { Args: { ciphertext: string }; Returns: string }
      deduct_user_tokens: {
        Args: { p_cost: number; p_user_id: string }
        Returns: {
          error_message: string
          success: boolean
          tokens_remaining: number
        }[]
      }
      encrypt_payment_id: { Args: { plaintext: string }; Returns: string }
      find_user_by_dodo_customer: {
        Args: { p_customer_id: string }
        Returns: {
          plan: string
          tokens_remaining: number
          user_id: string
        }[]
      }
      find_user_by_stripe_customer: {
        Args: { p_customer_id: string }
        Returns: {
          plan: string
          tokens_remaining: number
          user_id: string
        }[]
      }
      find_user_by_stripe_subscription: {
        Args: { p_subscription_id: string }
        Returns: {
          plan: string
          tokens_remaining: number
          user_id: string
        }[]
      }
      get_admin_user_stats: {
        Args: never
        Returns: {
          active_users: number
          admin_count: number
          freemium_users: number
          premium_users: number
          pro_users: number
          total_users: number
          verified_users: number
        }[]
      }
      get_api_health_summary: {
        Args: never
        Returns: {
          api_name: string
          category: string
          current_status: string
          display_name: string
          is_critical: boolean
          last_check: string
          response_time_ms: number
          uptime_percentage: number
        }[]
      }
      get_auth_headers: { Args: never; Returns: Json }
      get_sanitized_error_logs: {
        Args: { p_limit?: number; p_user_id?: string }
        Returns: {
          category: string
          created_at: string
          id: string
          message: string
          resolved: boolean
          severity: string
          user_facing: boolean
          user_message: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_blog_share_count: {
        Args: { post_id: string }
        Returns: undefined
      }
      increment_blog_view_count: {
        Args: { post_id: string }
        Returns: undefined
      }
      increment_template_use_count: {
        Args: { template_id: string }
        Returns: undefined
      }
      increment_template_view_count: {
        Args: { template_id: string }
        Returns: undefined
      }
      increment_tokens: {
        Args: { amount: number; user_id_param: string }
        Returns: undefined
      }
      is_admin_user: { Args: { check_user_id: string }; Returns: boolean }
      is_moderation_exempt: { Args: { _user_id: string }; Returns: boolean }
      log_payment_id_decryption: {
        Args: { p_field_name: string; p_reason?: string; p_user_id: string }
        Returns: undefined
      }
      resolve_error_event: {
        Args: { p_error_id: string; p_resolution_notes?: string }
        Returns: undefined
      }
      sanitize_provider_data: { Args: { data: Json }; Returns: Json }
      search_admin_users: {
        Args: {
          filter_email_verified?: boolean
          filter_plan?: string
          filter_role?: string
          filter_status?: string
          page_limit?: number
          page_offset?: number
          search_term?: string
          sort_column?: string
          sort_direction?: string
        }
        Returns: {
          created_at: string
          email: string
          email_verified: boolean
          id: string
          is_admin: boolean
          is_mod_exempt: boolean
          last_activity_at: string
          plan: string
          profile_name: string
          subscription_status: string
          tokens_remaining: number
          tokens_total: number
          total_count: number
        }[]
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
