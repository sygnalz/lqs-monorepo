export interface Client {
  id: string;
  created_at: string;
  name: string;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
  company_id: string;
  billing_address: string | null;
  rate_per_minute: number | null;
  rate_per_sms: number | null;
  rate_per_lead: number | null;
}