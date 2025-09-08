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
}