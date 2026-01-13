import * as SecureStore from 'expo-secure-store';
import type { ApiError } from '@/types';

const getBaseUrl = (): string => {
  if (__DEV__) {
    return process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/api';
  }
  return process.env.EXPO_PUBLIC_PRODUCTION_API_URL ?? 'https://api.athenaeum.app/api';
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
  params?: Record<string, string | number | boolean | undefined>;
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

export async function uploadFile<T>(
  endpoint: string,
  formData: FormData
): Promise<T> {
  const token = await getToken();

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (response.status === 401) {
    throw new AuthenticationError();
  }

  let data;
  try {
    const text = await response.text();
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new ApiRequestError('Invalid response from server', response.status);
  }

  if (!response.ok) {
    const errorData = data as ApiError;
    throw new ApiRequestError(
      errorData.error || errorData.message || 'Request failed',
      response.status,
      errorData.errors
    );
  }

  return data as T;
}

export async function apiClient<T>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<T> {
  const { requiresAuth = true, body, params, ...fetchConfig } = config;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(config.headers as Record<string, string>),
  };

  if (requiresAuth) {
    const token = await getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  let url = `${API_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const response = await fetch(url, {
    ...fetchConfig,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

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
    const errorData = data as ApiError;
    throw new ApiRequestError(
      errorData.error || errorData.message || 'Request failed',
      response.status,
      errorData.errors
    );
  }

  return data as T;
}
