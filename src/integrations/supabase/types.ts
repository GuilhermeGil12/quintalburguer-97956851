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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      extras: {
        Row: {
          available: boolean
          created_at: string
          id: string
          name: string
          price: number
        }
        Insert: {
          available?: boolean
          created_at?: string
          id?: string
          name: string
          price?: number
        }
        Update: {
          available?: boolean
          created_at?: string
          id?: string
          name?: string
          price?: number
        }
        Relationships: []
      }
      ingredients: {
        Row: {
          created_at: string
          id: string
          min_alert: number
          name: string
          stock_qty: number
          unit: string
        }
        Insert: {
          created_at?: string
          id?: string
          min_alert?: number
          name: string
          stock_qty?: number
          unit?: string
        }
        Update: {
          created_at?: string
          id?: string
          min_alert?: number
          name?: string
          stock_qty?: number
          unit?: string
        }
        Relationships: []
      }
      online_order_item_extras: {
        Row: {
          extra_id: string
          extra_name: string
          extra_price: number
          id: string
          online_order_item_id: string
        }
        Insert: {
          extra_id: string
          extra_name: string
          extra_price: number
          id?: string
          online_order_item_id: string
        }
        Update: {
          extra_id?: string
          extra_name?: string
          extra_price?: number
          id?: string
          online_order_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "online_order_item_extras_extra_id_fkey"
            columns: ["extra_id"]
            isOneToOne: false
            referencedRelation: "extras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_order_item_extras_online_order_item_id_fkey"
            columns: ["online_order_item_id"]
            isOneToOne: false
            referencedRelation: "online_order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      online_order_items: {
        Row: {
          extras_total: number
          id: string
          observations: string | null
          online_order_id: string
          product_id: string
          product_name: string
          quantity: number
          total: number
          unit_price: number
        }
        Insert: {
          extras_total?: number
          id?: string
          observations?: string | null
          online_order_id: string
          product_id: string
          product_name: string
          quantity?: number
          total: number
          unit_price: number
        }
        Update: {
          extras_total?: number
          id?: string
          observations?: string | null
          online_order_id?: string
          product_id?: string
          product_name?: string
          quantity?: number
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "online_order_items_online_order_id_fkey"
            columns: ["online_order_id"]
            isOneToOne: false
            referencedRelation: "online_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      online_orders: {
        Row: {
          address: string | null
          change_for: number | null
          created_at: string
          customer_name: string
          customer_phone: string
          delivery_fee: number
          delivery_type: string
          id: string
          needs_change: boolean
          notes: string | null
          payment_method: string
          status: string
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          change_for?: number | null
          created_at?: string
          customer_name: string
          customer_phone: string
          delivery_fee?: number
          delivery_type?: string
          id?: string
          needs_change?: boolean
          notes?: string | null
          payment_method?: string
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          change_for?: number | null
          created_at?: string
          customer_name?: string
          customer_phone?: string
          delivery_fee?: number
          delivery_type?: string
          id?: string
          needs_change?: boolean
          notes?: string | null
          payment_method?: string
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      order_item_extras: {
        Row: {
          extra_id: string
          extra_name: string
          extra_price: number
          id: string
          order_item_id: string
        }
        Insert: {
          extra_id: string
          extra_name: string
          extra_price: number
          id?: string
          order_item_id: string
        }
        Update: {
          extra_id?: string
          extra_name?: string
          extra_price?: number
          id?: string
          order_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_item_extras_extra_id_fkey"
            columns: ["extra_id"]
            isOneToOne: false
            referencedRelation: "extras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_extras_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          extras_total: number
          for_whom: string | null
          id: string
          kitchen_status: string
          observations: string | null
          order_id: string
          product_id: string
          product_name: string
          quantity: number
          ready_at: string | null
          started_at: string | null
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          extras_total?: number
          for_whom?: string | null
          id?: string
          kitchen_status?: string
          observations?: string | null
          order_id: string
          product_id: string
          product_name: string
          quantity?: number
          ready_at?: string | null
          started_at?: string | null
          total: number
          unit_price: number
        }
        Update: {
          created_at?: string
          extras_total?: number
          for_whom?: string | null
          id?: string
          kitchen_status?: string
          observations?: string | null
          order_id?: string
          product_id?: string
          product_name?: string
          quantity?: number
          ready_at?: string | null
          started_at?: string | null
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          attendant_name: string | null
          client_name: string | null
          closed_at: string | null
          created_at: string
          id: string
          payment_method: string | null
          status: string
          table_id: string | null
          table_number: number
          total: number
        }
        Insert: {
          attendant_name?: string | null
          client_name?: string | null
          closed_at?: string | null
          created_at?: string
          id?: string
          payment_method?: string | null
          status?: string
          table_id?: string | null
          table_number: number
          total?: number
        }
        Update: {
          attendant_name?: string | null
          client_name?: string | null
          closed_at?: string | null
          created_at?: string
          id?: string
          payment_method?: string | null
          status?: string
          table_id?: string | null
          table_number?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      product_ingredients: {
        Row: {
          id: string
          ingredient_id: string
          product_id: string
          qty_used: number
        }
        Insert: {
          id?: string
          ingredient_id: string
          product_id: string
          qty_used?: number
        }
        Update: {
          id?: string
          ingredient_id?: string
          product_id?: string
          qty_used?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_ingredients_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          available: boolean
          category: Database["public"]["Enums"]["product_category"]
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          price: number
        }
        Insert: {
          available?: boolean
          category?: Database["public"]["Enums"]["product_category"]
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price?: number
        }
        Update: {
          available?: boolean
          category?: Database["public"]["Enums"]["product_category"]
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      tables: {
        Row: {
          created_at: string
          id: string
          number: number
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          number: number
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          number?: number
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      product_category: "lanches" | "bebidas" | "sobremesas" | "porcoes"
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
      product_category: ["lanches", "bebidas", "sobremesas", "porcoes"],
    },
  },
} as const
