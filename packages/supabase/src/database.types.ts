export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      appointments: {
        Row: {
          auto_assigned: boolean;
          barber_id: string;
          cancel_reason: string | null;
          cancelled_by: string | null;
          confirmed_at: string | null;
          confirmed_via: string | null;
          created_at: string;
          created_by: string | null;
          customer_id: string;
          id: string;
          period: unknown;
          price_cop: number | null;
          rescheduled_from: string | null;
          service_id: string;
          source: string;
          status: Database["public"]["Enums"]["appointment_status"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          auto_assigned?: boolean;
          barber_id: string;
          cancel_reason?: string | null;
          cancelled_by?: string | null;
          confirmed_at?: string | null;
          confirmed_via?: string | null;
          created_at?: string;
          created_by?: string | null;
          customer_id: string;
          id?: string;
          period: unknown;
          price_cop?: number | null;
          rescheduled_from?: string | null;
          service_id: string;
          source: string;
          status?: Database["public"]["Enums"]["appointment_status"];
          updated_at?: string;
        };
        Update: {
          auto_assigned?: boolean;
          barber_id?: string;
          cancel_reason?: string | null;
          cancelled_by?: string | null;
          confirmed_at?: string | null;
          confirmed_via?: string | null;
          created_at?: string;
          created_by?: string | null;
          customer_id?: string;
          id?: string;
          period?: unknown;
          price_cop?: number | null;
          rescheduled_from?: string | null;
          service_id?: string;
          source?: string;
          status?: Database["public"]["Enums"]["appointment_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "appointments_barber_id_fkey";
            columns: ["barber_id"];
            isOneToOne: false;
            referencedRelation: "barbers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_rescheduled_from_fkey";
            columns: ["rescheduled_from"];
            isOneToOne: false;
            referencedRelation: "appointments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      barber_customers: {
        Row: {
          barber_id: string;
          customer_id: string;
          first_seen_at: string;
        };
        ComputedFields: never;
        Insert: {
          barber_id: string;
          customer_id: string;
          first_seen_at?: string;
        };
        Update: {
          barber_id?: string;
          customer_id?: string;
          first_seen_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "barber_customers_barber_id_fkey";
            columns: ["barber_id"];
            isOneToOne: false;
            referencedRelation: "barbers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "barber_customers_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      barber_services: {
        Row: {
          barber_id: string;
          duration_min_override: number | null;
          price_cop_override: number | null;
          service_id: string;
        };
        ComputedFields: never;
        Insert: {
          barber_id: string;
          duration_min_override?: number | null;
          price_cop_override?: number | null;
          service_id: string;
        };
        Update: {
          barber_id?: string;
          duration_min_override?: number | null;
          price_cop_override?: number | null;
          service_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "barber_services_barber_id_fkey";
            columns: ["barber_id"];
            isOneToOne: false;
            referencedRelation: "barbers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "barber_services_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      barbers: {
        Row: {
          active: boolean;
          bio: string | null;
          created_at: string;
          display_name: string;
          id: string;
          photo_path: string | null;
          slot_interval_min: number;
          updated_at: string;
          user_id: string | null;
          whatsapp_url: string | null;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          bio?: string | null;
          created_at?: string;
          display_name: string;
          id?: string;
          photo_path?: string | null;
          slot_interval_min?: number;
          updated_at?: string;
          user_id?: string | null;
          whatsapp_url?: string | null;
        };
        Update: {
          active?: boolean;
          bio?: string | null;
          created_at?: string;
          display_name?: string;
          id?: string;
          photo_path?: string | null;
          slot_interval_min?: number;
          updated_at?: string;
          user_id?: string | null;
          whatsapp_url?: string | null;
        };
        Relationships: [];
      };
      booking_events: {
        Row: {
          appointment_id: string | null;
          created_at: string;
          id: number;
          payload: NonNullable<Json>;
          type: string;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          appointment_id?: string | null;
          created_at?: string;
          id?: never;
          payload: NonNullable<Json>;
          type: string;
          version: number;
        };
        Update: {
          appointment_id?: string | null;
          created_at?: string;
          id?: never;
          payload?: NonNullable<Json>;
          type?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "booking_events_appointment_id_fkey";
            columns: ["appointment_id"];
            isOneToOne: false;
            referencedRelation: "appointments";
            referencedColumns: ["id"];
          },
        ];
      };
      booking_settings: {
        Row: {
          cancel_window_min: number;
          id: boolean;
          max_days_ahead: number;
          min_lead_min: number;
          no_show_threshold: number;
          timezone: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          cancel_window_min?: number;
          id?: boolean;
          max_days_ahead?: number;
          min_lead_min?: number;
          no_show_threshold?: number;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          cancel_window_min?: number;
          id?: boolean;
          max_days_ahead?: number;
          min_lead_min?: number;
          no_show_threshold?: number;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      charges: {
        Row: {
          amount_cop: number;
          appointment_id: string;
          barber_amount_cop: number | null;
          barber_id: string;
          barber_pct: number;
          business_amount_cop: number | null;
          charged_at: string;
          created_by: string | null;
          id: string;
          service_id: string;
          updated_at: string;
          void_reason: string | null;
          voided_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          amount_cop: number;
          appointment_id: string;
          barber_amount_cop?: never;
          barber_id: string;
          barber_pct: number;
          business_amount_cop?: never;
          charged_at?: string;
          created_by?: string | null;
          id?: string;
          service_id: string;
          updated_at?: string;
          void_reason?: string | null;
          voided_at?: string | null;
        };
        Update: {
          amount_cop?: number;
          appointment_id?: string;
          barber_amount_cop?: never;
          barber_id?: string;
          barber_pct?: number;
          business_amount_cop?: never;
          charged_at?: string;
          created_by?: string | null;
          id?: string;
          service_id?: string;
          updated_at?: string;
          void_reason?: string | null;
          voided_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "charges_appointment_id_fkey";
            columns: ["appointment_id"];
            isOneToOne: true;
            referencedRelation: "appointments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "charges_barber_id_fkey";
            columns: ["barber_id"];
            isOneToOne: false;
            referencedRelation: "barbers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "charges_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      commission_rates: {
        Row: {
          barber_id: string;
          barber_pct: number;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          barber_id: string;
          barber_pct: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          barber_id?: string;
          barber_pct?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "commission_rates_barber_id_fkey";
            columns: ["barber_id"];
            isOneToOne: true;
            referencedRelation: "barbers";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_booking_status: {
        Row: {
          customer_id: string;
          no_show_count: number;
          requires_approval: boolean;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          customer_id: string;
          no_show_count?: number;
          requires_approval?: boolean;
          updated_at?: string;
        };
        Update: {
          customer_id?: string;
          no_show_count?: number;
          requires_approval?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customer_booking_status_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: true;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_notes: {
        Row: {
          barber_id: string;
          body: string;
          created_at: string;
          customer_id: string;
          id: string;
        };
        ComputedFields: never;
        Insert: {
          barber_id: string;
          body: string;
          created_at?: string;
          customer_id: string;
          id?: string;
        };
        Update: {
          barber_id?: string;
          body?: string;
          created_at?: string;
          customer_id?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customer_notes_barber_id_fkey";
            columns: ["barber_id"];
            isOneToOne: false;
            referencedRelation: "barbers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_notes_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          created_at: string;
          created_by: string | null;
          data_consent_at: string | null;
          data_policy_version: string | null;
          email: string | null;
          full_name: string;
          id: string;
          phone: string | null;
          updated_at: string;
          user_id: string | null;
          whatsapp_opt_in: boolean;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          data_consent_at?: string | null;
          data_policy_version?: string | null;
          email?: string | null;
          full_name: string;
          id?: string;
          phone?: string | null;
          updated_at?: string;
          user_id?: string | null;
          whatsapp_opt_in?: boolean;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          data_consent_at?: string | null;
          data_policy_version?: string | null;
          email?: string | null;
          full_name?: string;
          id?: string;
          phone?: string | null;
          updated_at?: string;
          user_id?: string | null;
          whatsapp_opt_in?: boolean;
        };
        Relationships: [];
      };
      event_cursors: {
        Row: {
          consumer: string;
          last_event_id: number;
          lease_until: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          consumer: string;
          last_event_id?: number;
          lease_until?: string | null;
          updated_at?: string;
        };
        Update: {
          consumer?: string;
          last_event_id?: number;
          lease_until?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      inbound_messages: {
        Row: {
          appointment_id: string | null;
          button_payload: string | null;
          from_phone: string | null;
          id: string;
          payload: NonNullable<Json>;
          provider_message_id: string;
          received_at: string;
        };
        ComputedFields: never;
        Insert: {
          appointment_id?: string | null;
          button_payload?: string | null;
          from_phone?: string | null;
          id?: string;
          payload: NonNullable<Json>;
          provider_message_id: string;
          received_at?: string;
        };
        Update: {
          appointment_id?: string | null;
          button_payload?: string | null;
          from_phone?: string | null;
          id?: string;
          payload?: NonNullable<Json>;
          provider_message_id?: string;
          received_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inbound_messages_appointment_id_fkey";
            columns: ["appointment_id"];
            isOneToOne: false;
            referencedRelation: "appointments";
            referencedColumns: ["id"];
          },
        ];
      };
      message_jobs: {
        Row: {
          appointment_id: string;
          attempts: number;
          channel: string;
          created_at: string;
          id: string;
          kind: string;
          last_error: string | null;
          offset_min: number;
          provider_message_id: string | null;
          send_at: string;
          status: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          appointment_id: string;
          attempts?: number;
          channel: string;
          created_at?: string;
          id?: string;
          kind: string;
          last_error?: string | null;
          offset_min?: number;
          provider_message_id?: string | null;
          send_at: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          appointment_id?: string;
          attempts?: number;
          channel?: string;
          created_at?: string;
          id?: string;
          kind?: string;
          last_error?: string | null;
          offset_min?: number;
          provider_message_id?: string | null;
          send_at?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "message_jobs_appointment_id_fkey";
            columns: ["appointment_id"];
            isOneToOne: false;
            referencedRelation: "appointments";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_settings: {
        Row: {
          id: boolean;
          reminder_offsets_min: number[];
          send_confirmation: boolean;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          id?: boolean;
          reminder_offsets_min?: number[];
          send_confirmation?: boolean;
          updated_at?: string;
        };
        Update: {
          id?: boolean;
          reminder_offsets_min?: number[];
          send_confirmation?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      portfolio_items: {
        Row: {
          barber_id: string;
          caption: string | null;
          created_at: string;
          id: string;
          image_path: string;
          sort_order: number;
        };
        ComputedFields: never;
        Insert: {
          barber_id: string;
          caption?: string | null;
          created_at?: string;
          id?: string;
          image_path: string;
          sort_order?: number;
        };
        Update: {
          barber_id?: string;
          caption?: string | null;
          created_at?: string;
          id?: string;
          image_path?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "portfolio_items_barber_id_fkey";
            columns: ["barber_id"];
            isOneToOne: false;
            referencedRelation: "barbers";
            referencedColumns: ["id"];
          },
        ];
      };
      push_subscriptions: {
        Row: {
          auth: string;
          created_at: string;
          endpoint: string;
          id: string;
          p256dh: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          auth: string;
          created_at?: string;
          endpoint: string;
          id?: string;
          p256dh: string;
          user_id: string;
        };
        Update: {
          auth?: string;
          created_at?: string;
          endpoint?: string;
          id?: string;
          p256dh?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      services: {
        Row: {
          active: boolean;
          created_at: string;
          description: string | null;
          duration_min: number;
          id: string;
          name: string;
          price_cop: number | null;
          sort_order: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          created_at?: string;
          description?: string | null;
          duration_min: number;
          id?: string;
          name: string;
          price_cop?: number | null;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          description?: string | null;
          duration_min?: number;
          id?: string;
          name?: string;
          price_cop?: number | null;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      staff_roles: {
        Row: {
          created_at: string;
          role: Database["public"]["Enums"]["staff_role"];
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          role: Database["public"]["Enums"]["staff_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          role?: Database["public"]["Enums"]["staff_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      time_off: {
        Row: {
          barber_id: string;
          created_at: string;
          created_by: string | null;
          id: string;
          period: unknown;
          reason: string | null;
        };
        ComputedFields: never;
        Insert: {
          barber_id: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          period: unknown;
          reason?: string | null;
        };
        Update: {
          barber_id?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          period?: unknown;
          reason?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "time_off_barber_id_fkey";
            columns: ["barber_id"];
            isOneToOne: false;
            referencedRelation: "barbers";
            referencedColumns: ["id"];
          },
        ];
      };
      working_hours: {
        Row: {
          barber_id: string;
          end_time: string;
          id: string;
          start_time: string;
          weekday: number;
        };
        ComputedFields: never;
        Insert: {
          barber_id: string;
          end_time: string;
          id?: string;
          start_time: string;
          weekday: number;
        };
        Update: {
          barber_id?: string;
          end_time?: string;
          id?: string;
          start_time?: string;
          weekday?: number;
        };
        Relationships: [
          {
            foreignKeyName: "working_hours_barber_id_fkey";
            columns: ["barber_id"];
            isOneToOne: false;
            referencedRelation: "barbers";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      ack_booking_events: {
        Args: { p_consumer: string; p_last_event_id?: number };
        Returns: boolean;
      };
      book_appointment: {
        Args: { p_barber_id?: string; p_service_id: string; p_start_at: string };
        Returns: {
          auto_assigned: boolean;
          barber_id: string;
          cancel_reason: string | null;
          cancelled_by: string | null;
          confirmed_at: string | null;
          confirmed_via: string | null;
          created_at: string;
          created_by: string | null;
          customer_id: string;
          id: string;
          period: unknown;
          price_cop: number | null;
          rescheduled_from: string | null;
          service_id: string;
          source: string;
          status: Database["public"]["Enums"]["appointment_status"];
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "appointments";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      cancel_appointment: {
        Args: { p_id: string; p_reason?: string };
        Returns: {
          auto_assigned: boolean;
          barber_id: string;
          cancel_reason: string | null;
          cancelled_by: string | null;
          confirmed_at: string | null;
          confirmed_via: string | null;
          created_at: string;
          created_by: string | null;
          customer_id: string;
          id: string;
          period: unknown;
          price_cop: number | null;
          rescheduled_from: string | null;
          service_id: string;
          source: string;
          status: Database["public"]["Enums"]["appointment_status"];
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "appointments";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      claim_booking_events: {
        Args: { p_consumer: string; p_limit?: number };
        Returns: {
          appointment_id: string | null;
          created_at: string;
          id: number;
          payload: NonNullable<Json>;
          type: string;
          version: number;
        }[];
        SetofOptions: {
          from: "*";
          to: "booking_events";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      confirm_appointment: {
        Args: { p_id: string; p_via?: string };
        Returns: {
          auto_assigned: boolean;
          barber_id: string;
          cancel_reason: string | null;
          cancelled_by: string | null;
          confirmed_at: string | null;
          confirmed_via: string | null;
          created_at: string;
          created_by: string | null;
          customer_id: string;
          id: string;
          period: unknown;
          price_cop: number | null;
          rescheduled_from: string | null;
          service_id: string;
          source: string;
          status: Database["public"]["Enums"]["appointment_status"];
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "appointments";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_time_off: {
        Args: { p_barber_id: string; p_ends_at: string; p_reason?: string; p_starts_at: string };
        Returns: {
          barber_id: string;
          created_at: string;
          created_by: string | null;
          id: string;
          period: unknown;
          reason: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "time_off";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      current_barber_id: { Args: Record<PropertyKey, never>; Returns: string };
      decide_pending: {
        Args: { p_approve: boolean; p_id: string };
        Returns: {
          auto_assigned: boolean;
          barber_id: string;
          cancel_reason: string | null;
          cancelled_by: string | null;
          confirmed_at: string | null;
          confirmed_via: string | null;
          created_at: string;
          created_by: string | null;
          customer_id: string;
          id: string;
          period: unknown;
          price_cop: number | null;
          rescheduled_from: string | null;
          service_id: string;
          source: string;
          status: Database["public"]["Enums"]["appointment_status"];
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "appointments";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      delete_my_account: { Args: Record<PropertyKey, never>; Returns: undefined };
      get_appointment_for_notification: {
        Args: { p_id: string };
        Returns: {
          appointment_id: string;
          barber_id: string;
          barber_name: string;
          barber_whatsapp_url: string;
          customer_name: string;
          customer_phone: string;
          end_at: string;
          service_name: string;
          start_at: string;
          status: Database["public"]["Enums"]["appointment_status"];
          whatsapp_opt_in: boolean;
        }[];
      };
      get_available_days: {
        Args: { p_barber_id?: string; p_service_id: string };
        Returns: {
          day: string;
          slots: number;
        }[];
      };
      get_available_slots: {
        Args: { p_barber_id?: string; p_day: string; p_service_id: string };
        Returns: {
          barber_ids: string[];
          start_at: string;
        }[];
      };
      get_opening_hours: {
        Args: Record<PropertyKey, never>;
        Returns: {
          end_time: string;
          start_time: string;
          weekday: number;
        }[];
      };
      get_settlement: {
        Args: { p_barber_id?: string; p_from: string; p_to: string };
        Returns: {
          amount_cop: number;
          barber_amount_cop: number;
          barber_id: string;
          business_amount_cop: number;
          services_count: number;
        }[];
      };
      grant_role: {
        Args: { p_email: string; p_role: Database["public"]["Enums"]["staff_role"] };
        Returns: string;
      };
      has_role: { Args: { p_role: Database["public"]["Enums"]["staff_role"] }; Returns: boolean };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      link_customer_to_barber: {
        Args: { p_barber_id: string; p_customer_id: string };
        Returns: undefined;
      };
      list_conflicting_appointments: {
        Args: { p_barber_id: string; p_ends_at: string; p_starts_at: string };
        Returns: {
          customer_id: string;
          customer_name: string;
          end_at: string;
          id: string;
          start_at: string;
          status: Database["public"]["Enums"]["appointment_status"];
        }[];
      };
      list_my_appointments: {
        Args: { p_id?: string; p_limit?: number };
        Returns: {
          barber_active: boolean;
          barber_id: string;
          barber_name: string;
          barber_whatsapp_url: string;
          change_deadline: string;
          end_at: string;
          id: string;
          price_cop: number;
          replaced_by: string;
          service_active: boolean;
          service_id: string;
          service_name: string;
          start_at: string;
          status: Database["public"]["Enums"]["appointment_status"];
        }[];
      };
      list_push_targets: {
        Args: { p_barber_id: string };
        Returns: {
          auth: string;
          endpoint: string;
          p256dh: string;
        }[];
      };
      list_staff: {
        Args: Record<PropertyKey, never>;
        Returns: {
          email: string;
          roles: Database["public"]["Enums"]["staff_role"][];
          user_id: string;
        }[];
      };
      mark_attendance: {
        Args: { p_attended: boolean; p_id: string };
        Returns: {
          auto_assigned: boolean;
          barber_id: string;
          cancel_reason: string | null;
          cancelled_by: string | null;
          confirmed_at: string | null;
          confirmed_via: string | null;
          created_at: string;
          created_by: string | null;
          customer_id: string;
          id: string;
          period: unknown;
          price_cop: number | null;
          rescheduled_from: string | null;
          service_id: string;
          source: string;
          status: Database["public"]["Enums"]["appointment_status"];
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "appointments";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      my_booking_requires_approval: { Args: Record<PropertyKey, never>; Returns: boolean };
      record_charge: {
        Args: { p_amount_cop?: number; p_appointment_id: string };
        Returns: {
          amount_cop: number;
          appointment_id: string;
          barber_amount_cop: number | null;
          barber_id: string;
          barber_pct: number;
          business_amount_cop: number | null;
          charged_at: string;
          created_by: string | null;
          id: string;
          service_id: string;
          updated_at: string;
          void_reason: string | null;
          voided_at: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "charges";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      reschedule_appointment: {
        Args: { p_id: string; p_new_barber_id?: string; p_new_start_at: string };
        Returns: {
          auto_assigned: boolean;
          barber_id: string;
          cancel_reason: string | null;
          cancelled_by: string | null;
          confirmed_at: string | null;
          confirmed_via: string | null;
          created_at: string;
          created_by: string | null;
          customer_id: string;
          id: string;
          period: unknown;
          price_cop: number | null;
          rescheduled_from: string | null;
          service_id: string;
          source: string;
          status: Database["public"]["Enums"]["appointment_status"];
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "appointments";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      reset_no_shows: { Args: { p_customer_id: string }; Returns: undefined };
      revoke_role: {
        Args: { p_role: Database["public"]["Enums"]["staff_role"]; p_user_id: string };
        Returns: undefined;
      };
      save_push_subscription: {
        Args: { p_auth: string; p_endpoint: string; p_p256dh: string };
        Returns: undefined;
      };
      set_working_hours: {
        Args: { p_barber_id: string; p_ranges: Json };
        Returns: {
          barber_id: string;
          end_time: string;
          id: string;
          start_time: string;
          weekday: number;
        }[];
        SetofOptions: {
          from: "*";
          to: "working_hours";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      staff_create_appointment: {
        Args: {
          p_barber_id: string;
          p_customer_id: string;
          p_service_id: string;
          p_start_at: string;
        };
        Returns: {
          auto_assigned: boolean;
          barber_id: string;
          cancel_reason: string | null;
          cancelled_by: string | null;
          confirmed_at: string | null;
          confirmed_via: string | null;
          created_at: string;
          created_by: string | null;
          customer_id: string;
          id: string;
          period: unknown;
          price_cop: number | null;
          rescheduled_from: string | null;
          service_id: string;
          source: string;
          status: Database["public"]["Enums"]["appointment_status"];
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "appointments";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      staff_create_customer: {
        Args: {
          p_data_policy_version?: string;
          p_email?: string;
          p_full_name: string;
          p_phone?: string;
          p_whatsapp_opt_in?: boolean;
        };
        Returns: {
          created_at: string;
          created_by: string | null;
          data_consent_at: string | null;
          data_policy_version: string | null;
          email: string | null;
          full_name: string;
          id: string;
          phone: string | null;
          updated_at: string;
          user_id: string | null;
          whatsapp_opt_in: boolean;
        };
        SetofOptions: {
          from: "*";
          to: "customers";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      update_charge: {
        Args: { p_amount_cop: number; p_id: string };
        Returns: {
          amount_cop: number;
          appointment_id: string;
          barber_amount_cop: number | null;
          barber_id: string;
          barber_pct: number;
          business_amount_cop: number | null;
          charged_at: string;
          created_by: string | null;
          id: string;
          service_id: string;
          updated_at: string;
          void_reason: string | null;
          voided_at: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "charges";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      void_charge: {
        Args: { p_id: string; p_reason: string };
        Returns: {
          amount_cop: number;
          appointment_id: string;
          barber_amount_cop: number | null;
          barber_id: string;
          barber_pct: number;
          business_amount_cop: number | null;
          charged_at: string;
          created_by: string | null;
          id: string;
          service_id: string;
          updated_at: string;
          void_reason: string | null;
          voided_at: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "charges";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: {
      appointment_status:
        | "pending_approval"
        | "booked"
        | "confirmed"
        | "completed"
        | "no_show"
        | "cancelled"
        | "rejected";
      staff_role: "admin" | "barber";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      appointment_status: [
        "pending_approval",
        "booked",
        "confirmed",
        "completed",
        "no_show",
        "cancelled",
        "rejected",
      ],
      staff_role: ["admin", "barber"],
    },
  },
} as const;
