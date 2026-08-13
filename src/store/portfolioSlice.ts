/**
 * Local portfolio state: cash, holdings, and the order blotter.
 *
 * Orders are placed through the API (`POST /orders`) and only applied here once
 * the venue reports a fill — the same sequence the real backend will follow, so
 * switching off the mock changes nothing in this file.
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Holding, Order } from '@/types';

export interface PortfolioState {
  cash: number;
  holdings: Holding[];
  orders: Order[];
}

/** Seeded so a fresh install has something to look at. */
const initialState: PortfolioState = {
  cash: 1774.22,
  holdings: [
    { symbol: 'META', qty: 60, avgPrice: 34.1 },
    { symbol: 'TWTR', qty: 45, avgPrice: 27.5 },
    { symbol: 'TSLA', qty: 0.4, avgPrice: 6180 },
  ],
  orders: [],
};

const round = (n: number) => Math.round(n * 100) / 100;

const slice = createSlice({
  name: 'portfolio',
  initialState,
  reducers: {
    orderFilled: (s, a: PayloadAction<Order>) => {
      const order = a.payload;
      if (order.status !== 'FILLED') return;

      s.orders.unshift(order);
      s.orders = s.orders.slice(0, 100);

      const value = order.qty * order.price;
      const existing = s.holdings.find(h => h.symbol === order.symbol);

      if (order.side === 'BUY') {
        s.cash = round(s.cash - value);
        if (existing) {
          const totalQty = existing.qty + order.qty;
          existing.avgPrice = round(
            (existing.avgPrice * existing.qty + value) / totalQty,
          );
          existing.qty = round(totalQty);
        } else {
          s.holdings.push({
            symbol: order.symbol,
            qty: round(order.qty),
            avgPrice: round(order.price),
          });
        }
        return;
      }

      // SELL — average cost is unchanged by a disposal; only size and cash move.
      s.cash = round(s.cash + value);
      if (existing) {
        existing.qty = round(existing.qty - order.qty);
        if (existing.qty <= 0.0001) {
          s.holdings = s.holdings.filter(h => h.symbol !== order.symbol);
        }
      }
    },
    portfolioReset: () => initialState,
  },
});

export const { orderFilled, portfolioReset } = slice.actions;
export default slice.reducer;

/** Shares held of `symbol`, 0 when the position is closed. */
export const heldQty = (s: PortfolioState, symbol: string) =>
  s.holdings.find(h => h.symbol === symbol)?.qty ?? 0;
