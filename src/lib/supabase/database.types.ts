
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
            "attachments": {
                  Row: {
                    "caption": string | null,"created_at": string,"created_by": string | null,"entity_id": string,"entity_type": string,"file_name": string | null,"file_path": string,"id": string,"mime_type": string | null,"size_bytes": number | null,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "caption"?: string | null,"created_at"?: string,"created_by"?: string | null,"entity_id": string,"entity_type": string,"file_name"?: string | null,"file_path": string,"id"?: string,"mime_type"?: string | null,"size_bytes"?: number | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "caption"?: string | null,"created_at"?: string,"created_by"?: string | null,"entity_id"?: string,"entity_type"?: string,"file_name"?: string | null,"file_path"?: string,"id"?: string,"mime_type"?: string | null,"size_bytes"?: number | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "attachments_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attachments_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_log": {
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
                },"customers": {
                  Row: {
                    "address": string | null,"alt_phone": string | null,"city": string | null,"contact_person": string | null,"created_at": string,"created_by": string | null,"email": string | null,"gstin": string | null,"id": string,"is_active": boolean,"name": string,"notes": string | null,"phone": string | null,"pincode": string | null,"state": string | null,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"alt_phone"?: string | null,"city"?: string | null,"contact_person"?: string | null,"created_at"?: string,"created_by"?: string | null,"email"?: string | null,"gstin"?: string | null,"id"?: string,"is_active"?: boolean,"name": string,"notes"?: string | null,"phone"?: string | null,"pincode"?: string | null,"state"?: string | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "address"?: string | null,"alt_phone"?: string | null,"city"?: string | null,"contact_person"?: string | null,"created_at"?: string,"created_by"?: string | null,"email"?: string | null,"gstin"?: string | null,"id"?: string,"is_active"?: boolean,"name"?: string,"notes"?: string | null,"phone"?: string | null,"pincode"?: string | null,"state"?: string | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "customers_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "customers_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
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
                },"project_workers": {
                  Row: {
                    "created_at": string,"created_by": string | null,"from_date": string | null,"id": string,"notes": string | null,"project_id": string,"role": string | null,"to_date": string | null,"updated_at": string,"updated_by": string | null,"worker_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"from_date"?: string | null,"id"?: string,"notes"?: string | null,"project_id": string,"role"?: string | null,"to_date"?: string | null,"updated_at"?: string,"updated_by"?: string | null,"worker_id": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"from_date"?: string | null,"id"?: string,"notes"?: string | null,"project_id"?: string,"role"?: string | null,"to_date"?: string | null,"updated_at"?: string,"updated_by"?: string | null,"worker_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "project_workers_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_workers_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "project_list_v"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_workers_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_workers_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_workers_worker_id_fkey"
      columns: ["worker_id"]
isOneToOne: false
      referencedRelation: "workers"
      referencedColumns: ["id"]
    }
                  ]
                },"projects": {
                  Row: {
                    "completed_date": string | null,"contract_value": number | null,"created_at": string,"created_by": string | null,"customer_id": string,"description": string | null,"due_date": string | null,"est_labour": number,"est_material": number,"est_other": number,"est_painting": number,"est_transport": number,"id": string,"notes": string | null,"project_no": string,"quotation_id": string | null,"site_address": string | null,"start_date": string | null,"status": string,"title": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_date"?: string | null,"contract_value"?: number | null,"created_at"?: string,"created_by"?: string | null,"customer_id": string,"description"?: string | null,"due_date"?: string | null,"est_labour"?: number,"est_material"?: number,"est_other"?: number,"est_painting"?: number,"est_transport"?: number,"id"?: string,"notes"?: string | null,"project_no": string,"quotation_id"?: string | null,"site_address"?: string | null,"start_date"?: string | null,"status"?: string,"title": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "completed_date"?: string | null,"contract_value"?: number | null,"created_at"?: string,"created_by"?: string | null,"customer_id"?: string,"description"?: string | null,"due_date"?: string | null,"est_labour"?: number,"est_material"?: number,"est_other"?: number,"est_painting"?: number,"est_transport"?: number,"id"?: string,"notes"?: string | null,"project_no"?: string,"quotation_id"?: string | null,"site_address"?: string | null,"start_date"?: string | null,"status"?: string,"title"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "projects_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "projects_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "projects_quotation_id_fkey"
      columns: ["quotation_id"]
isOneToOne: false
      referencedRelation: "quotation_list_v"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "projects_quotation_id_fkey"
      columns: ["quotation_id"]
isOneToOne: false
      referencedRelation: "quotations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "projects_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"quotation_cost_lines": {
                  Row: {
                    "amount": number,"category": string,"cost_rate": number,"created_at": string,"created_by": string | null,"description": string,"id": string,"qty": number,"quotation_id": string,"sort_order": number,"unit": string | null,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"category": string,"cost_rate": number,"created_at"?: string,"created_by"?: string | null,"description": string,"id"?: string,"qty": number,"quotation_id": string,"sort_order": number,"unit"?: string | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "amount"?: number,"category"?: string,"cost_rate"?: number,"created_at"?: string,"created_by"?: string | null,"description"?: string,"id"?: string,"qty"?: number,"quotation_id"?: string,"sort_order"?: number,"unit"?: string | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "quotation_cost_lines_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quotation_cost_lines_quotation_id_fkey"
      columns: ["quotation_id"]
isOneToOne: false
      referencedRelation: "quotation_list_v"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quotation_cost_lines_quotation_id_fkey"
      columns: ["quotation_id"]
isOneToOne: false
      referencedRelation: "quotations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quotation_cost_lines_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"quotation_items": {
                  Row: {
                    "amount": number,"created_at": string,"created_by": string | null,"description": string,"hsn_sac": string | null,"id": string,"qty": number,"quotation_id": string,"rate": number,"sort_order": number,"unit": string | null,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"created_at"?: string,"created_by"?: string | null,"description": string,"hsn_sac"?: string | null,"id"?: string,"qty": number,"quotation_id": string,"rate": number,"sort_order": number,"unit"?: string | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"created_by"?: string | null,"description"?: string,"hsn_sac"?: string | null,"id"?: string,"qty"?: number,"quotation_id"?: string,"rate"?: number,"sort_order"?: number,"unit"?: string | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "quotation_items_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quotation_items_quotation_id_fkey"
      columns: ["quotation_id"]
isOneToOne: false
      referencedRelation: "quotation_list_v"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quotation_items_quotation_id_fkey"
      columns: ["quotation_id"]
isOneToOne: false
      referencedRelation: "quotations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quotation_items_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"quotations": {
                  Row: {
                    "cost_total": number,"created_at": string,"created_by": string | null,"customer_id": string,"decided_at": string | null,"enquiry_date": string | null,"follow_up_date": string | null,"grand_total": number,"gst_amount": number,"gst_rate": number | null,"id": string,"margin_percent": number,"project_id": string | null,"quote_date": string | null,"quote_no": string,"rejection_reason": string | null,"revision": number,"round_off": number,"scope": string | null,"sent_at": string | null,"site_address": string | null,"status": string,"subtotal": number,"terms": string | null,"title": string,"updated_at": string,"updated_by": string | null,"valid_until": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "cost_total"?: number,"created_at"?: string,"created_by"?: string | null,"customer_id": string,"decided_at"?: string | null,"enquiry_date"?: string | null,"follow_up_date"?: string | null,"grand_total"?: number,"gst_amount"?: number,"gst_rate"?: number | null,"id"?: string,"margin_percent"?: number,"project_id"?: string | null,"quote_date"?: string | null,"quote_no": string,"rejection_reason"?: string | null,"revision"?: number,"round_off"?: number,"scope"?: string | null,"sent_at"?: string | null,"site_address"?: string | null,"status"?: string,"subtotal"?: number,"terms"?: string | null,"title": string,"updated_at"?: string,"updated_by"?: string | null,"valid_until"?: string | null
                  }
                  Update: {
                    "cost_total"?: number,"created_at"?: string,"created_by"?: string | null,"customer_id"?: string,"decided_at"?: string | null,"enquiry_date"?: string | null,"follow_up_date"?: string | null,"grand_total"?: number,"gst_amount"?: number,"gst_rate"?: number | null,"id"?: string,"margin_percent"?: number,"project_id"?: string | null,"quote_date"?: string | null,"quote_no"?: string,"rejection_reason"?: string | null,"revision"?: number,"round_off"?: number,"scope"?: string | null,"sent_at"?: string | null,"site_address"?: string | null,"status"?: string,"subtotal"?: number,"terms"?: string | null,"title"?: string,"updated_at"?: string,"updated_by"?: string | null,"valid_until"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "quotations_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quotations_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quotations_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "project_list_v"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quotations_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quotations_updated_by_fkey"
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
                },"workers": {
                  Row: {
                    "address": string | null,"alt_phone": string | null,"created_at": string,"created_by": string | null,"emergency_contact_name": string | null,"emergency_contact_phone": string | null,"experience_years": number | null,"full_name": string,"id": string,"joining_date": string | null,"notes": string | null,"pay_rate": number | null,"pay_type": string | null,"phone": string | null,"skills": string | null,"status": string,"trade": string | null,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"alt_phone"?: string | null,"created_at"?: string,"created_by"?: string | null,"emergency_contact_name"?: string | null,"emergency_contact_phone"?: string | null,"experience_years"?: number | null,"full_name": string,"id"?: string,"joining_date"?: string | null,"notes"?: string | null,"pay_rate"?: number | null,"pay_type"?: string | null,"phone"?: string | null,"skills"?: string | null,"status"?: string,"trade"?: string | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "address"?: string | null,"alt_phone"?: string | null,"created_at"?: string,"created_by"?: string | null,"emergency_contact_name"?: string | null,"emergency_contact_phone"?: string | null,"experience_years"?: number | null,"full_name"?: string,"id"?: string,"joining_date"?: string | null,"notes"?: string | null,"pay_rate"?: number | null,"pay_type"?: string | null,"phone"?: string | null,"skills"?: string | null,"status"?: string,"trade"?: string | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "workers_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "workers_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "project_list_v": {
                  Row: {
                    "completed_date": string | null,"contract_value": number | null,"created_at": string,"created_by": string | null,"customer_id": string,"customer_is_active": boolean,"customer_name": string,"description": string | null,"due_date": string | null,"est_labour": number,"est_material": number,"est_other": number,"est_painting": number,"est_transport": number,"id": string,"is_overdue": boolean | null,"notes": string | null,"project_no": string,"quotation_id": string | null,"site_address": string | null,"start_date": string | null,"status": string,"title": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "projects_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "projects_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "projects_quotation_id_fkey"
      columns: ["quotation_id"]
isOneToOne: false
      referencedRelation: "quotation_list_v"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "projects_quotation_id_fkey"
      columns: ["quotation_id"]
isOneToOne: false
      referencedRelation: "quotations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "projects_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"project_team_v": {
                  Row: {
                    "from_date": string | null,"id": string,"is_current": boolean | null,"notes": string | null,"project_id": string,"project_no": string,"project_status": string,"project_title": string,"role": string | null,"to_date": string | null,"trade": string | null,"worker_id": string,"worker_name": string,"worker_phone": string | null,"worker_status": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "project_workers_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "project_list_v"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_workers_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_workers_worker_id_fkey"
      columns: ["worker_id"]
isOneToOne: false
      referencedRelation: "workers"
      referencedColumns: ["id"]
    }
                  ]
                },"quotation_list_v": {
                  Row: {
                    "customer_id": string,"customer_name": string,"follow_up_date": string | null,"grand_total": number,"id": string,"is_follow_up_due": boolean | null,"project_id": string | null,"quote_date": string | null,"quote_no": string,"revision": number,"status": string,"title": string,"valid_until": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "quotations_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quotations_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "project_list_v"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quotations_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "convert_quotation":
{ Args: { "p_quotation_id": string }; Returns: string
                           },
"create_quotation_revision":
{ Args: { "p_quotation_id": string }; Returns: string
                           },
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
"save_quotation_draft":
{ Args: { "p_cost_lines": Json,"p_header": Json,"p_items": Json,"p_quotation_id": string }; Returns: string
                           },
"set_profile_active":
{ Args: { "p_active": boolean,"p_user": string }; Returns: undefined
                           },
"set_quotation_status":
{ Args: { "p_quotation_id": string,"p_reason"?: string,"p_status": string }; Returns: undefined
                           },
"storage_usage":
{ Args: Record<PropertyKey, never>; Returns: {
              "database_bytes": number,"files_bytes": number
            }[]
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
