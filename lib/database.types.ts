export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      attendance_events: {
        Row: {
          accepted: boolean;
          accuracy_m: number | null;
          booking_id: string;
          distance_m: number | null;
          id: number;
          lat: number | null;
          lng: number | null;
          reject_code: string | null;
          scanned_at: string;
          shop_id: string;
          token_window: number | null;
          type: Database['public']['Enums']['attendance_type'];
          worker_id: string;
        };
        ComputedFields: never;
        Insert: {
          accepted: boolean;
          accuracy_m?: number | null;
          booking_id: string;
          distance_m?: number | null;
          id?: never;
          lat?: number | null;
          lng?: number | null;
          reject_code?: string | null;
          scanned_at?: string;
          shop_id: string;
          token_window?: number | null;
          type: Database['public']['Enums']['attendance_type'];
          worker_id: string;
        };
        Update: {
          accepted?: boolean;
          accuracy_m?: number | null;
          booking_id?: string;
          distance_m?: number | null;
          id?: never;
          lat?: number | null;
          lng?: number | null;
          reject_code?: string | null;
          scanned_at?: string;
          shop_id?: string;
          token_window?: number | null;
          type?: Database['public']['Enums']['attendance_type'];
          worker_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'attendance_events_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'attendance_events_shop_id_fkey';
            columns: ['shop_id'];
            isOneToOne: false;
            referencedRelation: 'shops';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'attendance_events_worker_id_fkey';
            columns: ['worker_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      bookings: {
        Row: {
          adjustment_note: string | null;
          approved_at: string | null;
          approved_by: string | null;
          auto_checked_out: boolean;
          booked_at: string;
          cancel_reason: string | null;
          cancelled_at: string | null;
          cancelled_by: Database['public']['Enums']['actor_type'] | null;
          check_in_at: string | null;
          check_in_distance_m: number | null;
          check_out_at: string | null;
          check_out_distance_m: number | null;
          compensation_amount: number;
          created_at: string;
          fee_amount: number | null;
          id: string;
          is_late: boolean;
          penalty_points: number;
          period: unknown;
          reminder_sent_at: string | null;
          seat_hold: number;
          settled_at: string | null;
          shift_id: string;
          shop_id: string;
          source: Database['public']['Enums']['booking_source'];
          status: Database['public']['Enums']['booking_status'];
          updated_at: string;
          wage_amount: number | null;
          worked_minutes: number | null;
          worker_id: string;
        };
        ComputedFields: never;
        Insert: {
          adjustment_note?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          auto_checked_out?: boolean;
          booked_at?: string;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: Database['public']['Enums']['actor_type'] | null;
          check_in_at?: string | null;
          check_in_distance_m?: number | null;
          check_out_at?: string | null;
          check_out_distance_m?: number | null;
          compensation_amount?: number;
          created_at?: string;
          fee_amount?: number | null;
          id?: string;
          is_late?: boolean;
          penalty_points?: number;
          period: unknown;
          reminder_sent_at?: string | null;
          seat_hold?: number;
          settled_at?: string | null;
          shift_id: string;
          shop_id: string;
          source?: Database['public']['Enums']['booking_source'];
          status?: Database['public']['Enums']['booking_status'];
          updated_at?: string;
          wage_amount?: number | null;
          worked_minutes?: number | null;
          worker_id: string;
        };
        Update: {
          adjustment_note?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          auto_checked_out?: boolean;
          booked_at?: string;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: Database['public']['Enums']['actor_type'] | null;
          check_in_at?: string | null;
          check_in_distance_m?: number | null;
          check_out_at?: string | null;
          check_out_distance_m?: number | null;
          compensation_amount?: number;
          created_at?: string;
          fee_amount?: number | null;
          id?: string;
          is_late?: boolean;
          penalty_points?: number;
          period?: unknown;
          reminder_sent_at?: string | null;
          seat_hold?: number;
          settled_at?: string | null;
          shift_id?: string;
          shop_id?: string;
          source?: Database['public']['Enums']['booking_source'];
          status?: Database['public']['Enums']['booking_status'];
          updated_at?: string;
          wage_amount?: number | null;
          worked_minutes?: number | null;
          worker_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'bookings_approved_by_fkey';
            columns: ['approved_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_shift_id_fkey';
            columns: ['shift_id'];
            isOneToOne: false;
            referencedRelation: 'shifts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_shop_id_fkey';
            columns: ['shop_id'];
            isOneToOne: false;
            referencedRelation: 'shops';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_worker_id_fkey';
            columns: ['worker_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      disputes: {
        Row: {
          adjusted_minutes: number | null;
          booking_id: string;
          created_at: string;
          description: string;
          id: string;
          opened_by: string;
          opener_role: Database['public']['Enums']['actor_type'];
          prev_status: Database['public']['Enums']['booking_status'];
          reason_code: string;
          resolution: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          status: Database['public']['Enums']['dispute_status'];
        };
        ComputedFields: never;
        Insert: {
          adjusted_minutes?: number | null;
          booking_id: string;
          created_at?: string;
          description: string;
          id?: string;
          opened_by: string;
          opener_role: Database['public']['Enums']['actor_type'];
          prev_status: Database['public']['Enums']['booking_status'];
          reason_code: string;
          resolution?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: Database['public']['Enums']['dispute_status'];
        };
        Update: {
          adjusted_minutes?: number | null;
          booking_id?: string;
          created_at?: string;
          description?: string;
          id?: string;
          opened_by?: string;
          opener_role?: Database['public']['Enums']['actor_type'];
          prev_status?: Database['public']['Enums']['booking_status'];
          reason_code?: string;
          resolution?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: Database['public']['Enums']['dispute_status'];
        };
        Relationships: [
          {
            foreignKeyName: 'disputes_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'disputes_opened_by_fkey';
            columns: ['opened_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'disputes_resolved_by_fkey';
            columns: ['resolved_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      kyc_submissions: {
        Row: {
          back_image_path: string;
          created_at: string;
          front_image_path: string;
          id: string;
          id_last4: string | null;
          reject_reason: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          selfie_path: string;
          status: Database['public']['Enums']['verification_status'];
          worker_id: string;
        };
        ComputedFields: never;
        Insert: {
          back_image_path: string;
          created_at?: string;
          front_image_path: string;
          id?: string;
          id_last4?: string | null;
          reject_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          selfie_path: string;
          status?: Database['public']['Enums']['verification_status'];
          worker_id: string;
        };
        Update: {
          back_image_path?: string;
          created_at?: string;
          front_image_path?: string;
          id?: string;
          id_last4?: string | null;
          reject_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          selfie_path?: string;
          status?: Database['public']['Enums']['verification_status'];
          worker_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'kyc_submissions_reviewed_by_fkey';
            columns: ['reviewed_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'kyc_submissions_worker_id_fkey';
            columns: ['worker_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          data: NonNullable<Json>;
          id: number;
          read_at: string | null;
          title: string;
          type: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          body?: string | null;
          created_at?: string;
          data?: NonNullable<Json>;
          id?: never;
          read_at?: string | null;
          title: string;
          type: string;
          user_id: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          data?: NonNullable<Json>;
          id?: never;
          read_at?: string | null;
          title?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      payment_orders: {
        Row: {
          amount: number;
          bank_snapshot: Json | null;
          completed_at: string | null;
          created_at: string;
          expires_at: string | null;
          failure_reason: string | null;
          id: string;
          idempotency_key: string | null;
          kind: Database['public']['Enums']['payment_kind'];
          provider: string;
          provider_txn_id: string | null;
          reference_code: string;
          status: Database['public']['Enums']['payment_status'];
          updated_at: string;
          wallet_id: string;
        };
        ComputedFields: never;
        Insert: {
          amount: number;
          bank_snapshot?: Json | null;
          completed_at?: string | null;
          created_at?: string;
          expires_at?: string | null;
          failure_reason?: string | null;
          id?: string;
          idempotency_key?: string | null;
          kind: Database['public']['Enums']['payment_kind'];
          provider?: string;
          provider_txn_id?: string | null;
          reference_code: string;
          status?: Database['public']['Enums']['payment_status'];
          updated_at?: string;
          wallet_id: string;
        };
        Update: {
          amount?: number;
          bank_snapshot?: Json | null;
          completed_at?: string | null;
          created_at?: string;
          expires_at?: string | null;
          failure_reason?: string | null;
          id?: string;
          idempotency_key?: string | null;
          kind?: Database['public']['Enums']['payment_kind'];
          provider?: string;
          provider_txn_id?: string | null;
          reference_code?: string;
          status?: Database['public']['Enums']['payment_status'];
          updated_at?: string;
          wallet_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'payment_orders_wallet_id_fkey';
            columns: ['wallet_id'];
            isOneToOne: false;
            referencedRelation: 'wallets';
            referencedColumns: ['id'];
          },
        ];
      };
      platform_settings: {
        Row: {
          description: string | null;
          is_public: boolean;
          key: string;
          updated_at: string;
          updated_by: string | null;
          value: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          description?: string | null;
          is_public?: boolean;
          key: string;
          updated_at?: string;
          updated_by?: string | null;
          value: NonNullable<Json>;
        };
        Update: {
          description?: string | null;
          is_public?: boolean;
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: NonNullable<Json>;
        };
        Relationships: [
          {
            foreignKeyName: 'platform_settings_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      positions: {
        Row: {
          code: string;
          icon: string | null;
          name: string;
          sort_order: number;
        };
        ComputedFields: never;
        Insert: {
          code: string;
          icon?: string | null;
          name: string;
          sort_order?: number;
        };
        Update: {
          code?: string;
          icon?: string | null;
          name?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          full_name: string;
          id: string;
          onboarded_at: string | null;
          phone: string | null;
          role: Database['public']['Enums']['user_role'];
          status: Database['public']['Enums']['account_status'];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          full_name: string;
          id: string;
          onboarded_at?: string | null;
          phone?: string | null;
          role?: Database['public']['Enums']['user_role'];
          status?: Database['public']['Enums']['account_status'];
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string;
          id?: string;
          onboarded_at?: string | null;
          phone?: string | null;
          role?: Database['public']['Enums']['user_role'];
          status?: Database['public']['Enums']['account_status'];
          updated_at?: string;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          booking_id: string;
          comment: string | null;
          created_at: string;
          direction: Database['public']['Enums']['review_direction'];
          id: string;
          reviewer_id: string;
          shop_id: string;
          stars: number;
          tags: string[];
          worker_id: string;
        };
        ComputedFields: never;
        Insert: {
          booking_id: string;
          comment?: string | null;
          created_at?: string;
          direction: Database['public']['Enums']['review_direction'];
          id?: string;
          reviewer_id: string;
          shop_id: string;
          stars: number;
          tags?: string[];
          worker_id: string;
        };
        Update: {
          booking_id?: string;
          comment?: string | null;
          created_at?: string;
          direction?: Database['public']['Enums']['review_direction'];
          id?: string;
          reviewer_id?: string;
          shop_id?: string;
          stars?: number;
          tags?: string[];
          worker_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reviews_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_reviewer_id_fkey';
            columns: ['reviewer_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_shop_id_fkey';
            columns: ['shop_id'];
            isOneToOne: false;
            referencedRelation: 'shops';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_worker_id_fkey';
            columns: ['worker_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      shift_invites: {
        Row: {
          created_at: string;
          id: string;
          message: string | null;
          responded_at: string | null;
          shift_id: string;
          shop_id: string;
          status: Database['public']['Enums']['invite_status'];
          worker_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          message?: string | null;
          responded_at?: string | null;
          shift_id: string;
          shop_id: string;
          status?: Database['public']['Enums']['invite_status'];
          worker_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          message?: string | null;
          responded_at?: string | null;
          shift_id?: string;
          shop_id?: string;
          status?: Database['public']['Enums']['invite_status'];
          worker_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'shift_invites_shift_id_fkey';
            columns: ['shift_id'];
            isOneToOne: false;
            referencedRelation: 'shifts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'shift_invites_shop_id_fkey';
            columns: ['shop_id'];
            isOneToOne: false;
            referencedRelation: 'shops';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'shift_invites_worker_id_fkey';
            columns: ['worker_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      shifts: {
        Row: {
          break_minutes: number;
          cancel_reason: string | null;
          cancelled_at: string | null;
          created_at: string;
          description: string | null;
          end_at: string;
          est_fee_per_seat: number;
          est_wage_per_seat: number;
          favorites_only_until: string | null;
          fee_rate: number;
          filled_at: string | null;
          filled_count: number;
          headcount: number;
          hold_amount: number;
          hourly_rate: number;
          id: string;
          is_urgent: boolean;
          min_rating: number;
          period: unknown;
          position_code: string;
          published_at: string;
          requirements: string | null;
          shop_id: string;
          start_at: string;
          status: Database['public']['Enums']['shift_status'];
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          break_minutes?: number;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          description?: string | null;
          end_at: string;
          est_fee_per_seat: number;
          est_wage_per_seat: number;
          favorites_only_until?: string | null;
          fee_rate: number;
          filled_at?: string | null;
          filled_count?: number;
          headcount: number;
          hold_amount?: number;
          hourly_rate: number;
          id?: string;
          is_urgent?: boolean;
          min_rating?: number;
          period?: never;
          position_code: string;
          published_at?: string;
          requirements?: string | null;
          shop_id: string;
          start_at: string;
          status?: Database['public']['Enums']['shift_status'];
          title: string;
          updated_at?: string;
        };
        Update: {
          break_minutes?: number;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          description?: string | null;
          end_at?: string;
          est_fee_per_seat?: number;
          est_wage_per_seat?: number;
          favorites_only_until?: string | null;
          fee_rate?: number;
          filled_at?: string | null;
          filled_count?: number;
          headcount?: number;
          hold_amount?: number;
          hourly_rate?: number;
          id?: string;
          is_urgent?: boolean;
          min_rating?: number;
          period?: never;
          position_code?: string;
          published_at?: string;
          requirements?: string | null;
          shop_id?: string;
          start_at?: string;
          status?: Database['public']['Enums']['shift_status'];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'shifts_position_code_fkey';
            columns: ['position_code'];
            isOneToOne: false;
            referencedRelation: 'positions';
            referencedColumns: ['code'];
          },
          {
            foreignKeyName: 'shifts_shop_id_fkey';
            columns: ['shop_id'];
            isOneToOne: false;
            referencedRelation: 'shops';
            referencedColumns: ['id'];
          },
        ];
      };
      shop_worker_lists: {
        Row: {
          created_at: string;
          list_type: Database['public']['Enums']['worker_list_type'];
          note: string | null;
          shop_id: string;
          worker_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          list_type: Database['public']['Enums']['worker_list_type'];
          note?: string | null;
          shop_id: string;
          worker_id: string;
        };
        Update: {
          created_at?: string;
          list_type?: Database['public']['Enums']['worker_list_type'];
          note?: string | null;
          shop_id?: string;
          worker_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'shop_worker_lists_shop_id_fkey';
            columns: ['shop_id'];
            isOneToOne: false;
            referencedRelation: 'shops';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'shop_worker_lists_worker_id_fkey';
            columns: ['worker_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      shops: {
        Row: {
          address: string;
          category: Database['public']['Enums']['shop_category'];
          city: string;
          cover_url: string | null;
          created_at: string;
          description: string | null;
          district: string | null;
          geofence_radius_m: number;
          id: string;
          is_active: boolean;
          location: unknown;
          name: string;
          owner_id: string;
          phone: string | null;
          rating_avg: number;
          rating_count: number;
          updated_at: string;
          verification_status: Database['public']['Enums']['verification_status'];
        };
        ComputedFields: never;
        Insert: {
          address: string;
          category?: Database['public']['Enums']['shop_category'];
          city?: string;
          cover_url?: string | null;
          created_at?: string;
          description?: string | null;
          district?: string | null;
          geofence_radius_m?: number;
          id?: string;
          is_active?: boolean;
          location: unknown;
          name: string;
          owner_id: string;
          phone?: string | null;
          rating_avg?: number;
          rating_count?: number;
          updated_at?: string;
          verification_status?: Database['public']['Enums']['verification_status'];
        };
        Update: {
          address?: string;
          category?: Database['public']['Enums']['shop_category'];
          city?: string;
          cover_url?: string | null;
          created_at?: string;
          description?: string | null;
          district?: string | null;
          geofence_radius_m?: number;
          id?: string;
          is_active?: boolean;
          location?: unknown;
          name?: string;
          owner_id?: string;
          phone?: string | null;
          rating_avg?: number;
          rating_count?: number;
          updated_at?: string;
          verification_status?: Database['public']['Enums']['verification_status'];
        };
        Relationships: [
          {
            foreignKeyName: 'shops_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      wallet_transactions: {
        Row: {
          balance_after: number;
          balance_delta: number;
          created_at: string;
          held_after: number;
          held_delta: number;
          id: number;
          note: string | null;
          ref_id: string | null;
          ref_type: string | null;
          type: Database['public']['Enums']['txn_type'];
          wallet_id: string;
        };
        ComputedFields: never;
        Insert: {
          balance_after: number;
          balance_delta?: number;
          created_at?: string;
          held_after: number;
          held_delta?: number;
          id?: never;
          note?: string | null;
          ref_id?: string | null;
          ref_type?: string | null;
          type: Database['public']['Enums']['txn_type'];
          wallet_id: string;
        };
        Update: {
          balance_after?: number;
          balance_delta?: number;
          created_at?: string;
          held_after?: number;
          held_delta?: number;
          id?: never;
          note?: string | null;
          ref_id?: string | null;
          ref_type?: string | null;
          type?: Database['public']['Enums']['txn_type'];
          wallet_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'wallet_transactions_wallet_id_fkey';
            columns: ['wallet_id'];
            isOneToOne: false;
            referencedRelation: 'wallets';
            referencedColumns: ['id'];
          },
        ];
      };
      wallets: {
        Row: {
          balance: number;
          held_balance: number;
          id: string;
          owner_id: string | null;
          type: Database['public']['Enums']['wallet_type'];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          balance?: number;
          held_balance?: number;
          id?: string;
          owner_id?: string | null;
          type: Database['public']['Enums']['wallet_type'];
          updated_at?: string;
        };
        Update: {
          balance?: number;
          held_balance?: number;
          id?: string;
          owner_id?: string | null;
          type?: Database['public']['Enums']['wallet_type'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'wallets_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      worker_profiles: {
        Row: {
          bank_account_name: string | null;
          bank_account_no: string | null;
          bank_bin: string | null;
          bio: string | null;
          completed_count: number;
          created_at: string;
          date_of_birth: string;
          home_location: unknown;
          kyc_status: Database['public']['Enums']['verification_status'];
          no_show_count: number;
          rating_avg: number;
          rating_count: number;
          school: string | null;
          skills: string[];
          suspended_until: string | null;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          bank_account_name?: string | null;
          bank_account_no?: string | null;
          bank_bin?: string | null;
          bio?: string | null;
          completed_count?: number;
          created_at?: string;
          date_of_birth: string;
          home_location?: unknown;
          kyc_status?: Database['public']['Enums']['verification_status'];
          no_show_count?: number;
          rating_avg?: number;
          rating_count?: number;
          school?: string | null;
          skills?: string[];
          suspended_until?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          bank_account_name?: string | null;
          bank_account_no?: string | null;
          bank_bin?: string | null;
          bio?: string | null;
          completed_count?: number;
          created_at?: string;
          date_of_birth?: string;
          home_location?: unknown;
          kyc_status?: Database['public']['Enums']['verification_status'];
          no_show_count?: number;
          rating_avg?: number;
          rating_count?: number;
          school?: string | null;
          skills?: string[];
          suspended_until?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'worker_profiles_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      v_kpi_daily: {
        Row: {
          bookings_completed: number | null;
          day: string | null;
          fee_revenue: number | null;
          fill_rate: number | null;
          gmv: number | null;
          late_cancels: number | null;
          median_minutes_to_fill: number | null;
          no_shows: number | null;
          seats_filled: number | null;
          seats_posted: number | null;
          shifts_posted: number | null;
        };
        ComputedFields: never;
        Relationships: [];
      };
    };
    Functions: {
      app_setting: { Args: { p_key: string }; Returns: Json };
      app_setting_int: { Args: { p_key: string }; Returns: number };
      app_setting_num: { Args: { p_key: string }; Returns: number };
      calc_fee: { Args: { p_fee_rate: number; p_wage: number }; Returns: number };
      calc_wage: { Args: { p_hourly_rate: number; p_minutes: number }; Returns: number };
      demo_flag: { Args: { p_flag: string }; Returns: boolean };
      fmt_time: { Args: { p: string }; Returns: string };
      fmt_vnd: { Args: { p: number }; Returns: string };
      fn_apply_penalty: { Args: { p_worker: string }; Returns: undefined };
      fn_approve_booking: {
        Args: { p_actor: string; p_booking_id: string; p_note?: string; p_worked_minutes?: number };
        Returns: {
          adjustment_note: string | null;
          approved_at: string | null;
          approved_by: string | null;
          auto_checked_out: boolean;
          booked_at: string;
          cancel_reason: string | null;
          cancelled_at: string | null;
          cancelled_by: Database['public']['Enums']['actor_type'] | null;
          check_in_at: string | null;
          check_in_distance_m: number | null;
          check_out_at: string | null;
          check_out_distance_m: number | null;
          compensation_amount: number;
          created_at: string;
          fee_amount: number | null;
          id: string;
          is_late: boolean;
          penalty_points: number;
          period: unknown;
          reminder_sent_at: string | null;
          seat_hold: number;
          settled_at: string | null;
          shift_id: string;
          shop_id: string;
          source: Database['public']['Enums']['booking_source'];
          status: Database['public']['Enums']['booking_status'];
          updated_at: string;
          wage_amount: number | null;
          worked_minutes: number | null;
          worker_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'bookings';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      fn_book_shift: {
        Args: {
          p_actor: string;
          p_shift_id: string;
          p_source?: Database['public']['Enums']['booking_source'];
        };
        Returns: {
          adjustment_note: string | null;
          approved_at: string | null;
          approved_by: string | null;
          auto_checked_out: boolean;
          booked_at: string;
          cancel_reason: string | null;
          cancelled_at: string | null;
          cancelled_by: Database['public']['Enums']['actor_type'] | null;
          check_in_at: string | null;
          check_in_distance_m: number | null;
          check_out_at: string | null;
          check_out_distance_m: number | null;
          compensation_amount: number;
          created_at: string;
          fee_amount: number | null;
          id: string;
          is_late: boolean;
          penalty_points: number;
          period: unknown;
          reminder_sent_at: string | null;
          seat_hold: number;
          settled_at: string | null;
          shift_id: string;
          shop_id: string;
          source: Database['public']['Enums']['booking_source'];
          status: Database['public']['Enums']['booking_status'];
          updated_at: string;
          wage_amount: number | null;
          worked_minutes: number | null;
          worker_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'bookings';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      fn_boost_shift: {
        Args: { p_actor: string; p_shift_id: string };
        Returns: {
          break_minutes: number;
          cancel_reason: string | null;
          cancelled_at: string | null;
          created_at: string;
          description: string | null;
          end_at: string;
          est_fee_per_seat: number;
          est_wage_per_seat: number;
          favorites_only_until: string | null;
          fee_rate: number;
          filled_at: string | null;
          filled_count: number;
          headcount: number;
          hold_amount: number;
          hourly_rate: number;
          id: string;
          is_urgent: boolean;
          min_rating: number;
          period: unknown;
          position_code: string;
          published_at: string;
          requirements: string | null;
          shop_id: string;
          start_at: string;
          status: Database['public']['Enums']['shift_status'];
          title: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'shifts';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      fn_cancel_booking: {
        Args: { p_actor: string; p_booking_id: string; p_reason?: string };
        Returns: {
          adjustment_note: string | null;
          approved_at: string | null;
          approved_by: string | null;
          auto_checked_out: boolean;
          booked_at: string;
          cancel_reason: string | null;
          cancelled_at: string | null;
          cancelled_by: Database['public']['Enums']['actor_type'] | null;
          check_in_at: string | null;
          check_in_distance_m: number | null;
          check_out_at: string | null;
          check_out_distance_m: number | null;
          compensation_amount: number;
          created_at: string;
          fee_amount: number | null;
          id: string;
          is_late: boolean;
          penalty_points: number;
          period: unknown;
          reminder_sent_at: string | null;
          seat_hold: number;
          settled_at: string | null;
          shift_id: string;
          shop_id: string;
          source: Database['public']['Enums']['booking_source'];
          status: Database['public']['Enums']['booking_status'];
          updated_at: string;
          wage_amount: number | null;
          worked_minutes: number | null;
          worker_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'bookings';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      fn_cancel_shift: {
        Args: { p_actor: string; p_reason: string; p_shift_id: string };
        Returns: {
          break_minutes: number;
          cancel_reason: string | null;
          cancelled_at: string | null;
          created_at: string;
          description: string | null;
          end_at: string;
          est_fee_per_seat: number;
          est_wage_per_seat: number;
          favorites_only_until: string | null;
          fee_rate: number;
          filled_at: string | null;
          filled_count: number;
          headcount: number;
          hold_amount: number;
          hourly_rate: number;
          id: string;
          is_urgent: boolean;
          min_rating: number;
          period: unknown;
          position_code: string;
          published_at: string;
          requirements: string | null;
          shop_id: string;
          start_at: string;
          status: Database['public']['Enums']['shift_status'];
          title: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'shifts';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      fn_complete_onboarding: {
        Args: {
          p_actor: string;
          p_date_of_birth?: string;
          p_full_name: string;
          p_phone?: string;
          p_role: Database['public']['Enums']['user_role'];
        };
        Returns: {
          avatar_url: string | null;
          created_at: string;
          full_name: string;
          id: string;
          onboarded_at: string | null;
          phone: string | null;
          role: Database['public']['Enums']['user_role'];
          status: Database['public']['Enums']['account_status'];
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'profiles';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      fn_complete_withdrawal: {
        Args: {
          p_order_id: string;
          p_provider_txn_id?: string;
          p_reason?: string;
          p_success: boolean;
        };
        Returns: {
          amount: number;
          bank_snapshot: Json | null;
          completed_at: string | null;
          created_at: string;
          expires_at: string | null;
          failure_reason: string | null;
          id: string;
          idempotency_key: string | null;
          kind: Database['public']['Enums']['payment_kind'];
          provider: string;
          provider_txn_id: string | null;
          reference_code: string;
          status: Database['public']['Enums']['payment_status'];
          updated_at: string;
          wallet_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'payment_orders';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      fn_compute_timesheet: {
        Args: {
          p_auto: boolean;
          p_booking_id: string;
          p_check_out_at: string;
          p_distance_m: number;
        };
        Returns: {
          adjustment_note: string | null;
          approved_at: string | null;
          approved_by: string | null;
          auto_checked_out: boolean;
          booked_at: string;
          cancel_reason: string | null;
          cancelled_at: string | null;
          cancelled_by: Database['public']['Enums']['actor_type'] | null;
          check_in_at: string | null;
          check_in_distance_m: number | null;
          check_out_at: string | null;
          check_out_distance_m: number | null;
          compensation_amount: number;
          created_at: string;
          fee_amount: number | null;
          id: string;
          is_late: boolean;
          penalty_points: number;
          period: unknown;
          reminder_sent_at: string | null;
          seat_hold: number;
          settled_at: string | null;
          shift_id: string;
          shop_id: string;
          source: Database['public']['Enums']['booking_source'];
          status: Database['public']['Enums']['booking_status'];
          updated_at: string;
          wage_amount: number | null;
          worked_minutes: number | null;
          worker_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'bookings';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      fn_confirm_topup: {
        Args: {
          p_amount: number;
          p_provider?: string;
          p_provider_txn_id?: string;
          p_reference_code: string;
        };
        Returns: {
          amount: number;
          bank_snapshot: Json | null;
          completed_at: string | null;
          created_at: string;
          expires_at: string | null;
          failure_reason: string | null;
          id: string;
          idempotency_key: string | null;
          kind: Database['public']['Enums']['payment_kind'];
          provider: string;
          provider_txn_id: string | null;
          reference_code: string;
          status: Database['public']['Enums']['payment_status'];
          updated_at: string;
          wallet_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'payment_orders';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      fn_create_topup: {
        Args: { p_actor: string; p_amount: number; p_idempotency_key?: string };
        Returns: {
          amount: number;
          bank_snapshot: Json | null;
          completed_at: string | null;
          created_at: string;
          expires_at: string | null;
          failure_reason: string | null;
          id: string;
          idempotency_key: string | null;
          kind: Database['public']['Enums']['payment_kind'];
          provider: string;
          provider_txn_id: string | null;
          reference_code: string;
          status: Database['public']['Enums']['payment_status'];
          updated_at: string;
          wallet_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'payment_orders';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      fn_cron_auto_approve: { Args: Record<PropertyKey, never>; Returns: number };
      fn_cron_auto_checkout: { Args: Record<PropertyKey, never>; Returns: number };
      fn_cron_complete_shifts: { Args: Record<PropertyKey, never>; Returns: number };
      fn_cron_expire_payments: { Args: Record<PropertyKey, never>; Returns: number };
      fn_cron_mark_no_shows: { Args: Record<PropertyKey, never>; Returns: number };
      fn_cron_send_reminders: { Args: Record<PropertyKey, never>; Returns: number };
      fn_cron_start_shifts: { Args: Record<PropertyKey, never>; Returns: number };
      fn_cron_tick: { Args: Record<PropertyKey, never>; Returns: Json };
      fn_demo_fast_forward: {
        Args: { p_shift_id: string; p_to: string };
        Returns: {
          break_minutes: number;
          cancel_reason: string | null;
          cancelled_at: string | null;
          created_at: string;
          description: string | null;
          end_at: string;
          est_fee_per_seat: number;
          est_wage_per_seat: number;
          favorites_only_until: string | null;
          fee_rate: number;
          filled_at: string | null;
          filled_count: number;
          headcount: number;
          hold_amount: number;
          hourly_rate: number;
          id: string;
          is_urgent: boolean;
          min_rating: number;
          period: unknown;
          position_code: string;
          published_at: string;
          requirements: string | null;
          shop_id: string;
          start_at: string;
          status: Database['public']['Enums']['shift_status'];
          title: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'shifts';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      fn_demo_reset: { Args: { p_days?: number; p_shop_balance?: number }; Returns: Json };
      fn_demo_seed_history: { Args: { p_days?: number }; Returns: number };
      fn_invite_workers: {
        Args: { p_actor: string; p_message?: string; p_shift_id: string; p_worker_ids: string[] };
        Returns: number;
      };
      fn_kpi_summary: { Args: { p_from: string; p_to: string }; Returns: Json };
      fn_ledger: {
        Args: {
          p_balance_delta: number;
          p_held_delta?: number;
          p_note?: string;
          p_ref_id?: string;
          p_ref_type?: string;
          p_type: Database['public']['Enums']['txn_type'];
          p_wallet_id: string;
        };
        Returns: {
          balance: number;
          held_balance: number;
          id: string;
          owner_id: string | null;
          type: Database['public']['Enums']['wallet_type'];
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'wallets';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      fn_notify: {
        Args: { p_body?: string; p_data?: Json; p_title: string; p_type: string; p_user: string };
        Returns: undefined;
      };
      fn_open_dispute: {
        Args: {
          p_actor: string;
          p_booking_id: string;
          p_description: string;
          p_reason_code: string;
        };
        Returns: {
          adjusted_minutes: number | null;
          booking_id: string;
          created_at: string;
          description: string;
          id: string;
          opened_by: string;
          opener_role: Database['public']['Enums']['actor_type'];
          prev_status: Database['public']['Enums']['booking_status'];
          reason_code: string;
          resolution: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          status: Database['public']['Enums']['dispute_status'];
        };
        SetofOptions: {
          from: '*';
          to: 'disputes';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      fn_publish_shift: {
        Args: {
          p_actor: string;
          p_break_minutes?: number;
          p_description?: string;
          p_end_at: string;
          p_favorites_only_minutes?: number;
          p_headcount: number;
          p_hourly_rate: number;
          p_is_urgent?: boolean;
          p_min_rating?: number;
          p_position_code: string;
          p_requirements?: string;
          p_shop_id: string;
          p_start_at: string;
          p_title: string;
        };
        Returns: {
          break_minutes: number;
          cancel_reason: string | null;
          cancelled_at: string | null;
          created_at: string;
          description: string | null;
          end_at: string;
          est_fee_per_seat: number;
          est_wage_per_seat: number;
          favorites_only_until: string | null;
          fee_rate: number;
          filled_at: string | null;
          filled_count: number;
          headcount: number;
          hold_amount: number;
          hourly_rate: number;
          id: string;
          is_urgent: boolean;
          min_rating: number;
          period: unknown;
          position_code: string;
          published_at: string;
          requirements: string | null;
          shop_id: string;
          start_at: string;
          status: Database['public']['Enums']['shift_status'];
          title: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'shifts';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      fn_record_attendance: {
        Args: {
          p_accuracy_m?: number;
          p_actor: string;
          p_booking_id: string;
          p_lat?: number;
          p_lng?: number;
          p_token_shop_id: string;
          p_token_window: number;
          p_type: Database['public']['Enums']['attendance_type'];
        };
        Returns: Json;
      };
      fn_request_withdrawal: {
        Args: { p_actor: string; p_amount: number; p_idempotency_key?: string };
        Returns: {
          amount: number;
          bank_snapshot: Json | null;
          completed_at: string | null;
          created_at: string;
          expires_at: string | null;
          failure_reason: string | null;
          id: string;
          idempotency_key: string | null;
          kind: Database['public']['Enums']['payment_kind'];
          provider: string;
          provider_txn_id: string | null;
          reference_code: string;
          status: Database['public']['Enums']['payment_status'];
          updated_at: string;
          wallet_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'payment_orders';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      fn_resize_shift: {
        Args: { p_actor: string; p_headcount: number; p_shift_id: string };
        Returns: {
          break_minutes: number;
          cancel_reason: string | null;
          cancelled_at: string | null;
          created_at: string;
          description: string | null;
          end_at: string;
          est_fee_per_seat: number;
          est_wage_per_seat: number;
          favorites_only_until: string | null;
          fee_rate: number;
          filled_at: string | null;
          filled_count: number;
          headcount: number;
          hold_amount: number;
          hourly_rate: number;
          id: string;
          is_urgent: boolean;
          min_rating: number;
          period: unknown;
          position_code: string;
          published_at: string;
          requirements: string | null;
          shop_id: string;
          start_at: string;
          status: Database['public']['Enums']['shift_status'];
          title: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'shifts';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      fn_resolve_dispute: {
        Args: {
          p_accept: boolean;
          p_adjusted_minutes?: number;
          p_admin: string;
          p_dispute_id: string;
          p_resolution: string;
        };
        Returns: {
          adjusted_minutes: number | null;
          booking_id: string;
          created_at: string;
          description: string;
          id: string;
          opened_by: string;
          opener_role: Database['public']['Enums']['actor_type'];
          prev_status: Database['public']['Enums']['booking_status'];
          reason_code: string;
          resolution: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          status: Database['public']['Enums']['dispute_status'];
        };
        SetofOptions: {
          from: '*';
          to: 'disputes';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      fn_respond_invite: {
        Args: { p_accept: boolean; p_actor: string; p_invite_id: string };
        Returns: Json;
      };
      fn_review_kyc: {
        Args: { p_admin: string; p_approve: boolean; p_reason?: string; p_submission_id: string };
        Returns: {
          back_image_path: string;
          created_at: string;
          front_image_path: string;
          id: string;
          id_last4: string | null;
          reject_reason: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          selfie_path: string;
          status: Database['public']['Enums']['verification_status'];
          worker_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'kyc_submissions';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      fn_settle_booking: {
        Args: {
          p_approved_by?: string;
          p_booking_id: string;
          p_note?: string;
          p_worked_minutes?: number;
        };
        Returns: {
          adjustment_note: string | null;
          approved_at: string | null;
          approved_by: string | null;
          auto_checked_out: boolean;
          booked_at: string;
          cancel_reason: string | null;
          cancelled_at: string | null;
          cancelled_by: Database['public']['Enums']['actor_type'] | null;
          check_in_at: string | null;
          check_in_distance_m: number | null;
          check_out_at: string | null;
          check_out_distance_m: number | null;
          compensation_amount: number;
          created_at: string;
          fee_amount: number | null;
          id: string;
          is_late: boolean;
          penalty_points: number;
          period: unknown;
          reminder_sent_at: string | null;
          seat_hold: number;
          settled_at: string | null;
          shift_id: string;
          shop_id: string;
          source: Database['public']['Enums']['booking_source'];
          status: Database['public']['Enums']['booking_status'];
          updated_at: string;
          wage_amount: number | null;
          worked_minutes: number | null;
          worker_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'bookings';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      fn_submit_kyc: {
        Args: {
          p_actor: string;
          p_back: string;
          p_front: string;
          p_id_last4?: string;
          p_selfie: string;
        };
        Returns: {
          back_image_path: string;
          created_at: string;
          front_image_path: string;
          id: string;
          id_last4: string | null;
          reject_reason: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          selfie_path: string;
          status: Database['public']['Enums']['verification_status'];
          worker_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'kyc_submissions';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      fn_submit_review: {
        Args: {
          p_actor: string;
          p_booking_id: string;
          p_comment?: string;
          p_stars: number;
          p_tags?: string[];
        };
        Returns: {
          booking_id: string;
          comment: string | null;
          created_at: string;
          direction: Database['public']['Enums']['review_direction'];
          id: string;
          reviewer_id: string;
          shop_id: string;
          stars: number;
          tags: string[];
          worker_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'reviews';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      owns_shop: { Args: { p_shop_id: string }; Returns: boolean };
      penalty_points_of: { Args: { p_worker: string }; Returns: number };
      platform_wallet: { Args: Record<PropertyKey, never>; Returns: string };
      search_shifts: {
        Args: {
          p_from?: string;
          p_lat: number;
          p_limit?: number;
          p_lng: number;
          p_min_rate?: number;
          p_offset?: number;
          p_positions?: string[];
          p_radius_m?: number;
          p_sort?: string;
          p_to?: string;
        };
        Returns: {
          distance_m: number;
          end_at: string;
          est_earning: number;
          favorites_only_until: string;
          filled_count: number;
          headcount: number;
          hourly_rate: number;
          is_urgent: boolean;
          lat: number;
          lng: number;
          match_score: number;
          position_code: string;
          shift_id: string;
          shop_address: string;
          shop_category: Database['public']['Enums']['shop_category'];
          shop_id: string;
          shop_name: string;
          shop_rating: number;
          start_at: string;
          title: string;
          total_count: number;
        }[];
      };
      wallet_of: { Args: { p_owner: string }; Returns: string };
    };
    Enums: {
      account_status: 'active' | 'locked';
      actor_type: 'worker' | 'shop' | 'system' | 'admin';
      attendance_type: 'check_in' | 'check_out';
      booking_source: 'marketplace' | 'invite';
      booking_status:
        | 'confirmed'
        | 'checked_in'
        | 'checked_out'
        | 'disputed'
        | 'completed'
        | 'cancelled'
        | 'no_show';
      dispute_status: 'open' | 'resolved' | 'rejected';
      invite_status: 'pending' | 'accepted' | 'declined' | 'expired';
      payment_kind: 'topup' | 'withdrawal';
      payment_status: 'pending' | 'succeeded' | 'failed' | 'expired';
      review_direction: 'worker_to_shop' | 'shop_to_worker';
      shift_status: 'open' | 'full' | 'in_progress' | 'completed' | 'cancelled' | 'expired';
      shop_category: 'cafe' | 'milk_tea' | 'restaurant' | 'bakery' | 'bar' | 'fast_food' | 'other';
      txn_type:
        | 'topup'
        | 'hold'
        | 'release'
        | 'shift_payment'
        | 'earning'
        | 'platform_fee'
        | 'boost_fee'
        | 'compensation'
        | 'withdrawal'
        | 'withdrawal_reversal'
        | 'adjustment';
      user_role: 'worker' | 'shop_owner' | 'admin';
      verification_status: 'unverified' | 'pending' | 'verified' | 'rejected';
      wallet_type: 'worker' | 'shop' | 'platform';
      worker_list_type: 'favorite' | 'blocked';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      account_status: ['active', 'locked'],
      actor_type: ['worker', 'shop', 'system', 'admin'],
      attendance_type: ['check_in', 'check_out'],
      booking_source: ['marketplace', 'invite'],
      booking_status: [
        'confirmed',
        'checked_in',
        'checked_out',
        'disputed',
        'completed',
        'cancelled',
        'no_show',
      ],
      dispute_status: ['open', 'resolved', 'rejected'],
      invite_status: ['pending', 'accepted', 'declined', 'expired'],
      payment_kind: ['topup', 'withdrawal'],
      payment_status: ['pending', 'succeeded', 'failed', 'expired'],
      review_direction: ['worker_to_shop', 'shop_to_worker'],
      shift_status: ['open', 'full', 'in_progress', 'completed', 'cancelled', 'expired'],
      shop_category: ['cafe', 'milk_tea', 'restaurant', 'bakery', 'bar', 'fast_food', 'other'],
      txn_type: [
        'topup',
        'hold',
        'release',
        'shift_payment',
        'earning',
        'platform_fee',
        'boost_fee',
        'compensation',
        'withdrawal',
        'withdrawal_reversal',
        'adjustment',
      ],
      user_role: ['worker', 'shop_owner', 'admin'],
      verification_status: ['unverified', 'pending', 'verified', 'rejected'],
      wallet_type: ['worker', 'shop', 'platform'],
      worker_list_type: ['favorite', 'blocked'],
    },
  },
} as const;
