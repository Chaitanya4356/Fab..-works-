
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "audit_log": {
                  Row: {
                    "action": string,"changed_at": string,"changed_by": string | null,"id": number,"new_values": Json | null,"old_values": Json | null,"record_id": string,"table_name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"changed_at"?: string,"changed_by"?: string | null,"id"?: never,"new_values"?: Json | null,"old_values"?: Json | null,"record_id": string,"table_name": string
                  }
                  Update: {
                    "action"?: string,"changed_at"?: string,"changed_by"?: string | null,"id"?: never,"new_values"?: Json | null,"old_values"?: Json | null,"record_id"?: string,"table_name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"doc_counters": {
                  Row: {
                    "doc_type": string,"highest_issued": number,"last_number": number,"series": string
                  }
                  ComputedFields: never
                  Insert: {
                    "doc_type": string,"highest_issued"?: number,"last_number"?: number,"series": string
                  }
                  Update: {
                    "doc_type"?: string,"highest_issued"?: number,"last_number"?: number,"series"?: string
                  }
                  Relationships: [
                    
                  ]
                },"doc_number_formats": {
                  Row: {
                    "created_at": string,"created_by": string | null,"digits": number,"doc_type": string,"id": string,"prefix": string,"separator": string,"updated_at": string,"updated_by": string | null,"year_style": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"digits"?: number,"doc_type": string,"id"?: string,"prefix": string,"separator"?: string,"updated_at"?: string,"updated_by"?: string | null,"year_style"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"digits"?: number,"doc_type"?: string,"id"?: string,"prefix"?: string,"separator"?: string,"updated_at"?: string,"updated_by"?: string | null,"year_style"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "doc_number_formats_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "doc_number_formats_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"created_by": string | null,"full_name": string,"id": string,"is_active": boolean,"login_email": string | null,"phone": string | null,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"full_name": string,"id": string,"is_active"?: boolean,"login_email"?: string | null,"phone"?: string | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"full_name"?: string,"id"?: string,"is_active"?: boolean,"login_email"?: string | null,"phone"?: string | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profiles_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"settings": {
                  Row: {
                    "address": string | null,"bank_account_name": string | null,"bank_account_no": string | null,"bank_ifsc": string | null,"bank_name": string | null,"city": string | null,"created_at": string,"created_by": string | null,"default_gst_rate": number,"default_margin_percent": number,"email": string | null,"gst_enabled": boolean,"gst_registered_from": string | null,"gstin": string | null,"id": number,"invoice_due_days": number,"invoice_terms": string | null,"logo_path": string | null,"phone": string | null,"pincode": string | null,"quotation_terms": string | null,"quotation_validity_days": number,"state": string | null,"state_code": string | null,"updated_at": string,"updated_by": string | null,"upi_id": string | null,"workshop_name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"bank_account_name"?: string | null,"bank_account_no"?: string | null,"bank_ifsc"?: string | null,"bank_name"?: string | null,"city"?: string | null,"created_at"?: string,"created_by"?: string | null,"default_gst_rate"?: number,"default_margin_percent"?: number,"email"?: string | null,"gst_enabled"?: boolean,"gst_registered_from"?: string | null,"gstin"?: string | null,"id"?: number,"invoice_due_days"?: number,"invoice_terms"?: string | null,"logo_path"?: string | null,"phone"?: string | null,"pincode"?: string | null,"quotation_terms"?: string | null,"quotation_validity_days"?: number,"state"?: string | null,"state_code"?: string | null,"updated_at"?: string,"updated_by"?: string | null,"upi_id"?: string | null,"workshop_name"?: string
                  }
                  Update: {
                    "address"?: string | null,"bank_account_name"?: string | null,"bank_account_no"?: string | null,"bank_ifsc"?: string | null,"bank_name"?: string | null,"city"?: string | null,"created_at"?: string,"created_by"?: string | null,"default_gst_rate"?: number,"default_margin_percent"?: number,"email"?: string | null,"gst_enabled"?: boolean,"gst_registered_from"?: string | null,"gstin"?: string | null,"id"?: number,"invoice_due_days"?: number,"invoice_terms"?: string | null,"logo_path"?: string | null,"phone"?: string | null,"pincode"?: string | null,"quotation_terms"?: string | null,"quotation_validity_days"?: number,"state"?: string | null,"state_code"?: string | null,"updated_at"?: string,"updated_by"?: string | null,"upi_id"?: string | null,"workshop_name"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "settings_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "settings_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "financial_year":
{ Args: { "p_date": string }; Returns: string
                           },
"is_active_user":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"next_doc_number":
{ Args: { "p_doc_date": string,"p_doc_type": string }; Returns: string
                           },
"save_doc_number_formats":
{ Args: { "p_as_of": string,"p_formats": Json }; Returns: undefined
                           },
"today_ist":
{ Args: Record<PropertyKey, never>; Returns: string
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
