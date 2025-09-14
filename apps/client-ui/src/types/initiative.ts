export interface Initiative {
  id: string;
  client_id: string;
  playbook_id: string;
  name: string;
  status: 'DRAFT' | 'RUNNING' | 'PAUSED' | 'COMPLETED';
  environmental_settings: Record<string, any>;
  created_at: string;
  updated_at: string;
  playbooks?: {
    name: string;
    goal_description?: string;
  };
  initiative_prospects?: InitiativeProspect[];
}

export interface InitiativeProspect {
  initiative_id: string;
  prospect_id: string;
  status: 'ACTIVE' | 'GOAL_ACHIEVED' | 'REVIEW_BIN' | 'DNC' | 'ERROR' | 'PAUSED';
  contact_attempts: number;
  created_at: string;
  updated_at: string;
  leads?: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    status: string;
  };
}

export interface CreateInitiativeRequest {
  name: string;
  playbook_id: string;
  environmental_settings?: Record<string, any>;
  prospect_ids?: string[];
}
