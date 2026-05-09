// Hand-written DB types. Regenerate later with `npx supabase gen types typescript`.

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

type UsersRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  created_at: string;
};

type TicketsRow = {
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

type PriorityConfigRow = {
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

type SlackNotificationsRow = {
  id: string;
  ticket_id: string;
  slack_user_id: string | null;
  notification_type: string;
  sent_at: string;
  payload: Record<string, unknown> | null;
};

export type Database = {
  public: {
    Tables: {
      users: {
        Row: UsersRow;
        Insert: Omit<UsersRow, "created_at"> & { created_at?: string };
        Update: Partial<UsersRow>;
        Relationships: [];
      };
      tickets: {
        Row: TicketsRow;
        Insert: Partial<TicketsRow> & {
          request_name: string;
          requester_id: string;
          stakeholder_type: StakeholderType;
          request_type: RequestType;
          view_type: ViewType;
          requester_priority: number;
        };
        Update: Partial<TicketsRow>;
        Relationships: [];
      };
      priority_config: {
        Row: PriorityConfigRow;
        Insert: Partial<PriorityConfigRow> & { id: number };
        Update: Partial<PriorityConfigRow>;
        Relationships: [];
      };
      slack_notifications: {
        Row: SlackNotificationsRow;
        Insert: Partial<SlackNotificationsRow> & {
          ticket_id: string;
          notification_type: string;
        };
        Update: Partial<SlackNotificationsRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      role: Role;
      stakeholder_type: StakeholderType;
      request_type: RequestType;
      view_type: ViewType;
      stage: Stage;
    };
    CompositeTypes: Record<string, never>;
  };
};
