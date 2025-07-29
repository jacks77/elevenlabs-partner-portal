export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      analytics_link_clicks: {
        Row: {
          created_at: string
          id: number
          link_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          link_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          link_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_link_clicks_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "links"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_page_views: {
        Row: {
          created_at: string
          id: number
          page: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          page?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          page?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          certification_tier: string | null
          commission_tier: string | null
          created_at: string
          first_closed_won: boolean | null
          first_lead_registered: boolean | null
          id: string
          is_in_onboarding: boolean | null
          kickoff_call_date: string | null
          lead_submission_url: string | null
          name: string
          partner_manager_id: string | null
          partner_salesforce_record: string | null
          slack_channel_url: string | null
          technical_enablement_date: string | null
          track: string | null
        }
        Insert: {
          certification_tier?: string | null
          commission_tier?: string | null
          created_at?: string
          first_closed_won?: boolean | null
          first_lead_registered?: boolean | null
          id?: string
          is_in_onboarding?: boolean | null
          kickoff_call_date?: string | null
          lead_submission_url?: string | null
          name: string
          partner_manager_id?: string | null
          partner_salesforce_record?: string | null
          slack_channel_url?: string | null
          technical_enablement_date?: string | null
          track?: string | null
        }
        Update: {
          certification_tier?: string | null
          commission_tier?: string | null
          created_at?: string
          first_closed_won?: boolean | null
          first_lead_registered?: boolean | null
          id?: string
          is_in_onboarding?: boolean | null
          kickoff_call_date?: string | null
          lead_submission_url?: string | null
          name?: string
          partner_manager_id?: string | null
          partner_salesforce_record?: string | null
          slack_channel_url?: string | null
          technical_enablement_date?: string | null
          track?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_partner_manager_id_fkey"
            columns: ["partner_manager_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string
          is_admin: boolean | null
          is_approved: boolean | null
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          is_admin?: boolean | null
          is_approved?: boolean | null
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          is_admin?: boolean | null
          is_approved?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          company_id: string | null
          created_at: string
          drive_file_id: string | null
          drive_url: string | null
          id: string
          tags: string[] | null
          title: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          drive_file_id?: string | null
          drive_url?: string | null
          id?: string
          tags?: string[] | null
          title?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          drive_file_id?: string | null
          drive_url?: string | null
          id?: string
          tags?: string[] | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      links: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          tags: string[] | null
          title: string | null
          url: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          tags?: string[] | null
          title?: string | null
          url?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          tags?: string[] | null
          title?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "links_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      news_stories: {
        Row: {
          content: string | null
          created_at: string
          headline: string
          id: string
          image_url: string | null
          is_published: boolean
          subheading: string | null
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          headline: string
          id?: string
          image_url?: string | null
          is_published?: boolean
          subheading?: string | null
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          headline?: string
          id?: string
          image_url?: string | null
          is_published?: boolean
          subheading?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notification_banners: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          message: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          message: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          message?: string
          updated_at?: string
        }
        Relationships: []
      }
      registrations: {
        Row: {
          approved_by: string | null
          approved_company_id: string | null
          approved_role: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          invite_code: string | null
          invite_expires_at: string | null
          notes: string | null
          password: string
          requested_company_id: string | null
          requested_company_name: string | null
          status: string | null
        }
        Insert: {
          approved_by?: string | null
          approved_company_id?: string | null
          approved_role?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          invite_code?: string | null
          invite_expires_at?: string | null
          notes?: string | null
          password?: string
          requested_company_id?: string | null
          requested_company_name?: string | null
          status?: string | null
        }
        Update: {
          approved_by?: string | null
          approved_company_id?: string | null
          approved_role?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          invite_code?: string | null
          invite_expires_at?: string | null
          notes?: string | null
          password?: string
          requested_company_id?: string | null
          requested_company_name?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registrations_approved_company_id_fkey"
            columns: ["approved_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_requested_company_id_fkey"
            columns: ["requested_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sitewide_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string
          first_name: string | null
          has_changed_default_password: boolean
          is_super_admin: boolean | null
          last_name: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          first_name?: string | null
          has_changed_default_password?: boolean
          is_super_admin?: boolean | null
          last_name?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          first_name?: string | null
          has_changed_default_password?: boolean
          is_super_admin?: boolean | null
          last_name?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      citext: {
        Args: { "": boolean } | { "": string } | { "": unknown }
        Returns: string
      }
      citext_hash: {
        Args: { "": string }
        Returns: number
      }
      citextin: {
        Args: { "": unknown }
        Returns: string
      }
      citextout: {
        Args: { "": string }
        Returns: unknown
      }
      citextrecv: {
        Args: { "": unknown }
        Returns: string
      }
      citextsend: {
        Args: { "": string }
        Returns: string
      }
      delete_user_account: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      get_user_companies: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      is_company_admin: {
        Args: { target_company_id: string }
        Returns: boolean
      }
      is_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
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
