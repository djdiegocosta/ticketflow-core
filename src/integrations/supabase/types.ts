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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      checkin_log: {
        Row: {
          created_at: string
          event_id: string | null
          id: string
          organization_id: string
          participant_name: string | null
          performed_by: string | null
          result: string
          ticket_code: string
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          id?: string
          organization_id: string
          participant_name?: string | null
          performed_by?: string | null
          result: string
          ticket_code: string
        }
        Update: {
          created_at?: string
          event_id?: string | null
          id?: string
          organization_id?: string
          participant_name?: string | null
          performed_by?: string | null
          result?: string
          ticket_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkin_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkin_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_abandonments: {
        Row: {
          abandonment_type: Database["public"]["Enums"]["abandonment_type"]
          buyer_name: string | null
          buyer_whatsapp: string | null
          created_at: string
          event_id: string | null
          id: string
          organization_id: string
          status: Database["public"]["Enums"]["abandonment_status"]
          updated_at: string
        }
        Insert: {
          abandonment_type: Database["public"]["Enums"]["abandonment_type"]
          buyer_name?: string | null
          buyer_whatsapp?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          organization_id: string
          status?: Database["public"]["Enums"]["abandonment_status"]
          updated_at?: string
        }
        Update: {
          abandonment_type?: Database["public"]["Enums"]["abandonment_type"]
          buyer_name?: string | null
          buyer_whatsapp?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          organization_id?: string
          status?: Database["public"]["Enums"]["abandonment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkout_abandonments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_abandonments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          cidade: string | null
          created_at: string
          data_nascimento: string | null
          email: string | null
          full_name: string
          id: string
          instagram: string | null
          organization_id: string
          points: number
          updated_at: string
          user_id: string | null
          whatsapp: string
        }
        Insert: {
          cidade?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          full_name: string
          id?: string
          instagram?: string | null
          organization_id: string
          points?: number
          updated_at?: string
          user_id?: string | null
          whatsapp: string
        }
        Update: {
          cidade?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          full_name?: string
          id?: string
          instagram?: string | null
          organization_id?: string
          points?: number
          updated_at?: string
          user_id?: string | null
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_checklist_items: {
        Row: {
          completed_at: string | null
          created_at: string
          event_id: string
          id: string
          is_completed: boolean
          organization_id: string
          text: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          event_id: string
          id?: string
          is_completed?: boolean
          organization_id: string
          text: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          event_id?: string
          id?: string
          is_completed?: boolean
          organization_id?: string
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_checklist_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_checklist_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          closed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          event_date: string
          id: string
          image_url: string | null
          is_closed: boolean
          location: string
          organization_id: string
          slug: string
          status: Database["public"]["Enums"]["event_status"]
          title: string
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date: string
          id?: string
          image_url?: string | null
          is_closed?: boolean
          location: string
          organization_id: string
          slug: string
          status?: Database["public"]["Enums"]["event_status"]
          title: string
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string
          id?: string
          image_url?: string | null
          is_closed?: boolean
          location?: string
          organization_id?: string
          slug?: string
          status?: Database["public"]["Enums"]["event_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      mp_config: {
        Row: {
          access_token_encrypted: string | null
          created_at: string
          environment: Database["public"]["Enums"]["mp_environment"]
          id: string
          organization_id: string
          public_key: string | null
          updated_at: string
          validated_at: string | null
          webhook_secret_encrypted: string | null
        }
        Insert: {
          access_token_encrypted?: string | null
          created_at?: string
          environment: Database["public"]["Enums"]["mp_environment"]
          id?: string
          organization_id: string
          public_key?: string | null
          updated_at?: string
          validated_at?: string | null
          webhook_secret_encrypted?: string | null
        }
        Update: {
          access_token_encrypted?: string | null
          created_at?: string
          environment?: Database["public"]["Enums"]["mp_environment"]
          id?: string
          organization_id?: string
          public_key?: string | null
          updated_at?: string
          validated_at?: string | null
          webhook_secret_encrypted?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mp_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          plan: Database["public"]["Enums"]["org_plan"]
          status: Database["public"]["Enums"]["org_status"]
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          plan?: Database["public"]["Enums"]["org_plan"]
          status?: Database["public"]["Enums"]["org_status"]
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          plan?: Database["public"]["Enums"]["org_plan"]
          status?: Database["public"]["Enums"]["org_status"]
          updated_at?: string
        }
        Relationships: []
      }
      pending_invites: {
        Row: {
          created_at: string
          email: string
          id: string
          invited_by: string | null
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "pending_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      points_ledger: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          organization_id: string
          points: number
          reason: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          organization_id: string
          points: number
          reason: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          organization_id?: string
          points?: number
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_ledger_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_ledger_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          cidade: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          cidade?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          cidade?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      raffle_participants: {
        Row: {
          created_at: string
          full_name: string
          id: string
          raffle_id: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          raffle_id: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          raffle_id?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "raffle_participants_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "raffles"
            referencedColumns: ["id"]
          },
        ]
      }
      raffle_winners: {
        Row: {
          drawn_at: string
          id: string
          participant_id: string
          raffle_id: string
        }
        Insert: {
          drawn_at?: string
          id?: string
          participant_id: string
          raffle_id: string
        }
        Update: {
          drawn_at?: string
          id?: string
          participant_id?: string
          raffle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "raffle_winners_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "raffle_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raffle_winners_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "raffles"
            referencedColumns: ["id"]
          },
        ]
      }
      raffles: {
        Row: {
          created_at: string
          description: string | null
          event_id: string
          id: string
          organization_id: string
          prize_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_id: string
          id?: string
          organization_id: string
          prize_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_id?: string
          id?: string
          organization_id?: string
          prize_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "raffles_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raffles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          batch_id: string
          buyer_email: string | null
          buyer_name: string
          buyer_whatsapp: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          event_id: string
          expires_at: string | null
          id: string
          is_courtesy: boolean
          mp_payment_id: string | null
          mp_qr_code: string | null
          mp_qr_code_base64: string | null
          observation: string | null
          organization_id: string
          origin: Database["public"]["Enums"]["sale_origin"]
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          quantity: number
          refund_reason: string | null
          refunded_amount: number | null
          refunded_at: string | null
          sale_code: string
          status: Database["public"]["Enums"]["sale_status"]
          total_amount: number
          unit_price: number
          updated_at: string
          verification_type:
            | Database["public"]["Enums"]["verification_type"]
            | null
        }
        Insert: {
          batch_id: string
          buyer_email?: string | null
          buyer_name: string
          buyer_whatsapp?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          event_id: string
          expires_at?: string | null
          id?: string
          is_courtesy?: boolean
          mp_payment_id?: string | null
          mp_qr_code?: string | null
          mp_qr_code_base64?: string | null
          observation?: string | null
          organization_id: string
          origin?: Database["public"]["Enums"]["sale_origin"]
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          quantity: number
          refund_reason?: string | null
          refunded_amount?: number | null
          refunded_at?: string | null
          sale_code: string
          status?: Database["public"]["Enums"]["sale_status"]
          total_amount: number
          unit_price: number
          updated_at?: string
          verification_type?:
            | Database["public"]["Enums"]["verification_type"]
            | null
        }
        Update: {
          batch_id?: string
          buyer_email?: string | null
          buyer_name?: string
          buyer_whatsapp?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          event_id?: string
          expires_at?: string | null
          id?: string
          is_courtesy?: boolean
          mp_payment_id?: string | null
          mp_qr_code?: string | null
          mp_qr_code_base64?: string | null
          observation?: string | null
          organization_id?: string
          origin?: Database["public"]["Enums"]["sale_origin"]
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          quantity?: number
          refund_reason?: string | null
          refunded_amount?: number | null
          refunded_at?: string | null
          sale_code?: string
          status?: Database["public"]["Enums"]["sale_status"]
          total_amount?: number
          unit_price?: number
          updated_at?: string
          verification_type?:
            | Database["public"]["Enums"]["verification_type"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "ticket_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      simulations: {
        Row: {
          created_at: string
          event_name: string
          id: string
          input_data: Json
          organization_id: string
          result_summary: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          input_data: Json
          organization_id: string
          result_summary: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          input_data?: Json
          organization_id?: string
          result_summary?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_batches: {
        Row: {
          created_at: string
          ends_at: string | null
          event_id: string
          id: string
          name: string
          organization_id: string
          price: number
          quantity: number
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          event_id: string
          id?: string
          name: string
          organization_id: string
          price?: number
          quantity: number
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          event_id?: string
          id?: string
          name?: string
          organization_id?: string
          price?: number
          quantity?: number
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_batches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_batches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          batch_id: string
          checked_in_at: string | null
          checked_in_by: string | null
          created_at: string
          event_id: string
          id: string
          organization_id: string
          participant_name: string
          sale_id: string
          status: Database["public"]["Enums"]["ticket_status"]
          ticket_code: string
          updated_at: string
        }
        Insert: {
          batch_id: string
          checked_in_at?: string | null
          checked_in_by?: string | null
          created_at?: string
          event_id: string
          id?: string
          organization_id: string
          participant_name: string
          sale_id: string
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_code: string
          updated_at?: string
        }
        Update: {
          batch_id?: string
          checked_in_at?: string | null
          checked_in_by?: string | null
          created_at?: string
          event_id?: string
          id?: string
          organization_id?: string
          participant_name?: string
          sale_id?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "ticket_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      event_ticket_stats: {
        Row: {
          checkins_cortesias: number | null
          checkins_vendidos: number | null
          cortesias_emitidas: number | null
          event_id: string | null
          ingressos_vendidos: number | null
          organization_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      approve_organization: { Args: { _org_id: string }; Returns: undefined }
      award_points: {
        Args: { _customer_id: string; _points: number; _reason: string }
        Returns: undefined
      }
      bootstrap_organization: { Args: { _name: string }; Returns: string }
      cancel_sale: { Args: { _sale_id: string }; Returns: undefined }
      change_organization_plan: {
        Args: {
          _org_id: string
          _plan: Database["public"]["Enums"]["org_plan"]
        }
        Returns: undefined
      }
      checkin_ticket: {
        Args: { _ticket_code: string }
        Returns: {
          checked_in_at: string
          event_title: string
          participant_name: string
          result: string
        }[]
      }
      confirm_sale_paid: {
        Args: { _mp_payment_id: string; _sale_id: string }
        Returns: undefined
      }
      create_courtesy: {
        Args: {
          _batch_id: string
          _event_id: string
          _participant_names: string[]
        }
        Returns: {
          sale_id: string
        }[]
      }
      create_locked_tickets: {
        Args: { _participant_names: string[]; _sale_id: string }
        Returns: undefined
      }
      create_manual_sale: {
        Args: {
          _batch_id: string
          _buyer_name: string
          _buyer_whatsapp: string
          _event_id: string
          _observation: string
          _participant_names: string[]
          _payment_method: Database["public"]["Enums"]["payment_method"]
          _quantity: number
          _total_amount: number
        }
        Returns: {
          sale_id: string
        }[]
      }
      create_pending_sale: {
        Args: {
          _batch_id: string
          _buyer_email: string
          _buyer_name: string
          _buyer_whatsapp: string
          _event_id: string
          _participant_names: string[]
          _quantity: number
        }
        Returns: {
          sale_code: string
          sale_id: string
          total_amount: number
        }[]
      }
      delete_courtesy_ticket: {
        Args: { _ticket_id: string }
        Returns: undefined
      }
      delete_customer: { Args: { _customer_id: string }; Returns: undefined }
      delete_event: { Args: { _event_id: string }; Returns: undefined }
      draw_raffle_winner: {
        Args: { _raffle_id: string }
        Returns: {
          full_name: string
          participant_id: string
        }[]
      }
      expire_pending_sales: { Args: never; Returns: number }
      generate_short_code: { Args: never; Returns: string }
      get_default_organization: { Args: never; Returns: string }
      get_sale_by_code: {
        Args: { _code: string }
        Returns: {
          buyer_name: string
          event_date: string
          event_title: string
          location: string
          quantity: number
          sale_id: string
          status: Database["public"]["Enums"]["sale_status"]
          total_amount: number
        }[]
      }
      get_tickets_by_sale_code: {
        Args: { _code: string }
        Returns: {
          checked_in_at: string
          participant_name: string
          status: Database["public"]["Enums"]["ticket_status"]
          ticket_code: string
        }[]
      }
      get_user_organization: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      invite_user: {
        Args: { _email: string; _role: Database["public"]["Enums"]["app_role"] }
        Returns: string
      }
      is_platform_admin: { Args: { _user_id: string }; Returns: boolean }
      refund_sale: {
        Args: { _reason: string; _refund_amount: number; _sale_id: string }
        Returns: undefined
      }
      signup_customer: {
        Args: {
          _cidade: string
          _email: string
          _full_name: string
          _whatsapp: string
        }
        Returns: {
          customer_id: string
        }[]
      }
      suspend_organization: { Args: { _org_id: string }; Returns: undefined }
      track_checkout_abandonment: {
        Args: {
          _buyer_name: string
          _buyer_whatsapp: string
          _event_id: string
        }
        Returns: undefined
      }
      update_courtesy_participant: {
        Args: { _name: string; _ticket_id: string }
        Returns: undefined
      }
      update_customer: {
        Args: {
          _cidade: string
          _customer_id: string
          _data_nascimento: string
          _email: string
          _full_name: string
          _instagram: string
          _whatsapp: string
        }
        Returns: undefined
      }
      update_organization_profile: {
        Args: {
          _contact_email: string
          _contact_phone: string
          _logo_url: string
          _name: string
          _org_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      abandonment_status: "nao_contactado" | "contactado" | "convertido"
      abandonment_type: "sem_pix" | "pix_nao_pago"
      app_role: "admin" | "colaborador" | "operador_checkin"
      event_status: "rascunho" | "publicado"
      mp_environment: "sandbox" | "producao"
      org_plan: "start" | "pro" | "business"
      org_status: "pending" | "active" | "suspended" | "cancelled"
      payment_method:
        | "pix_ticketflow"
        | "pix_manual"
        | "dinheiro"
        | "cartao"
        | "outro"
      sale_origin: "ticketflow" | "manual" | "importado"
      sale_status: "pendente" | "pago" | "cancelado" | "reembolsado"
      ticket_status: "valido" | "utilizado" | "cancelado"
      verification_type: "webhook_hmac" | "manual_admin" | "importado"
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
      abandonment_status: ["nao_contactado", "contactado", "convertido"],
      abandonment_type: ["sem_pix", "pix_nao_pago"],
      app_role: ["admin", "colaborador", "operador_checkin"],
      event_status: ["rascunho", "publicado"],
      mp_environment: ["sandbox", "producao"],
      org_plan: ["start", "pro", "business"],
      org_status: ["pending", "active", "suspended", "cancelled"],
      payment_method: [
        "pix_ticketflow",
        "pix_manual",
        "dinheiro",
        "cartao",
        "outro",
      ],
      sale_origin: ["ticketflow", "manual", "importado"],
      sale_status: ["pendente", "pago", "cancelado", "reembolsado"],
      ticket_status: ["valido", "utilizado", "cancelado"],
      verification_type: ["webhook_hmac", "manual_admin", "importado"],
    },
  },
} as const
