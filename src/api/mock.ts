/**
 * Offline fixtures. Shapes match docs/03-API-CONTRACT.md exactly, so switching
 * CONFIG.useMock -> false requires zero component changes.
 */
import type {
  PreOpen, OptionChain, FuturesSnapshot, GlobalQuote, Sector, NewsItem, AlertItem,
} from '@/types';

const chainRows = (base: number, step: number, n: number) =>
  Array.from({ length: n }, (_, i) => {
    const strike = base + i * step;
    const dist = (strike - (base + (n / 2) * step)) / step;
    return {
      strike,
      callOi: Math.round(40 + Math.max(0, dist) * 38 + Math.random() * 12),
      callChgOi: Math.round((Math.random() - 0.4) * 20),
      callIv: +(13 + Math.random() * 3).toFixed(2),
      callLtp: +(Math.max(2, 120 - dist * 30) + Math.random() * 8).toFixed(2),
      putOi: Math.round(40 + Math.max(0, -dist) * 42 + Math.random() * 12),
      putChgOi: Math.round((Math.random() - 0.3) * 24),
      putIv: +(14 + Math.random() * 3).toFixed(2),
      putLtp: +(Math.max(2, 120 + dist * 30) + Math.random() * 8).toFixed(2),
    };
  });

export const MOCK_PREOPEN: Record<string, PreOpen> = {
  NIFTY: {
    symbol: 'NIFTY',
    asOf: new Date().toISOString(),
    spot: 24218.6, futures: 24251.0, dayChangePct: 0.34,
    verdict: { signal: 'BULLISH', confidence: 71, bullScore: 73, bearScore: 41, riskScore: 38 },
    metrics: {
      pcr: 1.46, ivScore: 0.88, volScore: 42, gapUpProb: 58,
      maxPain: 24200, basis: 32.4, range: [24050, 24420], buildup: 'long_buildup',
    },
    aiExplanation:
      'NIFTY leans bullish into the open. PCR at 1.46 shows put writers defending 24000, ' +
      'futures hold a 32pt premium to spot, and IV sits below its average — a calmer tape. ' +
      'Overnight global tone was constructive. Expected range 24,050–24,420.',
    spark: [24135, 24150, 24142, 24180, 24205, 24190, 24230, 24218],
  },
  BANKNIFTY: {
    symbol: 'BANKNIFTY',
    asOf: new Date().toISOString(),
    spot: 51840.2, futures: 51902.5, dayChangePct: 0.45,
    verdict: { signal: 'NEUTRAL', confidence: 58, bullScore: 55, bearScore: 49, riskScore: 52 },
    metrics: {
      pcr: 0.89, ivScore: 1.05, volScore: 56, gapUpProb: 51,
      maxPain: 51800, basis: 62.3, range: [51400, 52250], buildup: 'short_covering',
    },
    aiExplanation:
      'BANKNIFTY is mixed. PCR below 1 shows call writers active near 52000, but the tape ' +
      'reads short covering rather than fresh selling. IV slightly above average — expect wider swings.',
    spark: [51610, 51580, 51640, 51710, 51690, 51780, 51820, 51840],
  },
};

export const MOCK_CHAIN: Record<string, OptionChain> = {
  NIFTY: {
    symbol: 'NIFTY', expiry: '2026-08-13', pcr: 1.46, maxPain: 24200,
    rows: chainRows(23800, 100, 12),
    zones: { support: [24000, 23800], resistance: [24300, 24500], callWriting: [24300], putWriting: [24000] },
  },
  BANKNIFTY: {
    symbol: 'BANKNIFTY', expiry: '2026-08-13', pcr: 0.89, maxPain: 51800,
    rows: chainRows(51000, 200, 12),
    zones: { support: [51500, 51200], resistance: [52000, 52500], callWriting: [52000], putWriting: [51500] },
  },
};

export const MOCK_FUTURES: Record<string, FuturesSnapshot> = {
  NIFTY: { symbol: 'NIFTY', futPrice: 24251, spotPrice: 24218.6, basis: 32.4, oi: 12840000, chgOi: 412000, volume: 284000, buildup: 'long_buildup' },
  BANKNIFTY: { symbol: 'BANKNIFTY', futPrice: 51902.5, spotPrice: 51840.2, basis: 62.3, oi: 3120000, chgOi: -86000, volume: 141000, buildup: 'short_covering' },
};

