import { createUuid } from '../shared/utils/uuid';
import axios from 'axios';
import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import type { AxiosRequestConfig } from 'axios';
import type { ApiProblem } from '../models/responses/auth.response';
import { readSession } from '../auth/session';

export interface HttpError {
  status: number | 'NETWORK' | 'TIMEOUT' | 'CANCELLED';
  code?: string;
  requestId?: string;
  fields: Record<string, string>;
}

export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:4710',
  timeout: 90_000,
  headers: { Accept: 'application/json, application/problem+json' },
});

httpClient.interceptors.request.use((config) => {
  if (!config.headers.has('X-Request-Id')) config.headers.set('X-Request-Id', createUuid());
  const session = readSession();
  if (session && !config.headers.has('Authorization')) config.headers.set('Authorization', `Bearer ${session.accessToken}`);
  return config;
});

export function normalizeHttpError(error: unknown): HttpError {
  if (!axios.isAxiosError<Partial<ApiProblem>>(error)) return { status: 'NETWORK', fields: {} };
  const problem = error.response?.data;
  const fields: Record<string, string> = {};
  if (Array.isArray(problem?.errors)) for (const item of problem.errors) {
    if (typeof item.field === 'string' && typeof item.message === 'string') fields[item.field] = item.message;
  }
  return {
    status: axios.isCancel(error) ? 'CANCELLED' : error.response?.status ?? (error.code === 'ECONNABORTED' ? 'TIMEOUT' : 'NETWORK'),
    code: problem?.code, requestId: problem?.requestId ?? error.response?.headers['x-request-id'], fields,
  };
}

export const axiosBaseQuery: BaseQueryFn<AxiosRequestConfig, unknown, HttpError> = async (request, api) => {
  try { return { data: (await httpClient.request({ ...request, signal: api.signal })).data }; }
  catch (error) { return { error: normalizeHttpError(error) }; }
};
