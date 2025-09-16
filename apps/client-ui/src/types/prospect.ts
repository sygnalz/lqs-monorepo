export interface Prospect {
  id: string;
  client_id: string;
  first_name: string;
  last_name?: string;
  email?: string;
  phone_e164: string;
  timezone: string;
  path_hint: string;
  consent_status: 'granted' | 'denied';
  consent_source: string;
  consent_timestamp_iso: string;
  lead_source?: string;
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ProspectUploadData {
  first_name: string;
  last_name?: string;
  email?: string;
  phone: string;
  timezone: string;
  path_hint: string;
  consent_status: 'granted' | 'denied';
  consent_source: string;
  consent_timestamp_iso: string;
  lead_source?: string;
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  notes?: string;
}

export interface FieldMapping {
  csvField: string;
  systemField: string;
  isRequired: boolean;
}

export interface UploadProgress {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  errors: string[];
}
