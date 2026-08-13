import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from './client';
import type {
  PreOpen, OptionChain, FuturesSnapshot, GlobalQuote, Sector,
  NewsItem, AlertItem, User, StockQuote, StockDetail, ChartRange, Order, OrderSide,
} from '@/types';

export const marketApi = createApi({
  reducerPath: 'marketApi',
  baseQuery,
  tagTypes: ['PreOpen', 'Chain', 'Alerts', 'Watchlist', 'Stocks'],
  // Verdicts refresh on a schedule server-side; keep client cache short.
  keepUnusedDataFor: 120,
  endpoints: (b) => ({
    getPreOpen: b.query<PreOpen, string>({
      query: (symbol) => `/market/preopen?symbol=${symbol}`,
      providesTags: (_r, _e, s) => [{ type: 'PreOpen', id: s }],
    }),
    getOptionChain: b.query<OptionChain, { symbol: string; expiry?: string }>({
      query: ({ symbol, expiry }) =>
        `/options/chain/${symbol}${expiry ? `?expiry=${expiry}` : ''}`,
      providesTags: (_r, _e, a) => [{ type: 'Chain', id: a.symbol }],
    }),
    getFutures: b.query<FuturesSnapshot, string>({
      query: (symbol) => `/futures/${symbol}`,
    }),
    getGlobalMarkets: b.query<GlobalQuote[], void>({
      query: () => '/global/markets',
    }),
    getSectorStrength: b.query<Sector[], void>({
      query: () => '/sector/strength',
    }),
    getNews: b.query<NewsItem[], string | void>({
      query: (symbol) => `/news/sentiment${symbol ? `?symbol=${symbol}` : ''}`,
    }),
    getAlerts: b.query<AlertItem[], void>({
      query: () => '/alerts',
      providesTags: ['Alerts'],
    }),
    getWatchlist: b.query<string[], void>({
      query: () => '/watchlist',
      providesTags: ['Watchlist'],
    }),
    addToWatchlist: b.mutation<void, string>({
      query: (symbol) => ({ url: '/watchlist', method: 'POST', body: { symbol } }),
      invalidatesTags: ['Watchlist'],
    }),
    removeFromWatchlist: b.mutation<void, string>({
      query: (symbol) => ({ url: `/watchlist/${symbol}`, method: 'DELETE' }),
      invalidatesTags: ['Watchlist'],
    }),
    login: b.mutation<{ token: string; user: User }, { email: string; password: string }>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
    }),
    register: b.mutation<{ token: string; user: User }, { email: string; password: string }>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
    }),
    /** DOWNSTREAM: hand the device push token to the backend alert dispatcher. */
    registerDevice: b.mutation<void, { token: string; platform: string }>({
      query: (body) => ({ url: '/devices/register', method: 'POST', body }),
    }),
    ackAlert: b.mutation<void, string>({
      query: (id) => ({ url: `/alerts/${id}/ack`, method: 'POST' }),
      invalidatesTags: ['Alerts'],
    }),

    /* ---- consumer trading surface -------------------------------------- */
    getStocks: b.query<StockQuote[], void>({
      query: () => '/stocks',
      providesTags: ['Stocks'],
    }),
    getStock: b.query<StockDetail, { symbol: string; range: ChartRange }>({
      query: ({ symbol, range }) => `/stocks/${symbol}?range=${range}`,
      providesTags: (_r, _e, a) => [{ type: 'Stocks', id: a.symbol }],
    }),
    placeOrder: b.mutation<Order, { symbol: string; side: OrderSide; qty: number }>({
      query: (body) => ({ url: '/orders', method: 'POST', body }),
      invalidatesTags: ['Stocks'],
    }),
  }),
});

export const {
  useGetPreOpenQuery, useGetOptionChainQuery, useGetFuturesQuery,
  useGetGlobalMarketsQuery, useGetSectorStrengthQuery, useGetNewsQuery,
  useGetAlertsQuery, useGetWatchlistQuery, useAddToWatchlistMutation,
  useRemoveFromWatchlistMutation, useLoginMutation, useRegisterMutation,
  useRegisterDeviceMutation, useAckAlertMutation,
  useGetStocksQuery, useGetStockQuery, usePlaceOrderMutation,
} = marketApi;
