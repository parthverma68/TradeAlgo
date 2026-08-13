/**
 * Merges REST (RTK Query) with WebSocket pushes. The socket wins when it has a
 * fresher payload; REST is the floor so the screen is never empty.
 */
import { useGetPreOpenQuery } from '@/api/marketApi';
import { useAppSelector } from '@/store';
import { CONFIG } from '@/config';
import type { PreOpen, ApiError } from '@/types';

export function useLiveVerdict(symbol: string) {
  const conn = useAppSelector((s) => s.live.connection);
  const pushed = useAppSelector((s) => s.live.verdicts[symbol]);

  const query = useGetPreOpenQuery(symbol, {
    // If the socket is down, fall back to polling so data still moves.
    pollingInterval: conn === 'connected' ? 0 : CONFIG.pollIntervalMs,
    refetchOnReconnect: true,
  });

  const rest = query.data;
  let data: PreOpen | undefined = rest;
  if (pushed && (!rest || new Date(pushed.asOf) > new Date(rest.asOf))) data = pushed;

  return {
    data,
    error: query.error as ApiError | undefined,
    isLoading: query.isLoading && !data,
    isFetching: query.isFetching,
    refetch: query.refetch,
    connection: conn,
  };
}
