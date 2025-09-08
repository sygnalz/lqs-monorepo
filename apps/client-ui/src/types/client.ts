export interface Client {
  id: string;
  created_at: string;
  name: string;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
  company_id: string;
}