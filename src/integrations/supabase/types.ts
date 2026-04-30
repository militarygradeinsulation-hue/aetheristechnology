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
      accounts: {
        Row: {
          created_at: string
          hubspot_access_token_encrypted: string | null
          hubspot_access_token_expires_at: string | null
          hubspot_connected_at: string | null
          hubspot_portal_id: string | null
          hubspot_refresh_token_encrypted: string | null
          hubspot_scopes: string | null
          id: string
          last_sync_at: string | null
          last_sync_error: string | null
          last_sync_status: string | null
          sync_progress: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hubspot_access_token_encrypted?: string | null
          hubspot_access_token_expires_at?: string | null
          hubspot_connected_at?: string | null
          hubspot_portal_id?: string | null
          hubspot_refresh_token_encrypted?: string | null
          hubspot_scopes?: string | null
          id?: string
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          sync_progress?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hubspot_access_token_encrypted?: string | null
          hubspot_access_token_expires_at?: string | null
          hubspot_connected_at?: string | null
          hubspot_portal_id?: string | null
          hubspot_refresh_token_encrypted?: string | null
          hubspot_scopes?: string | null
          id?: string
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          sync_progress?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_library: {
        Row: {
          created_at: string
          file_url: string | null
          id: string
          input_data: Json
          output_data: Json
          title: string
          tool_type: string
        }
        Insert: {
          created_at?: string
          file_url?: string | null
          id?: string
          input_data?: Json
          output_data?: Json
          title: string
          tool_type: string
        }
        Update: {
          created_at?: string
          file_url?: string | null
          id?: string
          input_data?: Json
          output_data?: Json
          title?: string
          tool_type?: string
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      assessment_leads: {
        Row: {
          answers: Json
          company: string | null
          created_at: string
          email: string
          id: string
          name: string | null
          score: number
        }
        Insert: {
          answers?: Json
          company?: string | null
          created_at?: string
          email: string
          id?: string
          name?: string | null
          score?: number
        }
        Update: {
          answers?: Json
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          score?: number
        }
        Relationships: []
      }
      assistant_actions: {
        Row: {
          account_id: string
          affected_count: number | null
          after_state: Json | null
          args: Json
          before_state: Json | null
          conversation_id: string | null
          created_at: string
          error_message: string | null
          executed_at: string | null
          id: string
          message_id: string | null
          status: string
          tool_name: string
          undone_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          affected_count?: number | null
          after_state?: Json | null
          args?: Json
          before_state?: Json | null
          conversation_id?: string | null
          created_at?: string
          error_message?: string | null
          executed_at?: string | null
          id?: string
          message_id?: string | null
          status?: string
          tool_name: string
          undone_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          affected_count?: number | null
          after_state?: Json | null
          args?: Json
          before_state?: Json | null
          conversation_id?: string | null
          created_at?: string
          error_message?: string | null
          executed_at?: string | null
          id?: string
          message_id?: string | null
          status?: string
          tool_name?: string
          undone_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_actions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_actions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "assistant_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_actions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "assistant_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_conversations: {
        Row: {
          account_id: string
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_conversations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          name: string | null
          role: string
          tool_call_id: string | null
          tool_calls: Json | null
        }
        Insert: {
          content?: string
          conversation_id: string
          created_at?: string
          id?: string
          name?: string | null
          role: string
          tool_call_id?: string | null
          tool_calls?: Json | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          name?: string | null
          role?: string
          tool_call_id?: string | null
          tool_calls?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "assistant_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "assistant_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_ai_cache: {
        Row: {
          cache_key: string
          created_at: string
          expires_at: string
          model: string
          response: Json
          stage: string
        }
        Insert: {
          cache_key: string
          created_at?: string
          expires_at?: string
          model: string
          response: Json
          stage: string
        }
        Update: {
          cache_key?: string
          created_at?: string
          expires_at?: string
          model?: string
          response?: Json
          stage?: string
        }
        Relationships: []
      }
      audit_code_proposals: {
        Row: {
          audit_run_id: string | null
          created_at: string
          diagnosis: string
          id: string
          proposed_change: string
          reviewed_by: string | null
          status: string
          target_file: string
          title: string
        }
        Insert: {
          audit_run_id?: string | null
          created_at?: string
          diagnosis: string
          id?: string
          proposed_change: string
          reviewed_by?: string | null
          status?: string
          target_file: string
          title: string
        }
        Update: {
          audit_run_id?: string | null
          created_at?: string
          diagnosis?: string
          id?: string
          proposed_change?: string
          reviewed_by?: string | null
          status?: string
          target_file?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_code_proposals_audit_run_id_fkey"
            columns: ["audit_run_id"]
            isOneToOne: false
            referencedRelation: "audit_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_run_metrics: {
        Row: {
          account_id: string
          ai_call_count: number
          ai_error_count: number
          ai_total_ms: number
          audit_run_id: string
          bottleneck_stage: string | null
          created_at: string
          health_score: number
          id: string
          patterns_with_zero_findings: number
          stage_timings: Json
          total_ms: number
          total_patterns: number
        }
        Insert: {
          account_id: string
          ai_call_count?: number
          ai_error_count?: number
          ai_total_ms?: number
          audit_run_id: string
          bottleneck_stage?: string | null
          created_at?: string
          health_score?: number
          id?: string
          patterns_with_zero_findings?: number
          stage_timings?: Json
          total_ms?: number
          total_patterns?: number
        }
        Update: {
          account_id?: string
          ai_call_count?: number
          ai_error_count?: number
          ai_total_ms?: number
          audit_run_id?: string
          bottleneck_stage?: string | null
          created_at?: string
          health_score?: number
          id?: string
          patterns_with_zero_findings?: number
          stage_timings?: Json
          total_ms?: number
          total_patterns?: number
        }
        Relationships: [
          {
            foreignKeyName: "audit_run_metrics_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_run_metrics_audit_run_id_fkey"
            columns: ["audit_run_id"]
            isOneToOne: false
            referencedRelation: "audit_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_runs: {
        Row: {
          account_id: string
          completed_at: string | null
          created_at: string
          current_stage: string | null
          deleted_at: string | null
          error_message: string | null
          findings_count: number | null
          id: string
          progress: Json
          report: Json
          started_at: string
          status: string
          total_exposure_cents: number | null
          updated_at: string
        }
        Insert: {
          account_id: string
          completed_at?: string | null
          created_at?: string
          current_stage?: string | null
          deleted_at?: string | null
          error_message?: string | null
          findings_count?: number | null
          id?: string
          progress?: Json
          report?: Json
          started_at?: string
          status?: string
          total_exposure_cents?: number | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          completed_at?: string | null
          created_at?: string
          current_stage?: string | null
          deleted_at?: string | null
          error_message?: string | null
          findings_count?: number | null
          id?: string
          progress?: Json
          report?: Json
          started_at?: string
          status?: string
          total_exposure_cents?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_runs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_tuning_config: {
        Row: {
          auto_apply_enabled: boolean
          dead_lead_days: number
          diagnostics_model: string
          diagnostics_parallelism: number
          enabled_patterns: Json
          high_intent_min_engagements: number
          high_value_deal_min: number
          id: number
          owner_overload_multiplier: number
          reactivation_min_amount: number
          reactivation_window_max_days: number
          reactivation_window_min_days: number
          recommendations_model: string
          self_analysis_enabled: boolean
          self_analysis_model: string
          slow_followup_hours: number
          stalled_multiplier: number
          stuck_proposal_days: number
          summary_model: string
          updated_at: string
        }
        Insert: {
          auto_apply_enabled?: boolean
          dead_lead_days?: number
          diagnostics_model?: string
          diagnostics_parallelism?: number
          enabled_patterns?: Json
          high_intent_min_engagements?: number
          high_value_deal_min?: number
          id?: number
          owner_overload_multiplier?: number
          reactivation_min_amount?: number
          reactivation_window_max_days?: number
          reactivation_window_min_days?: number
          recommendations_model?: string
          self_analysis_enabled?: boolean
          self_analysis_model?: string
          slow_followup_hours?: number
          stalled_multiplier?: number
          stuck_proposal_days?: number
          summary_model?: string
          updated_at?: string
        }
        Update: {
          auto_apply_enabled?: boolean
          dead_lead_days?: number
          diagnostics_model?: string
          diagnostics_parallelism?: number
          enabled_patterns?: Json
          high_intent_min_engagements?: number
          high_value_deal_min?: number
          id?: number
          owner_overload_multiplier?: number
          reactivation_min_amount?: number
          reactivation_window_max_days?: number
          reactivation_window_min_days?: number
          recommendations_model?: string
          self_analysis_enabled?: boolean
          self_analysis_model?: string
          slow_followup_hours?: number
          stalled_multiplier?: number
          stuck_proposal_days?: number
          summary_model?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_tuning_proposals: {
        Row: {
          applied_at: string | null
          audit_run_id: string | null
          confidence: number
          created_at: string
          current_value: Json
          expected_impact: string | null
          field: string
          id: string
          proposed_value: Json
          reason: string
          reviewed_by: string | null
          status: string
        }
        Insert: {
          applied_at?: string | null
          audit_run_id?: string | null
          confidence?: number
          created_at?: string
          current_value: Json
          expected_impact?: string | null
          field: string
          id?: string
          proposed_value: Json
          reason: string
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          applied_at?: string | null
          audit_run_id?: string | null
          confidence?: number
          created_at?: string
          current_value?: Json
          expected_impact?: string | null
          field?: string
          id?: string
          proposed_value?: Json
          reason?: string
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_tuning_proposals_audit_run_id_fkey"
            columns: ["audit_run_id"]
            isOneToOne: false
            referencedRelation: "audit_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author: string
          content: string
          created_at: string
          excerpt: string
          featured_image: string | null
          id: string
          is_published: boolean
          location_focus: string | null
          meta_description: string | null
          published_at: string | null
          slug: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          author?: string
          content: string
          created_at?: string
          excerpt: string
          featured_image?: string | null
          id?: string
          is_published?: boolean
          location_focus?: string | null
          meta_description?: string | null
          published_at?: string | null
          slug: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          author?: string
          content?: string
          created_at?: string
          excerpt?: string
          featured_image?: string | null
          id?: string
          is_published?: boolean
          location_focus?: string | null
          meta_description?: string | null
          published_at?: string | null
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      campaign_assets: {
        Row: {
          created_at: string
          id: string
          is_attached: boolean
          metadata: Json
          name: string
          type: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_attached?: boolean
          metadata?: Json
          name: string
          type: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          is_attached?: boolean
          metadata?: Json
          name?: string
          type?: string
          url?: string
        }
        Relationships: []
      }
      campaign_settings: {
        Row: {
          daily_limit: number
          default_links: Json
          from_email: string
          from_name: string
          id: number
          is_active: boolean
          signature_html: string
          updated_at: string
        }
        Insert: {
          daily_limit?: number
          default_links?: Json
          from_email?: string
          from_name?: string
          id?: number
          is_active?: boolean
          signature_html?: string
          updated_at?: string
        }
        Update: {
          daily_limit?: number
          default_links?: Json
          from_email?: string
          from_name?: string
          id?: number
          is_active?: boolean
          signature_html?: string
          updated_at?: string
        }
        Relationships: []
      }
      claim_codes: {
        Row: {
          code: string
          contacted_at: string | null
          converted_at: string | null
          created_at: string
          email_clicked_at: string | null
          generated_at: string
          id: string
          notes: string | null
          pricing_tier: string | null
          status: Database["public"]["Enums"]["claim_status"]
          updated_at: string
        }
        Insert: {
          code: string
          contacted_at?: string | null
          converted_at?: string | null
          created_at?: string
          email_clicked_at?: string | null
          generated_at?: string
          id?: string
          notes?: string | null
          pricing_tier?: string | null
          status?: Database["public"]["Enums"]["claim_status"]
          updated_at?: string
        }
        Update: {
          code?: string
          contacted_at?: string | null
          converted_at?: string | null
          created_at?: string
          email_clicked_at?: string | null
          generated_at?: string
          id?: string
          notes?: string | null
          pricing_tier?: string | null
          status?: Database["public"]["Enums"]["claim_status"]
          updated_at?: string
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          company: string | null
          created_at: string
          email: string
          id: string
          is_read: boolean
          message: string
          name: string
          phone: string | null
          service_interest: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          id?: string
          is_read?: boolean
          message: string
          name: string
          phone?: string | null
          service_interest?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          is_read?: boolean
          message?: string
          name?: string
          phone?: string | null
          service_interest?: string | null
        }
        Relationships: []
      }
      content_engine_posts: {
        Row: {
          caption: string
          created_at: string
          format: string
          generated_at: string
          hashtags: string[]
          hook: string
          id: string
          scheduled_date: string
          scheduled_time: string
          script: string
          status: string
          target_emotion: string | null
          thumbnail_generated_at: string | null
          thumbnail_reference_id: string | null
          thumbnail_status: string
          thumbnail_url: string | null
          topic_angle: string
          updated_at: string
        }
        Insert: {
          caption?: string
          created_at?: string
          format: string
          generated_at?: string
          hashtags?: string[]
          hook?: string
          id?: string
          scheduled_date: string
          scheduled_time?: string
          script?: string
          status?: string
          target_emotion?: string | null
          thumbnail_generated_at?: string | null
          thumbnail_reference_id?: string | null
          thumbnail_status?: string
          thumbnail_url?: string | null
          topic_angle?: string
          updated_at?: string
        }
        Update: {
          caption?: string
          created_at?: string
          format?: string
          generated_at?: string
          hashtags?: string[]
          hook?: string
          id?: string
          scheduled_date?: string
          scheduled_time?: string
          script?: string
          status?: string
          target_emotion?: string | null
          thumbnail_generated_at?: string | null
          thumbnail_reference_id?: string | null
          thumbnail_status?: string
          thumbnail_url?: string | null
          topic_angle?: string
          updated_at?: string
        }
        Relationships: []
      }
      content_engine_strategy: {
        Row: {
          business_description: string
          created_at: string
          cta_link: string
          format_mix: Json
          frequency: string
          goals: string[]
          id: string
          niche: string
          posting_days: string[]
          posting_times: string[]
          target_buyer: string
          updated_at: string
          voice_reference: string
        }
        Insert: {
          business_description?: string
          created_at?: string
          cta_link?: string
          format_mix?: Json
          frequency?: string
          goals?: string[]
          id?: string
          niche?: string
          posting_days?: string[]
          posting_times?: string[]
          target_buyer?: string
          updated_at?: string
          voice_reference?: string
        }
        Update: {
          business_description?: string
          created_at?: string
          cta_link?: string
          format_mix?: Json
          frequency?: string
          goals?: string[]
          id?: string
          niche?: string
          posting_days?: string[]
          posting_times?: string[]
          target_buyer?: string
          updated_at?: string
          voice_reference?: string
        }
        Relationships: []
      }
      content_posting_schedule: {
        Row: {
          content_type: string
          created_at: string
          day_name: string
          day_of_week: number
          id: string
          notes: string | null
          post_time: string | null
          strategic_goal: string | null
          updated_at: string
        }
        Insert: {
          content_type: string
          created_at?: string
          day_name: string
          day_of_week: number
          id?: string
          notes?: string | null
          post_time?: string | null
          strategic_goal?: string | null
          updated_at?: string
        }
        Update: {
          content_type?: string
          created_at?: string
          day_name?: string
          day_of_week?: number
          id?: string
          notes?: string | null
          post_time?: string | null
          strategic_goal?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      content_sync_log: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          id: string
          outlook_message_id: string | null
          synced_at: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          id?: string
          outlook_message_id?: string | null
          synced_at?: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          id?: string
          outlook_message_id?: string | null
          synced_at?: string
        }
        Relationships: []
      }
      crm_companies: {
        Row: {
          created_at: string
          id: string
          industry: string | null
          location: string | null
          name: string
          notes: string | null
          size: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          industry?: string | null
          location?: string | null
          name: string
          notes?: string | null
          size?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          industry?: string | null
          location?: string | null
          name?: string
          notes?: string | null
          size?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      crm_contacts: {
        Row: {
          company_id: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          notes: string | null
          owner: string | null
          phone: string | null
          source: string | null
          tags: string[] | null
          title: string | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          owner?: string | null
          phone?: string | null
          source?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          owner?: string | null
          phone?: string | null
          source?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_deals: {
        Row: {
          company_id: string | null
          contact_id: string | null
          created_at: string
          currency: string
          expected_close_date: string | null
          id: string
          notes: string | null
          position: number
          stage: Database["public"]["Enums"]["crm_deal_stage"]
          title: string
          updated_at: string
          value_cents: number
        }
        Insert: {
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          currency?: string
          expected_close_date?: string | null
          id?: string
          notes?: string | null
          position?: number
          stage?: Database["public"]["Enums"]["crm_deal_stage"]
          title: string
          updated_at?: string
          value_cents?: number
        }
        Update: {
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          currency?: string
          expected_close_date?: string | null
          id?: string
          notes?: string | null
          position?: number
          stage?: Database["public"]["Enums"]["crm_deal_stage"]
          title?: string
          updated_at?: string
          value_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_deals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_demo_data: {
        Row: {
          data: Json
          id: number
          updated_at: string
        }
        Insert: {
          data?: Json
          id?: number
          updated_at?: string
        }
        Update: {
          data?: Json
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      crm_interactions: {
        Row: {
          body: string | null
          contact_id: string | null
          created_at: string
          deal_id: string | null
          id: string
          metadata: Json
          occurred_at: string
          subject: string | null
          type: Database["public"]["Enums"]["crm_interaction_type"]
        }
        Insert: {
          body?: string | null
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          id?: string
          metadata?: Json
          occurred_at?: string
          subject?: string | null
          type?: Database["public"]["Enums"]["crm_interaction_type"]
        }
        Update: {
          body?: string | null
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          id?: string
          metadata?: Json
          occurred_at?: string
          subject?: string | null
          type?: Database["public"]["Enums"]["crm_interaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "crm_interactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_interactions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostic_leads: {
        Row: {
          answers: Json
          category_scores: Json
          company: string | null
          company_size: string | null
          created_at: string
          email: string
          id: string
          industry: string | null
          name: string | null
          scores: Json
          total_score: number
        }
        Insert: {
          answers?: Json
          category_scores?: Json
          company?: string | null
          company_size?: string | null
          created_at?: string
          email: string
          id?: string
          industry?: string | null
          name?: string | null
          scores?: Json
          total_score?: number
        }
        Update: {
          answers?: Json
          category_scores?: Json
          company?: string | null
          company_size?: string | null
          created_at?: string
          email?: string
          id?: string
          industry?: string | null
          name?: string | null
          scores?: Json
          total_score?: number
        }
        Relationships: []
      }
      drip_emails: {
        Row: {
          attempt_count: number
          body_html: string | null
          created_at: string
          error_message: string | null
          id: string
          outlook_message_id: string | null
          prospect_id: string
          scheduled_for: string
          sent_at: string | null
          sequence_id: string
          status: string
          step_index: number
          subject: string | null
        }
        Insert: {
          attempt_count?: number
          body_html?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          outlook_message_id?: string | null
          prospect_id: string
          scheduled_for: string
          sent_at?: string | null
          sequence_id: string
          status?: string
          step_index?: number
          subject?: string | null
        }
        Update: {
          attempt_count?: number
          body_html?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          outlook_message_id?: string | null
          prospect_id?: string
          scheduled_for?: string
          sent_at?: string | null
          sequence_id?: string
          status?: string
          step_index?: number
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drip_emails_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "drip_prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drip_emails_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "drip_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      drip_prospects: {
        Row: {
          business_name: string | null
          created_at: string
          email: string
          id: string
          industry: string | null
          location: string | null
          scraped_data: Json
          source_url: string | null
          status: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          business_name?: string | null
          created_at?: string
          email: string
          id?: string
          industry?: string | null
          location?: string | null
          scraped_data?: Json
          source_url?: string | null
          status?: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          business_name?: string | null
          created_at?: string
          email?: string
          id?: string
          industry?: string | null
          location?: string | null
          scraped_data?: Json
          source_url?: string | null
          status?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      drip_sequences: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          steps: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          steps?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          steps?: Json
          updated_at?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      generated_playbooks: {
        Row: {
          created_at: string
          file_url: string | null
          id: string
          status: string
          stripe_session_id: string | null
          topic_data: Json
          topic_title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_url?: string | null
          id?: string
          status?: string
          stripe_session_id?: string | null
          topic_data?: Json
          topic_title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_url?: string | null
          id?: string
          status?: string
          stripe_session_id?: string | null
          topic_data?: Json
          topic_title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      hygiene_actions: {
        Row: {
          account_id: string
          affected_count: number
          affected_record_ids: string[]
          approval_mode: string
          approved_at: string | null
          category: string
          category_label: string
          confidence: string
          created_at: string
          error_message: string | null
          executed_at: string | null
          id: string
          progress: Json
          recommended_action: Json
          risk_level: string
          scan_id: string
          severity: string
          status: string
          updated_at: string
        }
        Insert: {
          account_id: string
          affected_count?: number
          affected_record_ids?: string[]
          approval_mode?: string
          approved_at?: string | null
          category: string
          category_label?: string
          confidence?: string
          created_at?: string
          error_message?: string | null
          executed_at?: string | null
          id?: string
          progress?: Json
          recommended_action?: Json
          risk_level?: string
          scan_id: string
          severity?: string
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          affected_count?: number
          affected_record_ids?: string[]
          approval_mode?: string
          approved_at?: string | null
          category?: string
          category_label?: string
          confidence?: string
          created_at?: string
          error_message?: string | null
          executed_at?: string | null
          id?: string
          progress?: Json
          recommended_action?: Json
          risk_level?: string
          scan_id?: string
          severity?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hygiene_actions_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "hygiene_scans"
            referencedColumns: ["id"]
          },
        ]
      }
      hygiene_log: {
        Row: {
          account_id: string
          action_id: string
          after_value: Json
          before_value: Json
          error_message: string | null
          executed_at: string
          field_changes: Json
          hubspot_object_id: string
          hubspot_object_type: string
          id: string
          rolled_back_at: string | null
          success: boolean
        }
        Insert: {
          account_id: string
          action_id: string
          after_value?: Json
          before_value?: Json
          error_message?: string | null
          executed_at?: string
          field_changes?: Json
          hubspot_object_id: string
          hubspot_object_type: string
          id?: string
          rolled_back_at?: string | null
          success?: boolean
        }
        Update: {
          account_id?: string
          action_id?: string
          after_value?: Json
          before_value?: Json
          error_message?: string | null
          executed_at?: string
          field_changes?: Json
          hubspot_object_id?: string
          hubspot_object_type?: string
          id?: string
          rolled_back_at?: string | null
          success?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "hygiene_log_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "hygiene_actions"
            referencedColumns: ["id"]
          },
        ]
      }
      hygiene_scans: {
        Row: {
          account_id: string
          ai_status: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          results: Json
          scan_date: string
          status: string
          total_issues: number
          totals_by_category: Json
          updated_at: string
        }
        Insert: {
          account_id: string
          ai_status?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          results?: Json
          scan_date?: string
          status?: string
          total_issues?: number
          totals_by_category?: Json
          updated_at?: string
        }
        Update: {
          account_id?: string
          ai_status?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          results?: Json
          scan_date?: string
          status?: string
          total_issues?: number
          totals_by_category?: Json
          updated_at?: string
        }
        Relationships: []
      }
      hygiene_settings: {
        Row: {
          account_id: string
          allow_auto_high_conf: boolean
          created_at: string
          enable_enrichment: boolean
          max_batch_size: number
          pause_threshold_pct: number
          require_approval: boolean
          updated_at: string
        }
        Insert: {
          account_id: string
          allow_auto_high_conf?: boolean
          created_at?: string
          enable_enrichment?: boolean
          max_batch_size?: number
          pause_threshold_pct?: number
          require_approval?: boolean
          updated_at?: string
        }
        Update: {
          account_id?: string
          allow_auto_high_conf?: boolean
          created_at?: string
          enable_enrichment?: boolean
          max_batch_size?: number
          pause_threshold_pct?: number
          require_approval?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      identified_visitors: {
        Row: {
          added_to_crm: boolean
          company_domain: string | null
          company_name: string | null
          created_at: string
          id: string
          last_seen_at: string
          location: string | null
          pages_viewed: Json
          person_email: string | null
          person_linkedin_url: string | null
          person_name: string | null
          raw_payload: Json
          title: string | null
          updated_at: string
        }
        Insert: {
          added_to_crm?: boolean
          company_domain?: string | null
          company_name?: string | null
          created_at?: string
          id?: string
          last_seen_at?: string
          location?: string | null
          pages_viewed?: Json
          person_email?: string | null
          person_linkedin_url?: string | null
          person_name?: string | null
          raw_payload?: Json
          title?: string | null
          updated_at?: string
        }
        Update: {
          added_to_crm?: boolean
          company_domain?: string | null
          company_name?: string | null
          created_at?: string
          id?: string
          last_seen_at?: string
          location?: string | null
          pages_viewed?: Json
          person_email?: string | null
          person_linkedin_url?: string | null
          person_name?: string | null
          raw_payload?: Json
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      linkedin_post_queue: {
        Row: {
          content: string
          created_at: string
          format: string | null
          id: string
          linkedin_post_id: string | null
          posted_at: string | null
          scheduled_for: string | null
          source_id: string | null
          source_type: string | null
          status: string
        }
        Insert: {
          content: string
          created_at?: string
          format?: string | null
          id?: string
          linkedin_post_id?: string | null
          posted_at?: string | null
          scheduled_for?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
        }
        Update: {
          content?: string
          created_at?: string
          format?: string | null
          id?: string
          linkedin_post_id?: string | null
          posted_at?: string | null
          scheduled_for?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
        }
        Relationships: []
      }
      linkedin_tokens: {
        Row: {
          access_token: string | null
          expires_at: string | null
          id: number
          linkedin_person_urn: string | null
          refresh_token: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          expires_at?: string | null
          id?: number
          linkedin_person_urn?: string | null
          refresh_token?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          expires_at?: string | null
          id?: number
          linkedin_person_urn?: string | null
          refresh_token?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      mirror_companies: {
        Row: {
          account_id: string
          annual_revenue: number | null
          created_date: string | null
          domain: string | null
          hubspot_id: string
          id: string
          industry: string | null
          last_activity_date: string | null
          name: string | null
          num_employees: number | null
          owner_id: string | null
          properties: Json | null
          synced_at: string
        }
        Insert: {
          account_id: string
          annual_revenue?: number | null
          created_date?: string | null
          domain?: string | null
          hubspot_id: string
          id?: string
          industry?: string | null
          last_activity_date?: string | null
          name?: string | null
          num_employees?: number | null
          owner_id?: string | null
          properties?: Json | null
          synced_at?: string
        }
        Update: {
          account_id?: string
          annual_revenue?: number | null
          created_date?: string | null
          domain?: string | null
          hubspot_id?: string
          id?: string
          industry?: string | null
          last_activity_date?: string | null
          name?: string | null
          num_employees?: number | null
          owner_id?: string | null
          properties?: Json | null
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mirror_companies_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      mirror_contacts: {
        Row: {
          account_id: string
          created_date: string | null
          email: string | null
          first_name: string | null
          hubspot_id: string
          id: string
          last_activity_date: string | null
          last_name: string | null
          lead_status: string | null
          lifecycle_stage: string | null
          owner_id: string | null
          properties: Json
          synced_at: string
        }
        Insert: {
          account_id: string
          created_date?: string | null
          email?: string | null
          first_name?: string | null
          hubspot_id: string
          id?: string
          last_activity_date?: string | null
          last_name?: string | null
          lead_status?: string | null
          lifecycle_stage?: string | null
          owner_id?: string | null
          properties?: Json
          synced_at?: string
        }
        Update: {
          account_id?: string
          created_date?: string | null
          email?: string | null
          first_name?: string | null
          hubspot_id?: string
          id?: string
          last_activity_date?: string | null
          last_name?: string | null
          lead_status?: string | null
          lifecycle_stage?: string | null
          owner_id?: string | null
          properties?: Json
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mirror_contacts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      mirror_deal_companies: {
        Row: {
          account_id: string
          company_id: string
          deal_id: string
          synced_at: string
        }
        Insert: {
          account_id: string
          company_id: string
          deal_id: string
          synced_at?: string
        }
        Update: {
          account_id?: string
          company_id?: string
          deal_id?: string
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mirror_deal_companies_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      mirror_deal_contacts: {
        Row: {
          account_id: string
          contact_id: string
          deal_id: string
          synced_at: string
        }
        Insert: {
          account_id: string
          contact_id: string
          deal_id: string
          synced_at?: string
        }
        Update: {
          account_id?: string
          contact_id?: string
          deal_id?: string
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mirror_deal_contacts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      mirror_deals: {
        Row: {
          account_id: string
          amount: number | null
          close_date: string | null
          created_date: string | null
          days_in_current_stage: number | null
          deal_name: string | null
          hubspot_id: string
          id: string
          last_activity_date: string | null
          owner_id: string | null
          pipeline: string | null
          properties: Json
          stage: string | null
          synced_at: string
        }
        Insert: {
          account_id: string
          amount?: number | null
          close_date?: string | null
          created_date?: string | null
          days_in_current_stage?: number | null
          deal_name?: string | null
          hubspot_id: string
          id?: string
          last_activity_date?: string | null
          owner_id?: string | null
          pipeline?: string | null
          properties?: Json
          stage?: string | null
          synced_at?: string
        }
        Update: {
          account_id?: string
          amount?: number | null
          close_date?: string | null
          created_date?: string | null
          days_in_current_stage?: number | null
          deal_name?: string | null
          hubspot_id?: string
          id?: string
          last_activity_date?: string | null
          owner_id?: string | null
          pipeline?: string | null
          properties?: Json
          stage?: string | null
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mirror_deals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      mirror_engagements: {
        Row: {
          account_id: string
          contact_id: string | null
          deal_id: string | null
          hubspot_id: string
          id: string
          properties: Json
          synced_at: string
          timestamp: string | null
          type: string
        }
        Insert: {
          account_id: string
          contact_id?: string | null
          deal_id?: string | null
          hubspot_id: string
          id?: string
          properties?: Json
          synced_at?: string
          timestamp?: string | null
          type: string
        }
        Update: {
          account_id?: string
          contact_id?: string | null
          deal_id?: string | null
          hubspot_id?: string
          id?: string
          properties?: Json
          synced_at?: string
          timestamp?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "mirror_engagements_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      mirror_owners: {
        Row: {
          account_id: string
          email: string | null
          first_name: string | null
          hubspot_id: string
          id: string
          last_name: string | null
          synced_at: string
        }
        Insert: {
          account_id: string
          email?: string | null
          first_name?: string | null
          hubspot_id: string
          id?: string
          last_name?: string | null
          synced_at?: string
        }
        Update: {
          account_id?: string
          email?: string | null
          first_name?: string | null
          hubspot_id?: string
          id?: string
          last_name?: string | null
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mirror_owners_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_headshots: {
        Row: {
          created_at: string
          disabled: boolean
          id: string
          is_default: boolean
          label: string
          public_url: string
          sort_order: number
          storage_path: string
          tag: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          disabled?: boolean
          id?: string
          is_default?: boolean
          label?: string
          public_url: string
          sort_order?: number
          storage_path: string
          tag: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          disabled?: boolean
          id?: string
          is_default?: boolean
          label?: string
          public_url?: string
          sort_order?: number
          storage_path?: string
          tag?: string
          updated_at?: string
        }
        Relationships: []
      }
      pattern_results: {
        Row: {
          account_id: string
          audit_run_id: string
          created_at: string
          exposure_cents: number
          formula: string | null
          id: string
          pattern_key: string
          pattern_label: string
          raw_data: Json
          record_count: number
          sample_ids: Json
          time_period: string | null
        }
        Insert: {
          account_id: string
          audit_run_id: string
          created_at?: string
          exposure_cents?: number
          formula?: string | null
          id?: string
          pattern_key: string
          pattern_label: string
          raw_data?: Json
          record_count?: number
          sample_ids?: Json
          time_period?: string | null
        }
        Update: {
          account_id?: string
          audit_run_id?: string
          created_at?: string
          exposure_cents?: number
          formula?: string | null
          id?: string
          pattern_key?: string
          pattern_label?: string
          raw_data?: Json
          record_count?: number
          sample_ids?: Json
          time_period?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pattern_results_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pattern_results_audit_run_id_fkey"
            columns: ["audit_run_id"]
            isOneToOne: false
            referencedRelation: "audit_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_actions: {
        Row: {
          account_id: string
          action_type: string
          approved_at: string | null
          audit_run_id: string | null
          created_at: string
          error_message: string | null
          executed_at: string | null
          finding_key: string
          id: string
          payload: Json
          status: string
          updated_at: string
        }
        Insert: {
          account_id: string
          action_type: string
          approved_at?: string | null
          audit_run_id?: string | null
          created_at?: string
          error_message?: string | null
          executed_at?: string | null
          finding_key: string
          id?: string
          payload?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          action_type?: string
          approved_at?: string | null
          audit_run_id?: string | null
          created_at?: string
          error_message?: string | null
          executed_at?: string | null
          finding_key?: string
          id?: string
          payload?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_actions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_actions_audit_run_id_fkey"
            columns: ["audit_run_id"]
            isOneToOne: false
            referencedRelation: "audit_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      playbooks: {
        Row: {
          created_at: string
          description: string
          file_url: string
          icon_name: string | null
          id: string
          published_at: string | null
          subtitle: string | null
          tags: string[] | null
          title: string
        }
        Insert: {
          created_at?: string
          description: string
          file_url: string
          icon_name?: string | null
          id?: string
          published_at?: string | null
          subtitle?: string | null
          tags?: string[] | null
          title: string
        }
        Update: {
          created_at?: string
          description?: string
          file_url?: string
          icon_name?: string | null
          id?: string
          published_at?: string | null
          subtitle?: string | null
          tags?: string[] | null
          title?: string
        }
        Relationships: []
      }
      prerender_cache: {
        Row: {
          etag: string
          generated_at: string
          html: string
          route: string
        }
        Insert: {
          etag: string
          generated_at?: string
          html: string
          route: string
        }
        Update: {
          etag?: string
          generated_at?: string
          html?: string
          route?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      purchase_deliverables: {
        Row: {
          created_at: string
          email: string
          error_message: string | null
          file_url: string | null
          id: string
          input_data: Json
          output_data: Json
          price_id: string
          purchase_id: string | null
          status: string
          stripe_session_id: string
          tool_type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          error_message?: string | null
          file_url?: string | null
          id?: string
          input_data?: Json
          output_data?: Json
          price_id: string
          purchase_id?: string | null
          status?: string
          stripe_session_id: string
          tool_type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          error_message?: string | null
          file_url?: string | null
          id?: string
          input_data?: Json
          output_data?: Json
          price_id?: string
          purchase_id?: string | null
          status?: string
          stripe_session_id?: string
          tool_type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_deliverables_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          amount_total: number | null
          created_at: string | null
          currency: string | null
          email: string | null
          environment: string
          id: string
          metadata: Json | null
          rep_code: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_session_id: string
          user_id: string | null
        }
        Insert: {
          amount_total?: number | null
          created_at?: string | null
          currency?: string | null
          email?: string | null
          environment?: string
          id?: string
          metadata?: Json | null
          rep_code?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_session_id: string
          user_id?: string | null
        }
        Update: {
          amount_total?: number | null
          created_at?: string | null
          currency?: string | null
          email?: string | null
          environment?: string
          id?: string
          metadata?: Json | null
          rep_code?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_session_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      rep_codes: {
        Row: {
          code: string
          commission_rate: number
          created_at: string
          id: string
          is_active: boolean
          rep_email: string | null
          rep_name: string
          role: string
          total_commission_cents: number
          total_sales_cents: number
        }
        Insert: {
          code: string
          commission_rate?: number
          created_at?: string
          id?: string
          is_active?: boolean
          rep_email?: string | null
          rep_name?: string
          role?: string
          total_commission_cents?: number
          total_sales_cents?: number
        }
        Update: {
          code?: string
          commission_rate?: number
          created_at?: string
          id?: string
          is_active?: boolean
          rep_email?: string | null
          rep_name?: string
          role?: string
          total_commission_cents?: number
          total_sales_cents?: number
        }
        Relationships: []
      }
      rep_signups: {
        Row: {
          created_at: string
          email: string
          experience: string | null
          id: string
          linkedin_url: string | null
          name: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          email: string
          experience?: string | null
          id?: string
          linkedin_url?: string | null
          name: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          experience?: string | null
          id?: string
          linkedin_url?: string | null
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      retargeting_settings: {
        Row: {
          enabled: boolean
          google_ads_id: string | null
          id: number
          linkedin_partner_id: string | null
          meta_pixel_id: string | null
          rb2b_script_id: string | null
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          google_ads_id?: string | null
          id?: number
          linkedin_partner_id?: string | null
          meta_pixel_id?: string | null
          rb2b_script_id?: string | null
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          google_ads_id?: string | null
          id?: number
          linkedin_partner_id?: string | null
          meta_pixel_id?: string | null
          rb2b_script_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      scan_purchases: {
        Row: {
          created_at: string
          id: string
          scan_id: string | null
          stripe_session_id: string | null
          tier: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          scan_id?: string | null
          stripe_session_id?: string | null
          tier: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          scan_id?: string | null
          stripe_session_id?: string | null
          tier?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scan_purchases_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "website_scans"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_optimization_log: {
        Row: {
          after: Json | null
          ai_reasoning: string | null
          before: Json | null
          id: string
          route: string
          run_at: string
          run_type: string
          score_after: number | null
          score_before: number | null
          status: string
          trends_used: Json | null
        }
        Insert: {
          after?: Json | null
          ai_reasoning?: string | null
          before?: Json | null
          id?: string
          route: string
          run_at?: string
          run_type?: string
          score_after?: number | null
          score_before?: number | null
          status?: string
          trends_used?: Json | null
        }
        Update: {
          after?: Json | null
          ai_reasoning?: string | null
          before?: Json | null
          id?: string
          route?: string
          run_at?: string
          run_type?: string
          score_after?: number | null
          score_before?: number | null
          status?: string
          trends_used?: Json | null
        }
        Relationships: []
      }
      seo_overrides: {
        Row: {
          applied_at: string
          created_at: string
          description: string | null
          faqs: Json | null
          id: string
          keywords: string | null
          path: string
          title: string | null
          tldr: string | null
          version: number
        }
        Insert: {
          applied_at?: string
          created_at?: string
          description?: string | null
          faqs?: Json | null
          id?: string
          keywords?: string | null
          path: string
          title?: string | null
          tldr?: string | null
          version?: number
        }
        Update: {
          applied_at?: string
          created_at?: string
          description?: string | null
          faqs?: Json | null
          id?: string
          keywords?: string | null
          path?: string
          title?: string | null
          tldr?: string | null
          version?: number
        }
        Relationships: []
      }
      seo_trend_cache: {
        Row: {
          fetched_at: string
          id: string
          source: string | null
          topic: string
          trends: Json
        }
        Insert: {
          fetched_at?: string
          id?: string
          source?: string | null
          topic: string
          trends?: Json
        }
        Update: {
          fetched_at?: string
          id?: string
          source?: string | null
          topic?: string
          trends?: Json
        }
        Relationships: []
      }
      site_events: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          session_id: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          session_id: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          session_id?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      subscriber_feedback: {
        Row: {
          created_at: string
          delivery_id: string
          id: string
          notes: string | null
          rating: number
          user_id: string
        }
        Insert: {
          created_at?: string
          delivery_id: string
          id?: string
          notes?: string | null
          rating: number
          user_id: string
        }
        Update: {
          created_at?: string
          delivery_id?: string
          id?: string
          notes?: string | null
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriber_feedback_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "subscription_deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriber_profiles: {
        Row: {
          business_name: string | null
          created_at: string
          goals: string[] | null
          id: string
          industry: string | null
          notes: string | null
          subscription_id: string
          target_audience: string | null
          tone_preference: string | null
          updated_at: string
          user_id: string
          website_url: string | null
        }
        Insert: {
          business_name?: string | null
          created_at?: string
          goals?: string[] | null
          id?: string
          industry?: string | null
          notes?: string | null
          subscription_id: string
          target_audience?: string | null
          tone_preference?: string | null
          updated_at?: string
          user_id: string
          website_url?: string | null
        }
        Update: {
          business_name?: string | null
          created_at?: string
          goals?: string[] | null
          id?: string
          industry?: string | null
          notes?: string | null
          subscription_id?: string
          target_audience?: string | null
          tone_preference?: string | null
          updated_at?: string
          user_id?: string
          website_url?: string | null
        }
        Relationships: []
      }
      subscription_deliveries: {
        Row: {
          created_at: string
          delivery_date: string
          delivery_type: string
          feedback_score: number | null
          id: string
          output_data: Json
          stripe_invoice_id: string | null
          subscription_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delivery_date?: string
          delivery_type: string
          feedback_score?: number | null
          id?: string
          output_data?: Json
          stripe_invoice_id?: string | null
          subscription_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          delivery_date?: string
          delivery_type?: string
          feedback_score?: number | null
          id?: string
          output_data?: Json
          stripe_invoice_id?: string | null
          subscription_id?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          price_id: string
          product_id: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id: string
          product_id: string
          status?: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id?: string
          product_id?: string
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          avatar_url: string | null
          client_name: string
          company: string
          created_at: string
          id: string
          industry: string | null
          is_featured: boolean
          location: string | null
          quote: string
          rating: number
          role: string
        }
        Insert: {
          avatar_url?: string | null
          client_name: string
          company: string
          created_at?: string
          id?: string
          industry?: string | null
          is_featured?: boolean
          location?: string | null
          quote: string
          rating?: number
          role: string
        }
        Update: {
          avatar_url?: string | null
          client_name?: string
          company?: string
          created_at?: string
          id?: string
          industry?: string | null
          is_featured?: boolean
          location?: string | null
          quote?: string
          rating?: number
          role?: string
        }
        Relationships: []
      }
      thumbnail_generations: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          post_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          post_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          post_id?: string | null
          status?: string
        }
        Relationships: []
      }
      thumbnail_settings: {
        Row: {
          auto_generate_formats: string[]
          daily_cap: number
          default_quality: string
          id: number
          updated_at: string
        }
        Insert: {
          auto_generate_formats?: string[]
          daily_cap?: number
          default_quality?: string
          id?: number
          updated_at?: string
        }
        Update: {
          auto_generate_formats?: string[]
          daily_cap?: number
          default_quality?: string
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      tool_generations: {
        Row: {
          created_at: string
          id: string
          input_data: Json
          output_data: Json
          stripe_session_id: string | null
          tier: string
          tool_type: Database["public"]["Enums"]["tool_type"]
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          input_data?: Json
          output_data?: Json
          stripe_session_id?: string | null
          tier?: string
          tool_type: Database["public"]["Enums"]["tool_type"]
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          input_data?: Json
          output_data?: Json
          stripe_session_id?: string | null
          tier?: string
          tool_type?: Database["public"]["Enums"]["tool_type"]
          user_id?: string | null
        }
        Relationships: []
      }
      website_scans: {
        Row: {
          created_at: string
          gaps: Json
          id: string
          score: number
          url: string
        }
        Insert: {
          created_at?: string
          gaps?: Json
          id?: string
          score?: number
          url: string
        }
        Update: {
          created_at?: string
          gaps?: Json
          id?: string
          score?: number
          url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      decrypt_token: {
        Args: { _ciphertext: string; _key: string }
        Returns: string
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      detect_closed_lost_reactivation: {
        Args: {
          _account_id: string
          _max_days?: number
          _min_amount?: number
          _min_days?: number
        }
        Returns: Json
      }
      detect_dead_leads: {
        Args: { _account_id: string; _days?: number }
        Returns: Json
      }
      detect_high_intent_no_workflow: {
        Args: {
          _account_id: string
          _avg_deal_size?: number
          _min_engagements?: number
        }
        Returns: Json
      }
      detect_missing_contact_info: {
        Args: { _account_id: string; _min_amount?: number }
        Returns: Json
      }
      detect_owner_overload: {
        Args: { _account_id: string; _multiplier?: number }
        Returns: Json
      }
      detect_slow_followup: {
        Args: { _account_id: string; _avg_deal_size?: number; _hours?: number }
        Returns: Json
      }
      detect_stalled_deals: {
        Args: { _account_id: string; _multiplier?: number }
        Returns: Json
      }
      detect_stuck_proposal: {
        Args: { _account_id: string; _days?: number }
        Returns: Json
      }
      encrypt_token: {
        Args: { _key: string; _plaintext: string }
        Returns: string
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_avg_deal_size: { Args: { _account_id: string }; Returns: number }
      increment_rep_sales: {
        Args: { _code: string; _commission: number; _sales: number }
        Returns: undefined
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      promote_if_first_admin: { Args: { _user_id: string }; Returns: boolean }
      purge_expired_ai_cache: { Args: never; Returns: undefined }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      reset_stuck_hygiene_actions: {
        Args: { _stale_minutes?: number }
        Returns: number
      }
    }
    Enums: {
      claim_status:
        | "generated"
        | "email_clicked"
        | "contacted"
        | "converted"
        | "expired"
      crm_deal_stage: "lead" | "qualified" | "proposal" | "won" | "lost"
      crm_interaction_type:
        | "call"
        | "email"
        | "meeting"
        | "note"
        | "form"
        | "task"
      tool_type:
        | "social_content"
        | "sales_scripts"
        | "content_calendar"
        | "follow_up_plan"
        | "strategic_questions"
        | "brand_contradictions"
        | "friction_audit"
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
      claim_status: [
        "generated",
        "email_clicked",
        "contacted",
        "converted",
        "expired",
      ],
      crm_deal_stage: ["lead", "qualified", "proposal", "won", "lost"],
      crm_interaction_type: [
        "call",
        "email",
        "meeting",
        "note",
        "form",
        "task",
      ],
      tool_type: [
        "social_content",
        "sales_scripts",
        "content_calendar",
        "follow_up_plan",
        "strategic_questions",
        "brand_contradictions",
        "friction_audit",
      ],
    },
  },
} as const
