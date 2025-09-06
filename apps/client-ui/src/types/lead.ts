export interface Lead {
  id: string
  name: string
  email: string
  phone?: string
  source: string
  status: 'new' | 'qualified' | 'unqualified' | 'contacted' | 'converted'
  created_at: string
  updated_at: string
}

export interface CreateLeadRequest {
  name: string
  email: string
  phone?: string
  source: string
}

export interface LeadResponse {
  lead: Lead
}