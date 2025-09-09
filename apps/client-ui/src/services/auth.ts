import axios from 'axios';

// This is the definitive backend URL for the UAT environment
const API_URL = 'https://8787-i93xvr9j47a18hrsasny0-6532622b.e2b.dev/api';

const signUp = async (data: { email: string; companyName: string; }) => {
  console.log("🔐 [AUTH SERVICE] SignUp function called");
  console.log("🔐 [AUTH SERVICE] Input data:", {
    email: data.email,
    companyName: data.companyName
  });
  console.log("🔐 [AUTH SERVICE] Target URL:", `${API_URL}/auth/signup`);
  console.log("🔐 [AUTH SERVICE] Full API_URL:", API_URL);

  try {
    console.log("🔐 [AUTH SERVICE] Making axios POST request...");
    const response = await axios.post(`${API_URL}/auth/signup`, data);
    
    console.log("🔐 [AUTH SERVICE] Request successful!");
    console.log("🔐 [AUTH SERVICE] Response status:", response.status);
    console.log("🔐 [AUTH SERVICE] Response headers:", response.headers);
    console.log("🔐 [AUTH SERVICE] Response data:", response.data);
    
    return response;
  } catch (error: any) {
    console.error("🔐 [AUTH SERVICE] Request failed!");
    console.error("🔐 [AUTH SERVICE] Error type:", typeof error);
    console.error("🔐 [AUTH SERVICE] Error constructor:", error?.constructor?.name);
    
    // Log the full axios error object
    if (error.toJSON) {
      console.error("🔐 [AUTH SERVICE] Full Axios Error (toJSON):", error.toJSON());
    } else {
      console.error("🔐 [AUTH SERVICE] Error object (no toJSON):", error);
    }
    
    // Log specific axios error properties
    if (error.response) {
      console.error("🔐 [AUTH SERVICE] Error response status:", error.response.status);
      console.error("🔐 [AUTH SERVICE] Error response data:", error.response.data);
      console.error("🔐 [AUTH SERVICE] Error response headers:", error.response.headers);
    } else if (error.request) {
      console.error("🔐 [AUTH SERVICE] Error request (no response received):", error.request);
    } else {
      console.error("🔐 [AUTH SERVICE] Error message:", error.message);
    }
    
    // Re-throw the error so calling code can handle it
    throw error;
  }
};

const signIn = async (data: { email: string; password: string }) => {
  console.log("🔐 [AUTH SERVICE] SignIn function called");
  console.log("🔐 [AUTH SERVICE] Input data:", {
    email: data.email,
    password: data.password ? '[REDACTED]' : 'undefined',
    hasPassword: !!data.password
  });
  console.log("🔐 [AUTH SERVICE] Target URL:", `${API_URL}/auth/signin`);
  console.log("🔐 [AUTH SERVICE] Full API_URL:", API_URL);

  try {
    console.log("🔐 [AUTH SERVICE] Making axios POST request...");
    const response = await axios.post(`${API_URL}/auth/signin`, data);
    
    console.log("🔐 [AUTH SERVICE] Request successful!");
    console.log("🔐 [AUTH SERVICE] Response status:", response.status);
    console.log("🔐 [AUTH SERVICE] Response headers:", response.headers);
    console.log("🔐 [AUTH SERVICE] Response data:", response.data);
    
    return response;
  } catch (error: any) {
    console.error("🔐 [AUTH SERVICE] Request failed!");
    console.error("🔐 [AUTH SERVICE] Error type:", typeof error);
    console.error("🔐 [AUTH SERVICE] Error constructor:", error?.constructor?.name);
    
    // Log the full axios error object
    if (error.toJSON) {
      console.error("🔐 [AUTH SERVICE] Full Axios Error (toJSON):", error.toJSON());
    } else {
      console.error("🔐 [AUTH SERVICE] Error object (no toJSON):", error);
    }
    
    // Log specific axios error properties
    if (error.response) {
      console.error("🔐 [AUTH SERVICE] Error response status:", error.response.status);
      console.error("🔐 [AUTH SERVICE] Error response data:", error.response.data);
      console.error("🔐 [AUTH SERVICE] Error response headers:", error.response.headers);
    } else if (error.request) {
      console.error("🔐 [AUTH SERVICE] Error request (no response received):", error.request);
    } else {
      console.error("🔐 [AUTH SERVICE] Error message:", error.message);
    }
    
    // Re-throw the error so calling code can handle it
    throw error;
  }
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