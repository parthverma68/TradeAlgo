export type SignalDirection = 'BULLISH' | 'BEARISH' | 'NEUTRAL';
export type Buildup =
  | 'long_buildup' | 'short_buildup' | 'short_covering' | 'long_unwinding';

export interface Verdict {
  signal: SignalDirection;
  confidence: number;   // 0-100
  bullScore: number;
  bearScore: number;
  riskScore: number;
}

export interface Metrics {
  pcr: number;
  ivScore: number;
  volScore: number;
  gapUpProb: number;
  maxPain: number;
  basis: number;
  range: [number, number];
  buildup: Buildup;
}

export interface PreOpen {
  symbol: string;
  asOf: string;
  spot: number;
  futures: number;
  dayChangePct: number;
  verdict: Verdict;
  metrics: Metrics;
  aiExplanation: string;
  spark: number[];
  disclaimer?: string;
}

export interface ChainRow {
  strike: number;
  callOi: number; callChgOi: number; callIv: number; callLtp: number;
  putOi: number;  putChgOi: number;  putIv: number;  putLtp: number;
}

export interface OptionChain {
  symbol: string;
  expiry: string;
  pcr: number;
  maxPain: number;
  rows: ChainRow[];
  zones: {
    support: number[]; resistance: number[];
    callWriting: number[]; putWriting: number[];
  };
}

export interface FuturesSnapshot {
  symbol: string; futPrice: number; spotPrice: number;
  basis: number; oi: number; chgOi: number; volume: number; buildup: Buildup;
}

export interface GlobalQuote { key: string; value: number; changePct: number; }
export interface Sector { sector: string; changePct: number; }
export interface NewsItem {
  id: string; headline: string; source: string;
  sentiment: number; classification: SignalDirection; tag: string; publishedAt: string;
}
export interface AlertItem {
  id: string; type: string; symbol: string;
  message: string; createdAt: string; read: boolean;
}
export interface User { id: string; email: string; }

export interface ApiError { code: string; message: string; status?: number; }

/* -------------------------------------------------------------------------- */
/* Consumer trading surface (home / market / portfolio)                       */
/* -------------------------------------------------------------------------- */

export type BrandKey =
  | 'facebook' | 'twitter' | 'tesla' | 'amazon'
  | 'netflix' | 'google' | 'microsoft' | 'generic';

/** Chart windows offered by the range selector on the market screen. */
export type ChartRange = '24hr' | 'week' | 'month' | 'year';

export interface Candle {
  /** ISO timestamp of the bucket start. */
  t: string;
  /** Axis tick, e.g. `5`. */
  label: string;
  /** Group heading rendered once, e.g. `NOV`. */
  group?: string;
  o: number; h: number; l: number; c: number; v: number;
}

export interface StockQuote {
  symbol: string;
  name: string;
  brand: BrandKey;
  price: number;
  changePct: number;
  currency: string;
  /** Points for the card sparkline. */
  spark: number[];
  asOf: string;
}

export interface StockDetail extends StockQuote {
  range: ChartRange;
  candles: Candle[];
  open: number;
  prevClose: number;
  high: number;
  low: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  marketCap: number;
  /** Move from the first candle's open to the highest close in the window. */
  peakChangePct: number;
}

export type OrderSide = 'BUY' | 'SELL';

export interface Order {
  id: string;
  symbol: string;
  side: OrderSide;
  qty: number;
  price: number;
  status: 'FILLED' | 'REJECTED';
  placedAt: string;
  /** Present when `status` is `REJECTED`. */
  reason?: string;
}

export interface Holding {
  symbol: string;
  qty: number;
  /** Volume-weighted average cost per share. */
  avgPrice: number;
}

export interface LiveQuote {
  symbol: string;
  price: number;
  changePct: number;
  asOf: string;
}
