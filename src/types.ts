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
/* Consumer confidence surface (home / markets / stock / watchlist)           */
/* -------------------------------------------------------------------------- */

/** Top-level market a stock trades on — the first thing a user picks. */
export type MarketKey = 'IN' | 'US';

export interface MarketInfo { key: MarketKey; label: string; currency: string; }

export const MARKETS: MarketInfo[] = [
  { key: 'IN', label: 'India · NSE', currency: '₹' },
  { key: 'US', label: 'United States', currency: '$' },
];

/** Industry/category a stock belongs to — the second picker, under market. */
export type SectorKey =
  | 'it' | 'metal' | 'semiconductor' | 'pharma' | 'banking'
  | 'auto' | 'energy' | 'fmcg' | 'realty' | 'media';

export interface SectorInfo { key: SectorKey; label: string; }

export const SECTORS: SectorInfo[] = [
  { key: 'it', label: 'IT & Software' },
  { key: 'metal', label: 'Metal & Mining' },
  { key: 'semiconductor', label: 'Semiconductor' },
  { key: 'pharma', label: 'Pharma & Healthcare' },
  { key: 'banking', label: 'Banking & Finance' },
  { key: 'auto', label: 'Auto & Ancillaries' },
  { key: 'energy', label: 'Energy & Power' },
  { key: 'fmcg', label: 'FMCG' },
  { key: 'realty', label: 'Realty' },
  { key: 'media', label: 'Media & Entertainment' },
];

/** Chart windows offered by the range selector on the stock screen. */
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
  market: MarketKey;
  sector: SectorKey;
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

/** One line inside an indicator group, e.g. "PCR — 1.24 — bullish". */
export interface IndicatorItem {
  label: string;
  value: string;
  signal: SignalDirection;
  hint?: string;
}

/** A themed cluster of indicators — F&O, news, earnings, shareholder confidence, etc. */
export interface IndicatorGroup {
  key: string;
  title: string;
  /** 0-100, how strongly this group's evidence leans bullish. */
  score: number;
  signal: SignalDirection;
  /** True when this group's detail is gated behind a subscription. */
  premium: boolean;
  items: IndicatorItem[];
}

export type Recommendation = 'BUY' | 'WATCH' | 'AVOID';

/**
 * Everything the stock screen's confidence card and indicator panels need —
 * one number that synthesizes every signal, plus the breakdown behind it.
 */
export interface StockConfidence {
  symbol: string;
  /** 0-100, weighted across every indicator group. */
  overall: number;
  signal: SignalDirection;
  recommendation: Recommendation;
  summary: string;
  groups: IndicatorGroup[];
  asOf: string;
  disclaimer?: string;
}

export interface LiveQuote {
  symbol: string;
  price: number;
  changePct: number;
  asOf: string;
}

/** Subscription plan gating premium indicators, alerts and API/job access. */
export type PlanKey = 'free' | 'pro';

export interface SubscriptionPlan {
  key: PlanKey;
  label: string;
  priceLabel: string;
  features: string[];
}

export const PLANS: SubscriptionPlan[] = [
  {
    key: 'free',
    label: 'Free',
    priceLabel: '₹0',
    features: [
      'F&O positioning, technical & news indicators',
      'Confidence score for every share',
      '2 watchlist symbols',
    ],
  },
  {
    key: 'pro',
    label: 'Pro',
    priceLabel: '₹499/mo',
    features: [
      'Every indicator — earnings, forward outlook, shareholder confidence',
      'Real-time alerts across all markets & sectors',
      'Unlimited watchlist + scheduled scan jobs',
      'Priority API access',
    ],
  },
];
