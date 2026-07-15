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
          category_id: string
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
          category_id: string
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
          category_id?: string
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
    }
    Functions: {
      signed_effect: {
        Args: {
          p_amount: number
          p_type: Database["public"]["Enums"]["tx_type"]
        }
        Returns: number
      }
    }
    Enums: {
      category_kind: "normal" | "otros" | "debt"
      debt_status: "active" | "paid" | "archived"
      recurrence: "recurrent" | "variable"
      tx_type: "expense" | "income"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      category_kind: ["normal", "otros", "debt"],
      debt_status: ["active", "paid", "archived"],
      recurrence: ["recurrent", "variable"],
      tx_type: ["expense", "income"],
    },
  },
} as const

