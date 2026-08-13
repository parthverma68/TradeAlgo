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
