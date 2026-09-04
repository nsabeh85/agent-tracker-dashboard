export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type AgentPriority = 'low' | 'medium' | 'high'
export type AgentStatus = 'pending_approval' | 'active' | 'on_hold' | 'cancelled' | 'complete'
export type ProgressStatus = 'not_started' | 'in_progress' | 'complete' | 'blocked'

export type Database = {
  public: {
    Tables: {
      admins: {
        Row: {
          display_name: string
          email: string
        }
        Insert: {
          display_name: string
          email: string
        }
        Update: {
          display_name?: string
          email?: string
        }
        Relationships: []
      }
      agent_stages: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          agent_id: string
          expected_duration_days: number
          id: string
          stage_id: string
          status: ProgressStatus
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          agent_id: string
          expected_duration_days: number
          id?: string
          stage_id: string
          status?: ProgressStatus
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          agent_id?: string
          expected_duration_days?: number
          id?: string
          stage_id?: string
          status?: ProgressStatus
        }
        Relationships: [
          {
            foreignKeyName: 'agent_stages_agent_id_fkey'
            columns: ['agent_id']
            isOneToOne: false
            referencedRelation: 'agents'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'agent_stages_stage_id_fkey'
            columns: ['stage_id']
            isOneToOne: false
            referencedRelation: 'stages'
            referencedColumns: ['id']
          },
        ]
      }
      agent_substeps: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          agent_id: string
          agent_stage_id: string
          id: string
          name: string
          sort_order: number
          status: ProgressStatus
          substep_id: string
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          agent_id: string
          agent_stage_id: string
          id?: string
          name: string
          sort_order: number
          status?: ProgressStatus
          substep_id: string
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          agent_id?: string
          agent_stage_id?: string
          id?: string
          name?: string
          sort_order?: number
          status?: ProgressStatus
          substep_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'agent_substeps_agent_id_fkey'
            columns: ['agent_id']
            isOneToOne: false
            referencedRelation: 'agents'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'agent_substeps_agent_stage_id_fkey'
            columns: ['agent_stage_id']
            isOneToOne: false
            referencedRelation: 'agent_stages'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'agent_substeps_substep_id_fkey'
            columns: ['substep_id']
            isOneToOne: false
            referencedRelation: 'substeps'
            referencedColumns: ['id']
          },
        ]
      }
      agents: {
        Row: {
          assigned_to: string
          created_at: string
          current_stage_id: string
          description: string
          id: string
          priority: AgentPriority
          public_token: string
          requester_department: string
          requester_name: string
          status: AgentStatus
          target_go_live: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to: string
          created_at?: string
          current_stage_id: string
          description?: string
          id?: string
          priority?: AgentPriority
          public_token?: string
          requester_department: string
          requester_name: string
          status?: AgentStatus
          target_go_live?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string
          created_at?: string
          current_stage_id?: string
          description?: string
          id?: string
          priority?: AgentPriority
          public_token?: string
          requester_department?: string
          requester_name?: string
          status?: AgentStatus
          target_go_live?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'agents_current_stage_id_fkey'
            columns: ['current_stage_id']
            isOneToOne: false
            referencedRelation: 'stages'
            referencedColumns: ['id']
          },
        ]
      }
      comments: {
        Row: {
          agent_id: string
          agent_stage_id: string | null
          author_email: string
          author_name: string
          body: string
          created_at: string
          id: string
        }
        Insert: {
          agent_id: string
          agent_stage_id?: string | null
          author_email: string
          author_name: string
          body: string
          created_at?: string
          id?: string
        }
        Update: {
          agent_id?: string
          agent_stage_id?: string | null
          author_email?: string
          author_name?: string
          body?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'comments_agent_id_fkey'
            columns: ['agent_id']
            isOneToOne: false
            referencedRelation: 'agents'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'comments_agent_stage_id_fkey'
            columns: ['agent_stage_id']
            isOneToOne: false
            referencedRelation: 'agent_stages'
            referencedColumns: ['id']
          },
        ]
      }
      stages: {
        Row: {
          default_duration_days: number
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          default_duration_days?: number
          id?: string
          name: string
          sort_order: number
        }
        Update: {
          default_duration_days?: number
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      substeps: {
        Row: {
          default_duration_days: number | null
          id: string
          name: string
          sort_order: number
          stage_id: string
        }
        Insert: {
          default_duration_days?: number | null
          id?: string
          name: string
          sort_order: number
          stage_id: string
        }
        Update: {
          default_duration_days?: number | null
          id?: string
          name?: string
          sort_order?: number
          stage_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'substeps_stage_id_fkey'
            columns: ['stage_id']
            isOneToOne: false
            referencedRelation: 'stages'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_agent: {
        Args: {
          p_assigned_to: string
          p_description: string
          p_priority: AgentPriority
          p_requester_department: string
          p_requester_name: string
          p_target_go_live: string | null
          p_title: string
        }
        Returns: string
      }
    }
    Enums: {
      agent_priority: AgentPriority
      agent_status: AgentStatus
      progress_status: ProgressStatus
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Stage = Database['public']['Tables']['stages']['Row']
export type Substep = Database['public']['Tables']['substeps']['Row']
export type Agent = Database['public']['Tables']['agents']['Row']
export type AgentStage = Database['public']['Tables']['agent_stages']['Row']
export type AgentSubstep = Database['public']['Tables']['agent_substeps']['Row']
export type Comment = Database['public']['Tables']['comments']['Row']
export type Admin = Database['public']['Tables']['admins']['Row']

export type AgentWithStages = Agent & {
  agent_stages: AgentStage[]
}
