export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admin_access: {
        Row: {
          created_at: string
          email: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      affiliate_conversions: {
        Row: {
          affiliate_id: string
          commission_amount: number
          conversion_date: string
          id: string
          is_paid: boolean
          payment_id: string | null
          referred_user_id: string
          subscription_plan: string
        }
        Insert: {
          affiliate_id: string
          commission_amount: number
          conversion_date?: string
          id?: string
          is_paid?: boolean
          payment_id?: string | null
          referred_user_id: string
          subscription_plan: string
        }
        Update: {
          affiliate_id?: string
          commission_amount?: number
          conversion_date?: string
          id?: string
          is_paid?: boolean
          payment_id?: string | null
          referred_user_id?: string
          subscription_plan?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_conversions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_conversions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "affiliate_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_conversions_referred_user_id_fkey"
            columns: ["referred_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_payments: {
        Row: {
          affiliate_id: string
          amount: number
          id: string
          payment_date: string
          payment_method: string
          payment_status: string
          week_end: string
          week_start: string
        }
        Insert: {
          affiliate_id: string
          amount: number
          id?: string
          payment_date?: string
          payment_method?: string
          payment_status?: string
          week_end: string
          week_start: string
        }
        Update: {
          affiliate_id?: string
          amount?: number
          id?: string
          payment_date?: string
          payment_method?: string
          payment_status?: string
          week_end?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_payments_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_payouts: {
        Row: {
          affiliate_id: string
          amount: number
          id: string
          payment_details: string | null
          payment_method: string
          payout_date: string
          period_end: string
          period_start: string
          processed_by: string | null
          status: string
        }
        Insert: {
          affiliate_id: string
          amount: number
          id?: string
          payment_details?: string | null
          payment_method: string
          payout_date?: string
          period_end: string
          period_start: string
          processed_by?: string | null
          status?: string
        }
        Update: {
          affiliate_id?: string
          amount?: number
          id?: string
          payment_details?: string | null
          payment_method?: string
          payout_date?: string
          period_end?: string
          period_start?: string
          processed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_payouts_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_referrals: {
        Row: {
          affiliate_id: string
          commission_amount: number | null
          id: string
          is_paid: boolean
          referred_user_gender: string
          referred_user_id: string
          signup_date: string
          subscription_date: string | null
        }
        Insert: {
          affiliate_id: string
          commission_amount?: number | null
          id?: string
          is_paid?: boolean
          referred_user_gender: string
          referred_user_id: string
          signup_date?: string
          subscription_date?: string | null
        }
        Update: {
          affiliate_id?: string
          commission_amount?: number | null
          id?: string
          is_paid?: boolean
          referred_user_gender?: string
          referred_user_id?: string
          signup_date?: string
          subscription_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_referrals_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_referrals_referred_user_id_fkey"
            columns: ["referred_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliates: {
        Row: {
          affiliate_code: string
          created_at: string
          id: string
          is_approved: boolean
          payment_email: string | null
          payment_method: string | null
          paypal_email: string | null
          preferred_payment_method: string | null
          total_earned: number
          total_paid: number
          user_id: string
          wise_email: string | null
        }
        Insert: {
          affiliate_code: string
          created_at?: string
          id?: string
          is_approved?: boolean
          payment_email?: string | null
          payment_method?: string | null
          paypal_email?: string | null
          preferred_payment_method?: string | null
          total_earned?: number
          total_paid?: number
          user_id: string
          wise_email?: string | null
        }
        Update: {
          affiliate_code?: string
          created_at?: string
          id?: string
          is_approved?: boolean
          payment_email?: string | null
          payment_method?: string | null
          paypal_email?: string | null
          preferred_payment_method?: string | null
          total_earned?: number
          total_paid?: number
          user_id?: string
          wise_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_profile_views: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user_id: string
          view_count: number
          view_date: string
          viewed_profiles: string[] | null
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          view_count?: number
          view_date?: string
          viewed_profiles?: string[] | null
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          view_count?: number
          view_date?: string
          viewed_profiles?: string[] | null
        }
        Relationships: []
      }
      email_reminders: {
        Row: {
          created_at: string
          id: string
          reminder_type: string
          sent_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reminder_type: string
          sent_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reminder_type?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      match_requests: {
        Row: {
          created_at: string
          id: string
          personality_compatibility: number | null
          reminder_final_sent: boolean | null
          reminder_first_sent: boolean | null
          reminder_second_sent: boolean | null
          requested_id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          personality_compatibility?: number | null
          reminder_final_sent?: boolean | null
          reminder_first_sent?: boolean | null
          reminder_second_sent?: boolean | null
          requested_id: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          personality_compatibility?: number | null
          reminder_final_sent?: boolean | null
          reminder_first_sent?: boolean | null
          reminder_second_sent?: boolean | null
          requested_id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_requests_requested_id_fkey"
            columns: ["requested_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          created_at: string
          id: string
          is_rematched: boolean | null
          photos_hidden: boolean | null
          rematched_by: string | null
          status: string
          unmatched_by: string | null
          user_one_id: string
          user_two_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_rematched?: boolean | null
          photos_hidden?: boolean | null
          rematched_by?: string | null
          status?: string
          unmatched_by?: string | null
          user_one_id: string
          user_two_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_rematched?: boolean | null
          photos_hidden?: boolean | null
          rematched_by?: string | null
          status?: string
          unmatched_by?: string | null
          user_one_id?: string
          user_two_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_user_one_id_fkey"
            columns: ["user_one_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_user_two_id_fkey"
            columns: ["user_two_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string
          created_at: string
          id: string
          read: boolean
          type: string
          user_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          id?: string
          read?: boolean
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          id?: string
          read?: boolean
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_history: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          description: string | null
          id: string
          payment_method: string | null
          payment_status: string
          stripe_payment_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          payment_method?: string | null
          payment_status: string
          stripe_payment_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          payment_method?: string | null
          payment_status?: string
          stripe_payment_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      personality_answers: {
        Row: {
          answer_value: number
          created_at: string
          id: string
          question_id: string
          user_id: string
        }
        Insert: {
          answer_value: number
          created_at?: string
          id?: string
          question_id: string
          user_id: string
        }
        Update: {
          answer_value?: number
          created_at?: string
          id?: string
          question_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personality_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "personality_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personality_answers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      personality_compatibility: {
        Row: {
          compatibility_score: number
          created_at: string
          id: string
          type_one: string
          type_two: string
        }
        Insert: {
          compatibility_score: number
          created_at?: string
          id?: string
          type_one: string
          type_two: string
        }
        Update: {
          compatibility_score?: number
          created_at?: string
          id?: string
          type_one?: string
          type_two?: string
        }
        Relationships: [
          {
            foreignKeyName: "personality_compatibility_type_one_fkey"
            columns: ["type_one"]
            isOneToOne: false
            referencedRelation: "personality_types"
            referencedColumns: ["type_code"]
          },
          {
            foreignKeyName: "personality_compatibility_type_two_fkey"
            columns: ["type_two"]
            isOneToOne: false
            referencedRelation: "personality_types"
            referencedColumns: ["type_code"]
          },
        ]
      }
      personality_questions: {
        Row: {
          created_at: string
          id: string
          question: string
          trait_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          question: string
          trait_type: string
        }
        Update: {
          created_at?: string
          id?: string
          question?: string
          trait_type?: string
        }
        Relationships: []
      }
      personality_results: {
        Row: {
          created_at: string
          e_i_score: number
          id: string
          j_p_score: number
          s_n_score: number
          t_f_score: number
          type_code: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          e_i_score: number
          id?: string
          j_p_score: number
          s_n_score: number
          t_f_score: number
          type_code: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          e_i_score?: number
          id?: string
          j_p_score?: number
          s_n_score?: number
          t_f_score?: number
          type_code?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personality_results_type_code_fkey"
            columns: ["type_code"]
            isOneToOne: false
            referencedRelation: "personality_types"
            referencedColumns: ["type_code"]
          },
          {
            foreignKeyName: "personality_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      personality_search_limits: {
        Row: {
          created_at: string
          id: string
          search_count: number
          search_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          search_count?: number
          search_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          search_count?: number
          search_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      personality_types: {
        Row: {
          created_at: string
          description: string
          id: string
          islamic_name: string
          type_code: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          islamic_name: string
          type_code: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          islamic_name?: string
          type_code?: string
        }
        Relationships: []
      }
      photo_reveal_requests: {
        Row: {
          created_at: string
          id: string
          requested_id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          requested_id: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          requested_id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_reveal_requests_requested_id_fkey"
            columns: ["requested_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_reveal_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          can_be_fetched: boolean | null
          country: string | null
          created_at: string | null
          date_of_birth: string | null
          display_name: string | null
          email: string | null
          email_notifications: boolean | null
          ethnicity: string[] | null
          first_name: string | null
          freemium_daily_views_used: number | null
          freemium_last_view_reset: string | null
          gender: string | null
          has_received_initial_allocation: boolean
          has_used_referral: boolean | null
          height_cm: number | null
          highest_education: string | null
          id: string
          is_canceled: boolean | null
          is_freemium: boolean | null
          islamic_practices: string | null
          last_name: string | null
          last_online: string | null
          last_seen: string | null
          looking_for_age_max: number | null
          looking_for_age_min: number | null
          looking_for_country: string[] | null
          looking_for_ethnicity: string[] | null
          looking_for_height_max: number | null
          looking_for_height_min: number | null
          looking_for_summary: string | null
          marital_status: string | null
          next_payment_date: string | null
          onboarding_completed: boolean | null
          open_to_all_countries: boolean | null
          open_to_all_ethnicities: boolean | null
          payment_reminder_sent: boolean | null
          phone_number: string | null
          photos: string[] | null
          profession: string | null
          referred_by: string | null
          renewal_date: string | null
          requests_remaining: number | null
          salah: string | null
          sect: string | null
          self_summary: string | null
          skip_photos: boolean | null
          stripe_customer_id: string | null
          subscription_id: string | null
          subscription_plan: string | null
          subscription_status: string | null
          updated_at: string | null
          wali_email: string | null
          wali_name: string | null
          wali_phone: string | null
          weight_kg: number | null
        }
        Insert: {
          can_be_fetched?: boolean | null
          country?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          display_name?: string | null
          email?: string | null
          email_notifications?: boolean | null
          ethnicity?: string[] | null
          first_name?: string | null
          freemium_daily_views_used?: number | null
          freemium_last_view_reset?: string | null
          gender?: string | null
          has_received_initial_allocation?: boolean
          has_used_referral?: boolean | null
          height_cm?: number | null
          highest_education?: string | null
          id: string
          is_canceled?: boolean | null
          is_freemium?: boolean | null
          islamic_practices?: string | null
          last_name?: string | null
          last_online?: string | null
          last_seen?: string | null
          looking_for_age_max?: number | null
          looking_for_age_min?: number | null
          looking_for_country?: string[] | null
          looking_for_ethnicity?: string[] | null
          looking_for_height_max?: number | null
          looking_for_height_min?: number | null
          looking_for_summary?: string | null
          marital_status?: string | null
          next_payment_date?: string | null
          onboarding_completed?: boolean | null
          open_to_all_countries?: boolean | null
          open_to_all_ethnicities?: boolean | null
          payment_reminder_sent?: boolean | null
          phone_number?: string | null
          photos?: string[] | null
          profession?: string | null
          referred_by?: string | null
          renewal_date?: string | null
          requests_remaining?: number | null
          salah?: string | null
          sect?: string | null
          self_summary?: string | null
          skip_photos?: boolean | null
          stripe_customer_id?: string | null
          subscription_id?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          updated_at?: string | null
          wali_email?: string | null
          wali_name?: string | null
          wali_phone?: string | null
          weight_kg?: number | null
        }
        Update: {
          can_be_fetched?: boolean | null
          country?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          display_name?: string | null
          email?: string | null
          email_notifications?: boolean | null
          ethnicity?: string[] | null
          first_name?: string | null
          freemium_daily_views_used?: number | null
          freemium_last_view_reset?: string | null
          gender?: string | null
          has_received_initial_allocation?: boolean
          has_used_referral?: boolean | null
          height_cm?: number | null
          highest_education?: string | null
          id?: string
          is_canceled?: boolean | null
          is_freemium?: boolean | null
          islamic_practices?: string | null
          last_name?: string | null
          last_online?: string | null
          last_seen?: string | null
          looking_for_age_max?: number | null
          looking_for_age_min?: number | null
          looking_for_country?: string[] | null
          looking_for_ethnicity?: string[] | null
          looking_for_height_max?: number | null
          looking_for_height_min?: number | null
          looking_for_summary?: string | null
          marital_status?: string | null
          next_payment_date?: string | null
          onboarding_completed?: boolean | null
          open_to_all_countries?: boolean | null
          open_to_all_ethnicities?: boolean | null
          payment_reminder_sent?: boolean | null
          phone_number?: string | null
          photos?: string[] | null
          profession?: string | null
          referred_by?: string | null
          renewal_date?: string | null
          requests_remaining?: number | null
          salah?: string | null
          sect?: string | null
          self_summary?: string | null
          skip_photos?: boolean | null
          stripe_customer_id?: string | null
          subscription_id?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          updated_at?: string | null
          wali_email?: string | null
          wali_name?: string | null
          wali_phone?: string | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      referral_bonuses: {
        Row: {
          bonus_amount: number
          created_at: string | null
          id: string
          referred_id: string
          referrer_id: string
        }
        Insert: {
          bonus_amount: number
          created_at?: string | null
          id?: string
          referred_id: string
          referrer_id: string
        }
        Update: {
          bonus_amount?: number
          created_at?: string | null
          id?: string
          referred_id?: string
          referrer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_bonuses_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_bonuses_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_profiles: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activities: {
        Row: {
          activity_type: string
          created_at: string
          id: string
          plan_name: string | null
          user_display_name: string
          user_location: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string
          id?: string
          plan_name?: string | null
          user_display_name: string
          user_location?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string
          id?: string
          plan_name?: string | null
          user_display_name?: string
          user_location?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_female_referral_bonus: {
        Args: { referrer_id: string; referred_id: string; bonus_amount: number }
        Returns: undefined
      }
      add_referral_bonus: {
        Args: { referrer_id: string; referred_id: string; bonus_amount: number }
        Returns: undefined
      }
      allocate_monthly_requests: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      begin_transaction: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      calculate_new_earned_amount: {
        Args: { p_affiliate_id: string; p_add_amount: number }
        Returns: number
      }
      calculate_new_requests_amount: {
        Args: { p_user_id: string; p_add_amount: number }
        Returns: number
      }
      check_and_send_payment_reminders: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      commit_transaction: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      delete_user_account: {
        Args: { target_user_id: string }
        Returns: Json
      }
      find_personality_match: {
        Args: {
          user_id: string
          opposite_gender: string
          min_age?: number
          max_age?: number
          countries?: string[]
          ethnicities?: string[]
          open_to_all_countries?: boolean
          open_to_all_ethnicities?: boolean
        }
        Returns: {
          id: string
          first_name: string
          last_name: string
          display_name: string
          age: number
          personality_compatibility: number
          photos: string[]
        }[]
      }
      get_affiliate_code: {
        Args: { p_user_id: string }
        Returns: string
      }
      get_daily_view_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_unread_notification_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_user_notifications: {
        Args: { p_user_id: string; p_limit?: number }
        Returns: {
          id: string
          type: string
          created_at: string
          read: boolean
          actor_first_name: string
          actor_display_name: string
        }[]
      }
      increment_daily_views: {
        Args: { p_user_id: string }
        Returns: number
      }
      is_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      manual_register_affiliate: {
        Args: { p_user_id: string }
        Returns: string
      }
      mark_notifications_read: {
        Args: { p_user_id: string; p_notification_ids: string[] }
        Returns: undefined
      }
      process_affiliate_commission: {
        Args:
          | {
              referred_user_id: string
              subscription_plan: string
              referred_by_code: string
            }
          | { user_id: string }
        Returns: boolean
      }
      register_affiliate: {
        Args: { user_id: string }
        Returns: string
      }
      rollback_transaction: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      track_affiliate_referral: {
        Args: {
          affiliate_code: string
          referred_user_id: string
          gender: string
        }
        Returns: string
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
