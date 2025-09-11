import { Tag } from './tag';

export interface Lead {
  id: string;
  created_at: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  notes: string | null;
  client_id: string;
  tags: Tag[];
  last_action_type?: string | null;
  last_action_timestamp?: string | null;
  next_action_type?: string | null;
  next_action_scheduled?: string | null;
  automation_status?: string;
  automation_notes?: string | null;
}
