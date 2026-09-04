import { Capacitor } from '@capacitor/core';

export const getApiBaseUrl = (): string => {
  if (Capacitor.isNativePlatform()) {
    return import.meta.env.VITE_API_URL || 'http://10.79.247.62:5000';
  }
  return '';
};

export const apiUrl = (endpoint: string): string => {
  const base = getApiBaseUrl();
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${path}`;
};
