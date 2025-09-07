import axios from 'axios';

// This is the definitive backend URL for the UAT environment
const API_URL = 'https://lqs-uat-worker.charlesheflin.workers.dev/api';

const signUp = (data: { email: string; companyName: string; }) => {
  return axios.post(`${API_URL}/auth/signup`, data);
};

const signIn = (data: { email: string; password: string }) => {
  return axios.post(`${API_URL}/auth/signin`, data);
};

// --- Token Management ---

const setAuthToken = (token: string) => {
  localStorage.setItem('authToken', token);
};

const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

const clearAuthToken = () => {
  localStorage.removeItem('authToken');
};

export const authService = {
  signUp,
  signIn,
  setAuthToken,
  getAuthToken,
  clearAuthToken,
};