import apiClient from '../lib/api'
import type { CreateLeadRequest, Lead, LeadResponse } from '../types/lead'

export const leadsService = {
  async createLead(data: CreateLeadRequest): Promise<LeadResponse> {
    const response = await apiClient.post('/api/leads', data)
    return response.data
  },

  async getLead(id: string): Promise<{ lead: Lead }> {
    const response = await apiClient.get(`/api/leads/${id}`)
    return response.data
  },

  async getLeads(): Promise<{ leads: Lead[] }> {
    const response = await apiClient.get('/api/leads')
    return response.data
  }
}