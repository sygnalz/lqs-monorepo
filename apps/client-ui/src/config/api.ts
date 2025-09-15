export const API_CONFIG = {
  BASE_URL: (import.meta as any).env?.VITE_API_URL || 'https://lqs-uat-worker.charlesheflin.workers.dev/api',
  TIMEOUT: 10000,
};

export const API_URL = API_CONFIG.BASE_URL;