export const MOCK_GLOBAL: GlobalQuote[] = [
  { key: 'S&P 500', value: 5872.4, changePct: 0.53 },
  { key: 'NASDAQ', value: 20940.1, changePct: 0.77 },
  { key: 'Dow Jones', value: 43210, changePct: 0.31 },
  { key: 'VIX', value: 13.1, changePct: -4.2 },
  { key: 'Nikkei 225', value: 38420, changePct: -0.67 },
  { key: 'Hang Seng', value: 19880, changePct: 0.44 },
  { key: 'GIFT Nifty', value: 24290, changePct: 0.29 },
  { key: 'Crude (WTI)', value: 71.4, changePct: -1.1 },
  { key: 'Gold', value: 2638, changePct: 0.62 },
  { key: 'USD/INR', value: 84.42, changePct: 0.09 },
];

export const MOCK_SECTORS: Sector[] = [
  { sector: 'Banking', changePct: 1.2 }, { sector: 'IT', changePct: -0.6 },
  { sector: 'Auto', changePct: 0.9 }, { sector: 'Pharma', changePct: 0.3 },
  { sector: 'FMCG', changePct: -0.2 }, { sector: 'Metal', changePct: 1.8 },
  { sector: 'Energy', changePct: 0.5 }, { sector: 'Realty', changePct: -1.1 },
  { sector: 'PSU Bank', changePct: 2.1 }, { sector: 'Infra', changePct: 0.7 },
  { sector: 'Media', changePct: -0.4 }, { sector: 'Finance', changePct: 0.4 },
];

export const MOCK_NEWS: NewsItem[] = [
  { id: 'n1', headline: 'Fed minutes signal patience on rate cuts; markets read a dovish tilt', source: 'Reuters', sentiment: 0.6, classification: 'BULLISH', tag: 'Macro', publishedAt: new Date().toISOString() },
  { id: 'n2', headline: 'Strong overnight tech earnings lift semiconductor sentiment', source: 'Bloomberg', sentiment: 0.8, classification: 'BULLISH', tag: 'Tech', publishedAt: new Date().toISOString() },
  { id: 'n3', headline: 'Crude slips below $72 on demand concerns — positive for importers', source: 'ET Markets', sentiment: 0.4, classification: 'BULLISH', tag: 'Energy', publishedAt: new Date().toISOString() },
  { id: 'n4', headline: 'Profit booking flagged in metals after a sharp three-day rally', source: 'Moneycontrol', sentiment: -0.4, classification: 'BEARISH', tag: 'Metal', publishedAt: new Date().toISOString() },
  { id: 'n5', headline: 'Heavy FII inflows continue for a second straight session', source: 'NSE', sentiment: 0.7, classification: 'BULLISH', tag: 'Flows', publishedAt: new Date().toISOString() },
];

export const MOCK_ALERTS: AlertItem[] = [
  { id: 'a1', type: 'iv_spike', symbol: 'BANKNIFTY', message: 'IV jumped 12% above its 20-day average', createdAt: new Date(Date.now() - 6e5).toISOString(), read: false },
  { id: 'a2', type: 'unusual_oi', symbol: 'NIFTY', message: 'Unusual put writing at 24000 — support building', createdAt: new Date(Date.now() - 24e5).toISOString(), read: false },
  { id: 'a3', type: 'gap_up', symbol: 'NIFTY', message: 'Gap-up probability crossed 55%', createdAt: new Date(Date.now() - 54e5).toISOString(), read: true },
];

/** Resolve a mock payload for a given endpoint path. */
export function resolveMock(url: string): unknown {
  const [path, qs] = url.split('?');
  const params = new URLSearchParams(qs ?? '');
  const symbol = params.get('symbol') ?? 'NIFTY';

  if (path.startsWith('/market/preopen')) return MOCK_PREOPEN[symbol] ?? MOCK_PREOPEN.NIFTY;
  if (path.startsWith('/market/sentiment')) return (MOCK_PREOPEN[symbol] ?? MOCK_PREOPEN.NIFTY).verdict;
  if (path.startsWith('/options/chain/')) {
    const s = path.split('/options/chain/')[1] ?? 'NIFTY';
    return MOCK_CHAIN[s] ?? MOCK_CHAIN.NIFTY;
  }
  if (path.startsWith('/futures/')) {
    const s = path.split('/futures/')[1] ?? 'NIFTY';
    return MOCK_FUTURES[s] ?? MOCK_FUTURES.NIFTY;
  }
  if (path.startsWith('/global/markets')) return MOCK_GLOBAL;
  if (path.startsWith('/sector/strength')) return MOCK_SECTORS;
  if (path.startsWith('/news/sentiment')) return MOCK_NEWS;
  if (path.startsWith('/alerts')) return MOCK_ALERTS;
  if (path.startsWith('/watchlist')) return ['NIFTY', 'BANKNIFTY'];
  if (path.startsWith('/auth/')) return { token: 'mock.jwt.token', user: { id: 'u1', email: 'demo@premarketiq.app' } };
  return null;
}
