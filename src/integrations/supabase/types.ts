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
      purchases: {
        Row: {
          amount_total: number | null
          created_at: string | null
          currency: string | null
          email: string | null
          environment: string
          id: string
          metadata: Json | null
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
          status?: string | null
          stripe_customer_id?: string | null
          stripe_session_id?: string
          user_id?: string | null
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
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
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
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      claim_status:
        | "generated"
        | "email_clicked"
        | "contacted"
        | "converted"
        | "expired"
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
