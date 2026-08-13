/**
 * Read models for the consumer screens.
 *
 * Same rule as `useLiveVerdict`: REST is the floor so a screen is never blank,
 * and the stream is an overlay applied at read time. Pushed ticks are never
 * written into the RTK Query cache — a dropped socket then degrades to the
 * last REST snapshot instead of blanking the list.
 */
import { useMemo } from 'react';
import { useGetConfidenceQuery, useGetStocksQuery, useGetStockQuery } from '@/api/marketApi';
import { useAppSelector } from '@/store';
import type { ApiError, ChartRange, StockConfidence, StockDetail, StockQuote } from '@/types';

/** Apply a streamed tick over a REST quote. */
function overlay<T extends StockQuote>(quote: T, tick?: { price: number; changePct: number; asOf: string }): T {
  if (!tick) return quote;
  return { ...quote, price: tick.price, changePct: tick.changePct, asOf: tick.asOf };
}

export function useStocks() {
  const query = useGetStocksQuery();
  const ticks = useAppSelector(s => s.live.quotes);

  const data = useMemo(
    () => (query.data ?? []).map(q => overlay(q, ticks[q.symbol])),
    [query.data, ticks],
  );

  return {
    data,
    error: query.error as ApiError | undefined,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}

export function useStock(symbol: string, range: ChartRange) {
  const query = useGetStockQuery({ symbol, range });
  const tick = useAppSelector(s => s.live.quotes[symbol]);

  const data: StockDetail | undefined = useMemo(
    () => (query.data ? overlay(query.data, tick) : undefined),
    [query.data, tick],
  );

  return {
    data,
    error: query.error as ApiError | undefined,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}

/** The confidence score + indicator breakdown behind a single share. */
export function useStockConfidence(symbol: string) {
  const query = useGetConfidenceQuery(symbol);

  return {
    data: query.data as StockConfidence | undefined,
    error: query.error as ApiError | undefined,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}
