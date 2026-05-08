// Hand-written DB types. Regenerate with `npx supabase gen types typescript` once linked.

export type StakeholderType = "internal" | "external";
export type RequestType =
  | "risk_scoring"
  | "new_dashboard"
  | "new_visual"
  | "new_analysis"
  | "update_existing"
  | "other";
export type ViewType = "aggregated" | "patient_level";
export type Stage = "submitted" | "received" | "in_progress" | "completed";
export type Role = "admin" | "requester";

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: Role;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: Role;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          role?: Role;
          created_at?: string;
        };
      };
      tickets: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          request_name: string;
          description: string | null;
          requester_id: string;
          owner_id: string | null;
          stakeholder_type: StakeholderType;
          has_hard_deadline: boolean;
          deadline_date: string | null;
          request_type: RequestType;
          view_type: ViewType;
          requester_priority: number;
          additional_info: string | null;
          priority_score: number;
          priority_rank: number | null;
          stage: Stage;
          expected_completion_date: string | null;
          completed_at: string | null;
          stakeholders_internal: string[] | null;
          stakeholders_external: string[] | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          request_name: string;
          description?: string | null;
          requester_id: string;
          owner_id?: string | null;
          stakeholder_type: StakeholderType;
          has_hard_deadline?: boolean;
          deadline_date?: string | null;
          request_type: RequestType;
          view_type: ViewType;
          requester_priority: number;
          additional_info?: string | null;
          priority_score?: number;
          priority_rank?: number | null;
          stage?: Stage;
          expected_completion_date?: string | null;
          completed_at?: string | null;
          stakeholders_internal?: string[] | null;
          stakeholders_external?: string[] | null;
        };
        Update: Partial<Database["public"]["Tables"]["tickets"]["Insert"]>;
      };
      priority_config: {
        Row: {
          id: number;
          weight_stakeholder: number;
          weight_deadline_bonus: number;
          weight_requester_priority: number;
          weight_request_type: number;
          deadline_tier_7d: number;
          deadline_tier_14d: number;
          deadline_tier_30d: number;
          deadline_tier_30d_plus: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["priority_config"]["Row"]> & {
          id: number;
        };
        Update: Partial<Database["public"]["Tables"]["priority_config"]["Row"]>;
      };
      slack_notifications: {
        Row: {
          id: string;
          ticket_id: string;
          slack_user_id: string | null;
          notification_type: string;
          sent_at: string;
          payload: Record<string, unknown> | null;
        };
        Insert: {
          id?: string;
          ticket_id: string;
          slack_user_id?: string | null;
          notification_type: string;
          sent_at?: string;
          payload?: Record<string, unknown> | null;
        };
        Update: Partial<Database["public"]["Tables"]["slack_notifications"]["Insert"]>;
      };
    };
    Enums: {
      stakeholder_type: StakeholderType;
      request_type: RequestType;
      view_type: ViewType;
      stage: Stage;
      role: Role;
    };
  };
}
