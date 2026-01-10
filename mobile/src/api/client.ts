import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { ApiError } from '@/types';

const getBaseUrl = (): string => {
  if (__DEV__) {
    return 'http://192.168.1.102:8000/api';
  }
  return 'https://api.athenaeum.app/api';
};

const API_URL = getBaseUrl();

export class AuthenticationError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class ApiRequestError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.errors = errors;
  }
}

interface RequestConfig extends Omit<RequestInit, 'body'> {
  requiresAuth?: boolean;
  body?: object;
}

export async function getToken(): Promise<string | null> {
  return await SecureStore.getItemAsync('auth_token');
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync('auth_token', token);
}

export async function removeToken(): Promise<void> {
  await SecureStore.deleteItemAsync('auth_token');
}

export async function apiClient<T>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<T> {
  const { requiresAuth = true, body, ...fetchConfig } = config;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(config.headers as Record<string, string>),
  };

  if (requiresAuth) {
    const token = await getToken();
    if (__DEV__) {
      console.log('[API] Token present:', !!token, 'Endpoint:', endpoint);
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const startTime = __DEV__ ? performance.now() : 0;

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchConfig,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (__DEV__) {
    const duration = performance.now() - startTime;
    const status = response.status;
    console.log(`[API] ${fetchConfig.method || 'GET'} ${endpoint} → ${status} (${duration.toFixed(0)}ms)`);
  }

  if (response.status === 401) {
    throw new AuthenticationError();
  }

  let data;
  try {
    const text = await response.text();
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new ApiRequestError(
      'Invalid response from server',
      response.status
    );
  }

  if (!response.ok) {
    const error = data as ApiError;
    throw new ApiRequestError(
      error.message || 'Request failed',
      response.status,
      error.errors
    );
  }

  return data as T;
}
