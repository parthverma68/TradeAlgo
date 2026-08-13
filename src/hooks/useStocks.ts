/**
 * Read models for the consumer screens.
 *
 * Same rule as `useLiveVerdict`: REST is the floor so a screen is never blank,
 * and the stream is an overlay applied at read time. Pushed ticks are never
 * written into the RTK Query cache — a dropped socket then degrades to the
 * last REST snapshot instead of blanking the list.
 */
import { useMemo } from 'react';
import { useGetStocksQuery, useGetStockQuery } from '@/api/marketApi';
import { useAppSelector } from '@/store';
import type { ApiError, ChartRange, Holding, StockDetail, StockQuote } from '@/types';

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

export interface PositionView extends Holding {
  quote?: StockQuote;
  marketValue: number;
  cost: number;
  pnl: number;
  pnlPct: number;
}

export interface PortfolioView {
  positions: PositionView[];
  holdingsValue: number;
  cash: number;
  total: number;
  /** Day move of the invested book, value-weighted. */
  dayChangePct: number;
  totalPnl: number;
  loading: boolean;
}

/** Joins local holdings with live quotes into everything the UI needs. */
export function usePortfolio(): PortfolioView {
  const { data: quotes, isLoading } = useStocks();
  const { holdings, cash } = useAppSelector(s => s.portfolio);

  return useMemo(() => {
    const bySymbol = new Map(quotes.map(q => [q.symbol, q]));

    const positions: PositionView[] = holdings.map(h => {
      const quote = bySymbol.get(h.symbol);
      const price = quote?.price ?? h.avgPrice;
      const marketValue = price * h.qty;
      const cost = h.avgPrice * h.qty;
      return {
        ...h,
        quote,
        marketValue,
        cost,
        pnl: marketValue - cost,
        pnlPct: cost === 0 ? 0 : ((marketValue - cost) / cost) * 100,
      };
    });

    const holdingsValue = positions.reduce((a, p) => a + p.marketValue, 0);
    const totalPnl = positions.reduce((a, p) => a + p.pnl, 0);
    const dayChangePct = holdingsValue === 0
      ? 0
      : positions.reduce(
          (a, p) => a + p.marketValue * (p.quote?.changePct ?? 0),
          0,
        ) / holdingsValue;

    return {
      positions,
      holdingsValue,
      cash,
      total: holdingsValue + cash,
      dayChangePct,
      totalPnl,
      loading: isLoading,
    };
  }, [quotes, holdings, cash, isLoading]);
}
