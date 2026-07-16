export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["category_kind"]
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["category_kind"]
          name: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["category_kind"]
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      debt_payments: {
        Row: {
          amount_cents: number
          covered_minimum: boolean
          created_at: string
          debt_id: string
          id: string
          months_decremented: number
          payment_date: string
          transaction_id: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          covered_minimum: boolean
          created_at?: string
          debt_id: string
          id?: string
          months_decremented?: number
          payment_date: string
          transaction_id: string
          user_id?: string
        }
        Update: {
          amount_cents?: number
          covered_minimum?: boolean
          created_at?: string
          debt_id?: string
          id?: string
          months_decremented?: number
          payment_date?: string
          transaction_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "debt_payments_debt_id_fkey"
            columns: ["debt_id"]
            isOneToOne: false
            referencedRelation: "debts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_payments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      debts: {
        Row: {
          created_at: string
          due_day: number
          id: string
          minimum_payment_cents: number
          name: string
          remaining_months: number
          start_date: string
          status: Database["public"]["Enums"]["debt_status"]
          total_months: number
          user_id: string
        }
        Insert: {
          created_at?: string
          due_day: number
          id?: string
          minimum_payment_cents: number
          name: string
          remaining_months: number
          start_date: string
          status?: Database["public"]["Enums"]["debt_status"]
          total_months: number
          user_id?: string
        }
        Update: {
          created_at?: string
          due_day?: number
          id?: string
          minimum_payment_cents?: number
          name?: string
          remaining_months?: number
          start_date?: string
          status?: Database["public"]["Enums"]["debt_status"]
          total_months?: number
          user_id?: string
        }
        Relationships: []
      }
      investment_contributions: {
        Row: {
          amount_cents: number
          contrib_date: string
          created_at: string
          id: string
          investment_id: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          contrib_date: string
          created_at?: string
          id?: string
          investment_id: string
          user_id?: string
        }
        Update: {
          amount_cents?: number
          contrib_date?: string
          created_at?: string
          id?: string
          investment_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_contributions_investment_id_fkey"
            columns: ["investment_id"]
            isOneToOne: false
            referencedRelation: "investments"
            referencedColumns: ["id"]
          },
        ]
      }
      investments: {
        Row: {
          contributed_total_cents: number
          created_at: string
          id: string
          market_value_cents: number
          name: string
          user_id: string
        }
        Insert: {
          contributed_total_cents?: number
          created_at?: string
          id?: string
          market_value_cents?: number
          name: string
          user_id?: string
        }
        Update: {
          contributed_total_cents?: number
          created_at?: string
          id?: string
          market_value_cents?: number
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      recommended_items: {
        Row: {
          category_id: string | null
          created_at: string
          description: string
          expected_amount_cents: number | null
          id: string
          repeat_mode: Database["public"]["Enums"]["recommend_repeat"]
          type: Database["public"]["Enums"]["tx_type"]
          user_id: string
          window_end: string | null
          window_start: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string
          expected_amount_cents?: number | null
          id?: string
          repeat_mode?: Database["public"]["Enums"]["recommend_repeat"]
          type: Database["public"]["Enums"]["tx_type"]
          user_id?: string
          window_end?: string | null
          window_start: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string
          expected_amount_cents?: number | null
          id?: string
          repeat_mode?: Database["public"]["Enums"]["recommend_repeat"]
          type?: Database["public"]["Enums"]["tx_type"]
          user_id?: string
          window_end?: string | null
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommended_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      totals: {
        Row: {
          liquid_cash_cents: number
          total_invested_cents: number
          updated_at: string
          user_id: string
        }
        Insert: {
          liquid_cash_cents?: number
          total_invested_cents?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          liquid_cash_cents?: number
          total_invested_cents?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount_cents: number
          category_id: string | null
          created_at: string
          debt_id: string | null
          description: string
          id: string
          recurrence: Database["public"]["Enums"]["recurrence"]
          tx_date: string
          type: Database["public"]["Enums"]["tx_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          category_id?: string | null
          created_at?: string
          debt_id?: string | null
          description?: string
          id?: string
          recurrence?: Database["public"]["Enums"]["recurrence"]
          tx_date: string
          type: Database["public"]["Enums"]["tx_type"]
          updated_at?: string
          user_id?: string
        }
        Update: {
          amount_cents?: number
          category_id?: string | null
          created_at?: string
          debt_id?: string | null
          description?: string
          id?: string
          recurrence?: Database["public"]["Enums"]["recurrence"]
          tx_date?: string
          type?: Database["public"]["Enums"]["tx_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_debt_id_fkey"
            columns: ["debt_id"]
            isOneToOne: false
            referencedRelation: "debts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      pg_all_foreign_keys: {
        Row: {
          fk_columns: unknown[] | null
          fk_constraint_name: unknown
          fk_schema_name: unknown
          fk_table_name: unknown
          fk_table_oid: unknown
          is_deferrable: boolean | null
          is_deferred: boolean | null
          match_type: string | null
          on_delete: string | null
          on_update: string | null
          pk_columns: unknown[] | null
          pk_constraint_name: unknown
          pk_index_name: unknown
          pk_schema_name: unknown
          pk_table_name: unknown
          pk_table_oid: unknown
        }
        Relationships: []
      }
      reconciliation: {
        Row: {
          computed_liquid_cash_cents: number | null
          computed_total_invested_cents: number | null
          liquid_cash_drift: number | null
          stored_liquid_cash_cents: number | null
          stored_total_invested_cents: number | null
          total_invested_drift: number | null
          user_id: string | null
        }
        Relationships: []
      }
      tap_funky: {
        Row: {
          args: string | null
          is_definer: boolean | null
          is_strict: boolean | null
          is_visible: boolean | null
          kind: unknown
          langoid: unknown
          name: unknown
          oid: unknown
          owner: unknown
          returns: string | null
          returns_set: boolean | null
          schema: unknown
          volatility: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _cleanup: { Args: never; Returns: boolean }
      _contract_on: { Args: { "": string }; Returns: unknown }
      _currtest: { Args: never; Returns: number }
      _db_privs: { Args: never; Returns: unknown[] }
      _extensions: { Args: never; Returns: unknown[] }
      _get: { Args: { "": string }; Returns: number }
      _get_latest: { Args: { "": string }; Returns: number[] }
      _get_note: { Args: { "": string }; Returns: string }
      _is_verbose: { Args: never; Returns: boolean }
      _prokind: { Args: { p_oid: unknown }; Returns: unknown }
      _query: { Args: { "": string }; Returns: string }
      _refine_vol: { Args: { "": string }; Returns: string }
      _retval: { Args: { "": string }; Returns: string }
      _table_privs: { Args: never; Returns: unknown[] }
      _temptypes: { Args: { "": string }; Returns: string }
      _todo: { Args: never; Returns: string }
      col_is_null:
        | {
            Args: {
              column_name: unknown
              description?: string
              schema_name: unknown
              table_name: unknown
            }
            Returns: string
          }
        | {
            Args: {
              column_name: unknown
              description?: string
              table_name: unknown
            }
            Returns: string
          }
      col_not_null:
        | {
            Args: {
              column_name: unknown
              description?: string
              schema_name: unknown
              table_name: unknown
            }
            Returns: string
          }
        | {
            Args: {
              column_name: unknown
              description?: string
              table_name: unknown
            }
            Returns: string
          }
      delete_category: {
        Args: { p_category_id: string }
        Returns: Record<string, unknown>
      }
      diag:
        | {
            Args: { msg: unknown }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.diag(msg => text), public.diag(msg => anyelement). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { msg: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.diag(msg => text), public.diag(msg => anyelement). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      diag_test_name: { Args: { "": string }; Returns: string }
      do_tap:
        | { Args: never; Returns: string[] }
        | { Args: { "": string }; Returns: string[] }
      fail:
        | { Args: never; Returns: string }
        | { Args: { "": string }; Returns: string }
      findfuncs: { Args: { "": string }; Returns: string[] }
      finish: { Args: { exception_on_failure?: boolean }; Returns: string[] }
      format_type_string: { Args: { "": string }; Returns: string }
      has_unique: { Args: { "": string }; Returns: string }
      in_todo: { Args: never; Returns: boolean }
      is_empty: { Args: { "": string }; Returns: string }
      isnt_empty: { Args: { "": string }; Returns: string }
      lives_ok: { Args: { "": string }; Returns: string }
      missing_recommendations: {
        Args: { p_month: number; p_year: number }
        Returns: {
          item: Json
        }[]
      }
      no_plan: { Args: never; Returns: boolean[] }
      num_failed: { Args: never; Returns: number }
      os_name: { Args: never; Returns: string }
      pass:
        | { Args: never; Returns: string }
        | { Args: { "": string }; Returns: string }
      pg_version: { Args: never; Returns: string }
      pg_version_num: { Args: never; Returns: number }
      pgtap_version: { Args: never; Returns: number }
      recommendation_status: {
        Args: { p_month: number; p_year: number }
        Returns: {
          covered_on: string
          is_covered: boolean
          is_due: boolean
          is_expired: boolean
          item: Json
        }[]
      }
      record_debt_payment: {
        Args: {
          p_amount_cents: number
          p_date: string
          p_debt_id: string
          p_description: string
        }
        Returns: Record<string, unknown>
      }
      runtests:
        | { Args: never; Returns: string[] }
        | { Args: { "": string }; Returns: string[] }
      signed_effect: {
        Args: {
          p_amount: number
          p_type: Database["public"]["Enums"]["tx_type"]
        }
        Returns: number
      }
      skip:
        | { Args: { "": string }; Returns: string }
        | { Args: { how_many: number; why: string }; Returns: string }
      throws_ok: { Args: { "": string }; Returns: string }
      todo:
        | { Args: { how_many: number }; Returns: boolean[] }
        | { Args: { how_many: number; why: string }; Returns: boolean[] }
        | { Args: { why: string }; Returns: boolean[] }
        | { Args: { how_many: number; why: string }; Returns: boolean[] }
      todo_end: { Args: never; Returns: boolean[] }
      todo_start:
        | { Args: never; Returns: boolean[] }
        | { Args: { "": string }; Returns: boolean[] }
      year_summary: {
        Args: { p_year: number }
        Returns: {
          balance_cents: number
          expense_cents: number
          income_cents: number
          invested_cents: number
          month: number
        }[]
      }
    }
    Enums: {
      category_kind: "normal" | "otros" | "debt"
      debt_status: "active" | "paid" | "archived"
      recommend_repeat: "monthly" | "yearly" | "none"
      recurrence: "recurrent" | "variable"
      tx_type: "expense" | "income"
    }
    CompositeTypes: {
      _time_trial_type: {
        a_time: number | null
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      category_kind: ["normal", "otros", "debt"],
      debt_status: ["active", "paid", "archived"],
      recommend_repeat: ["monthly", "yearly", "none"],
      recurrence: ["recurrent", "variable"],
      tx_type: ["expense", "income"],
    },
  },
} as const

