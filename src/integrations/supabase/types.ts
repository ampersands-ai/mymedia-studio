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
          default_outputs: number | null
          display_order_in_family: number | null
          estimated_time_seconds: number | null
          groups: Json | null
          id: string
          input_schema: Json
          is_active: boolean | null
          logo_url: string | null
          max_images: number | null
          model_family: string | null
          model_name: string
          payload_structure: string
          provider: string
          record_id: string
          updated_at: string
          variant_name: string | null
        }
        Insert: {
          api_endpoint?: string | null
          base_token_cost: number
          content_type: string
          cost_multipliers?: Json | null
          created_at?: string
          default_outputs?: number | null
          display_order_in_family?: number | null
          estimated_time_seconds?: number | null
          groups?: Json | null
          id: string
          input_schema?: Json
          is_active?: boolean | null
          logo_url?: string | null
          max_images?: number | null
          model_family?: string | null
          model_name: string
          payload_structure?: string
          provider: string
          record_id?: string
          updated_at?: string
          variant_name?: string | null
        }
        Update: {
          api_endpoint?: string | null
          base_token_cost?: number
          content_type?: string
          cost_multipliers?: Json | null
          created_at?: string
          default_outputs?: number | null
          display_order_in_family?: number | null
          estimated_time_seconds?: number | null
          groups?: Json | null
          id?: string
          input_schema?: Json
          is_active?: boolean | null
          logo_url?: string | null
          max_images?: number | null
          model_family?: string | null
          model_name?: string
          payload_structure?: string
          provider?: string
          record_id?: string
          updated_at?: string
          variant_name?: string | null
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
          {
            foreignKeyName: "community_creations_model_record_id_fkey"
            columns: ["model_record_id"]
            isOneToOne: false
            referencedRelation: "ai_models"
            referencedColumns: ["record_id"]
          },
          {
            foreignKeyName: "community_creations_model_record_id_fkey"
            columns: ["model_record_id"]
            isOneToOne: false
            referencedRelation: "model_health_summary"
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
          {
            foreignKeyName: "fk_content_templates_model_record"
            columns: ["model_record_id"]
            isOneToOne: false
            referencedRelation: "model_health_summary"
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
          workflow_execution_id: string | null
          workflow_step_number: number | null
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
          workflow_execution_id?: string | null
          workflow_step_number?: number | null
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
          workflow_execution_id?: string | null
          workflow_step_number?: number | null
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
            foreignKeyName: "fk_generations_model_record"
            columns: ["model_record_id"]
            isOneToOne: false
            referencedRelation: "model_health_summary"
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
      model_alert_configs: {
        Row: {
          created_at: string
          email_enabled: boolean
          id: string
          model_id: string
          recipient_email: string | null
          threshold_percentage: number
          time_window_minutes: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email_enabled?: boolean
          id?: string
          model_id: string
          recipient_email?: string | null
          threshold_percentage?: number
          time_window_minutes?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email_enabled?: boolean
          id?: string
          model_id?: string
          recipient_email?: string | null
          threshold_percentage?: number
          time_window_minutes?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      model_alert_history: {
        Row: {
          config_id: string | null
          created_at: string
          email_sent: boolean
          failed_count: number
          failure_rate: number
          id: string
          model_id: string
          time_window_end: string
          time_window_start: string
          total_count: number
        }
        Insert: {
          config_id?: string | null
          created_at?: string
          email_sent?: boolean
          failed_count: number
          failure_rate: number
          id?: string
          model_id: string
          time_window_end: string
          time_window_start: string
          total_count: number
        }
        Update: {
          config_id?: string | null
          created_at?: string
          email_sent?: boolean
          failed_count?: number
          failure_rate?: number
          id?: string
          model_id?: string
          time_window_end?: string
          time_window_start?: string
          total_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "model_alert_history_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "model_alert_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      model_test_configs: {
        Row: {
          created_at: string | null
          custom_parameters: Json | null
          deduct_credits: boolean | null
          expected_format: string | null
          id: string
          max_latency_threshold: number | null
          max_retries: number | null
          model_record_id: string
          num_outputs: number | null
          prompt_template: string
          retry_on_failure: boolean | null
          save_outputs: boolean | null
          test_user_id: string | null
          timeout_seconds: number | null
          updated_at: string | null
          validate_file_accessible: boolean | null
        }
        Insert: {
          created_at?: string | null
          custom_parameters?: Json | null
          deduct_credits?: boolean | null
          expected_format?: string | null
          id?: string
          max_latency_threshold?: number | null
          max_retries?: number | null
          model_record_id: string
          num_outputs?: number | null
          prompt_template?: string
          retry_on_failure?: boolean | null
          save_outputs?: boolean | null
          test_user_id?: string | null
          timeout_seconds?: number | null
          updated_at?: string | null
          validate_file_accessible?: boolean | null
        }
        Update: {
          created_at?: string | null
          custom_parameters?: Json | null
          deduct_credits?: boolean | null
          expected_format?: string | null
          id?: string
          max_latency_threshold?: number | null
          max_retries?: number | null
          model_record_id?: string
          num_outputs?: number | null
          prompt_template?: string
          retry_on_failure?: boolean | null
          save_outputs?: boolean | null
          test_user_id?: string | null
          timeout_seconds?: number | null
          updated_at?: string | null
          validate_file_accessible?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "model_test_configs_model_record_id_fkey"
            columns: ["model_record_id"]
            isOneToOne: true
            referencedRelation: "ai_models"
            referencedColumns: ["record_id"]
          },
          {
            foreignKeyName: "model_test_configs_model_record_id_fkey"
            columns: ["model_record_id"]
            isOneToOne: true
            referencedRelation: "model_health_summary"
            referencedColumns: ["record_id"]
          },
          {
            foreignKeyName: "model_test_configs_test_user_id_fkey"
            columns: ["test_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      model_test_results: {
        Row: {
          api_final_response: Json | null
          api_first_response: Json | null
          api_request_payload: Json | null
          created_at: string | null
          credit_check_ms: number | null
          credit_deduct_ms: number | null
          credits_available_before: number | null
          credits_deducted: boolean | null
          credits_refunded: boolean | null
          credits_required: number | null
          error_code: string | null
          error_message: string | null
          error_stack: string | null
          flow_steps: Json[] | null
          generation_id: string | null
          generation_submit_ms: number | null
          id: string
          media_preview_url: string | null
          model_record_id: string
          output_receive_ms: number | null
          output_url: string | null
          polling_duration_ms: number | null
          status: string
          step_metadata: Json | null
          storage_metadata: Json | null
          storage_save_ms: number | null
          test_completed_at: string | null
          test_parameters: Json | null
          test_prompt: string
          test_started_at: string
          test_user_id: string | null
          total_latency_ms: number | null
          updated_at: string | null
        }
        Insert: {
          api_final_response?: Json | null
          api_first_response?: Json | null
          api_request_payload?: Json | null
          created_at?: string | null
          credit_check_ms?: number | null
          credit_deduct_ms?: number | null
          credits_available_before?: number | null
          credits_deducted?: boolean | null
          credits_refunded?: boolean | null
          credits_required?: number | null
          error_code?: string | null
          error_message?: string | null
          error_stack?: string | null
          flow_steps?: Json[] | null
          generation_id?: string | null
          generation_submit_ms?: number | null
          id?: string
          media_preview_url?: string | null
          model_record_id: string
          output_receive_ms?: number | null
          output_url?: string | null
          polling_duration_ms?: number | null
          status: string
          step_metadata?: Json | null
          storage_metadata?: Json | null
          storage_save_ms?: number | null
          test_completed_at?: string | null
          test_parameters?: Json | null
          test_prompt: string
          test_started_at?: string
          test_user_id?: string | null
          total_latency_ms?: number | null
          updated_at?: string | null
        }
        Update: {
          api_final_response?: Json | null
          api_first_response?: Json | null
          api_request_payload?: Json | null
          created_at?: string | null
          credit_check_ms?: number | null
          credit_deduct_ms?: number | null
          credits_available_before?: number | null
          credits_deducted?: boolean | null
          credits_refunded?: boolean | null
          credits_required?: number | null
          error_code?: string | null
          error_message?: string | null
          error_stack?: string | null
          flow_steps?: Json[] | null
          generation_id?: string | null
          generation_submit_ms?: number | null
          id?: string
          media_preview_url?: string | null
          model_record_id?: string
          output_receive_ms?: number | null
          output_url?: string | null
          polling_duration_ms?: number | null
          status?: string
          step_metadata?: Json | null
          storage_metadata?: Json | null
          storage_save_ms?: number | null
          test_completed_at?: string | null
          test_parameters?: Json | null
          test_prompt?: string
          test_started_at?: string
          test_user_id?: string | null
          total_latency_ms?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "model_test_results_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "generations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_test_results_model_record_id_fkey"
            columns: ["model_record_id"]
            isOneToOne: false
            referencedRelation: "ai_models"
            referencedColumns: ["record_id"]
          },
          {
            foreignKeyName: "model_test_results_model_record_id_fkey"
            columns: ["model_record_id"]
            isOneToOne: false
            referencedRelation: "model_health_summary"
            referencedColumns: ["record_id"]
          },
          {
            foreignKeyName: "model_test_results_test_user_id_fkey"
            columns: ["test_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      model_test_schedules: {
        Row: {
          created_at: string | null
          created_by: string | null
          cron_expression: string
          id: string
          is_active: boolean | null
          last_run_at: string | null
          model_record_id: string
          next_run_at: string | null
          schedule_name: string
          test_config: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          cron_expression: string
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          model_record_id: string
          next_run_at?: string | null
          schedule_name: string
          test_config?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          cron_expression?: string
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          model_record_id?: string
          next_run_at?: string | null
          schedule_name?: string
          test_config?: Json | null
          updated_at?: string | null
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
      user_onboarding_progress: {
        Row: {
          bonus_awarded: boolean | null
          completed_at: string | null
          completed_first_generation: boolean | null
          created_at: string | null
          dismissed: boolean | null
          downloaded_result: boolean | null
          entered_prompt: boolean | null
          first_generation_id: string | null
          id: string
          is_complete: boolean | null
          selected_template: boolean | null
          updated_at: string | null
          user_id: string
          viewed_result: boolean | null
          viewed_templates: boolean | null
          viewed_token_cost: boolean | null
        }
        Insert: {
          bonus_awarded?: boolean | null
          completed_at?: string | null
          completed_first_generation?: boolean | null
          created_at?: string | null
          dismissed?: boolean | null
          downloaded_result?: boolean | null
          entered_prompt?: boolean | null
          first_generation_id?: string | null
          id?: string
          is_complete?: boolean | null
          selected_template?: boolean | null
          updated_at?: string | null
          user_id: string
          viewed_result?: boolean | null
          viewed_templates?: boolean | null
          viewed_token_cost?: boolean | null
        }
        Update: {
          bonus_awarded?: boolean | null
          completed_at?: string | null
          completed_first_generation?: boolean | null
          created_at?: string | null
          dismissed?: boolean | null
          downloaded_result?: boolean | null
          entered_prompt?: boolean | null
          first_generation_id?: string | null
          id?: string
          is_complete?: boolean | null
          selected_template?: boolean | null
          updated_at?: string | null
          user_id?: string
          viewed_result?: boolean | null
          viewed_templates?: boolean | null
          viewed_token_cost?: boolean | null
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
          voiceover_url?: string | null
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
          {
            foreignKeyName: "community_creations_model_record_id_fkey"
            columns: ["model_record_id"]
            isOneToOne: false
            referencedRelation: "ai_models"
            referencedColumns: ["record_id"]
          },
          {
            foreignKeyName: "community_creations_model_record_id_fkey"
            columns: ["model_record_id"]
            isOneToOne: false
            referencedRelation: "model_health_summary"
            referencedColumns: ["record_id"]
          },
        ]
      }
      model_health_summary: {
        Row: {
          avg_latency_ms: number | null
          content_type: string | null
          deduct_credits: boolean | null
          failed_tests_24h: number | null
          groups: Json | null
          is_active: boolean | null
          last_test_at: string | null
          max_latency_ms: number | null
          min_latency_ms: number | null
          model_id: string | null
          model_name: string | null
          provider: string | null
          recent_error_codes: string[] | null
          record_id: string | null
          success_rate_percent_24h: number | null
          successful_tests_24h: number | null
          timeout_seconds: number | null
          total_tests_24h: number | null
        }
        Relationships: []
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
      user_content_history: {
        Row: {
          ai_caption: string | null
          ai_hashtags: string[] | null
          caption_generated_at: string | null
          created_at: string | null
          enhanced_prompt: string | null
          id: string | null
          is_batch_output: boolean | null
          output_index: number | null
          output_url: string | null
          parent_generation_id: string | null
          prompt: string | null
          provider_response: Json | null
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
    }
    Functions: {
      check_and_fail_stuck_jobs: { Args: never; Returns: undefined }
      check_existing_dispute: {
        Args: { _generation_id: string }
        Returns: boolean
      }
      cleanup_expired_sessions: { Args: never; Returns: undefined }
      cleanup_old_webhook_events: { Args: never; Returns: undefined }
      cleanup_rate_limits: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
      sanitize_provider_data: { Args: { data: Json }; Returns: Json }
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
