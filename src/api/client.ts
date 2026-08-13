/**
 * UPSTREAM BOUNDARY.
 * Every network call to the PreMarketIQ backend goes through this base query.
 * Responsibilities: auth header injection, timeout, retry with backoff,
 * 401 -> logout, error normalisation, and the mock short-circuit.
 * See docs/01-INTEGRATION-UPSTREAM.md
 */
import {
  BaseQueryFn, FetchArgs, fetchBaseQuery, FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import { CONFIG } from '@/config';
import { resolveMock } from './mock';
import type { RootState } from '@/store';
import { loggedOut } from '@/store/authSlice';
import type { ApiError } from '@/types';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: CONFIG.apiBaseUrl,
  timeout: CONFIG.requestTimeoutMs,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token;
    if (token) headers.set('Authorization', `Bearer ${token}`);
    headers.set('Accept', 'application/json');
    headers.set('X-Client', 'premarketiq-mobile');
    return headers;
  },
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Map any transport/HTTP failure onto a stable ApiError the UI can render. */
function normaliseError(err: FetchBaseQueryError): ApiError {
  if (err.status === 'TIMEOUT_ERROR')
    return { code: 'TIMEOUT', message: 'The server took too long to respond.' };
  if (err.status === 'FETCH_ERROR')
    return { code: 'OFFLINE', message: 'Cannot reach PreMarketIQ. Check your connection.' };
  if (err.status === 'PARSING_ERROR')
    return { code: 'BAD_RESPONSE', message: 'Received an unexpected response.' };
  if (typeof err.status === 'number') {
    const body = err.data as { error?: ApiError } | undefined;
    if (body?.error) return { ...body.error, status: err.status };
    if (err.status === 401) return { code: 'UNAUTHORIZED', message: 'Session expired. Please sign in again.', status: 401 };
    if (err.status === 429) return { code: 'RATE_LIMITED', message: 'Too many requests. Try again shortly.', status: 429 };
    if (err.status >= 500) return { code: 'SERVER_ERROR', message: 'PreMarketIQ is having trouble. Retrying.', status: err.status };
  }
  return { code: 'UNKNOWN', message: 'Something went wrong.' };
}

const shouldRetry = (e: FetchBaseQueryError) =>
  e.status === 'FETCH_ERROR' ||
  e.status === 'TIMEOUT_ERROR' ||
  (typeof e.status === 'number' && (e.status >= 500 || e.status === 429));

export const baseQuery: BaseQueryFn<string | FetchArgs, unknown, ApiError> =
  async (args, api, extraOptions) => {
    // --- Mock short-circuit: app runs fully without a backend -----------------
    if (CONFIG.useMock) {
      const url = typeof args === 'string' ? args : args.url;
      await sleep(220 + Math.random() * 260); // simulate latency
      const data = resolveMock(url);
      if (data === null)
        return { error: { code: 'NOT_IMPLEMENTED', message: `No mock for ${url}` } };
      return { data };
    }

    // --- Real upstream call with bounded retry --------------------------------
    let attempt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const result = await rawBaseQuery(args, api, extraOptions);
      if (!result.error) return { data: result.data };

      const err = result.error as FetchBaseQueryError;
      if (err.status === 401) {
        api.dispatch(loggedOut());
        return { error: normaliseError(err) };
      }
      if (attempt < CONFIG.maxRetries && shouldRetry(err)) {
        await sleep(400 * 2 ** attempt + Math.random() * 200); // exp backoff + jitter
        attempt += 1;
        continue;
      }
      return { error: normaliseError(err) };
    }
  };
