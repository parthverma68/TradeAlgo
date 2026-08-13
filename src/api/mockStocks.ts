/**
 * Deterministic fixture engine for the consumer trading screens.
 *
 * Everything the home / market / portfolio screens render is generated here, so
 * the whole product is usable with `USE_MOCK=true` and no backend at all.
 * Series are seeded from `symbol + range`, which means a chart looks the same
 * every time you open it — a random walk regenerated per render makes the UI
 * impossible to eyeball for bugs.
 *
 * Shapes mirror what the Spring Boot service is expected to return
 * (`/stocks`, `/stocks/{symbol}`, `/orders`); flipping USE_MOCK to false needs
 * no component changes.
 */
import type {
  BrandKey, Candle, ChartRange, Order, OrderSide, StockDetail, StockQuote,
} from '@/types';

interface Seed {
  symbol: string;
  name: string;
  brand: BrandKey;
  price: number;
  changePct: number;
  /** Daily volatility as a fraction of price — drives candle spread. */
  vol: number;
  volume: number;
  marketCap: number;
}

/** The tradable universe. Ordered as it appears on the home screen. */
export const UNIVERSE: Seed[] = [
  { symbol: 'META',  name: 'Facebook',  brand: 'facebook',  price: 40.8,    changePct: 6.7,   vol: 0.028, volume: 41_280_000,  marketCap: 1.21e12 },
  { symbol: 'TWTR',  name: 'Treasa',    brand: 'twitter',   price: 30.0,    changePct: 6.7,   vol: 0.031, volume: 22_640_000,  marketCap: 3.4e10 },
  { symbol: 'TSLA',  name: 'Tesla',     brand: 'tesla',     price: 7154.45, changePct: 5.58,  vol: 0.035, volume: 75_610_000,  marketCap: 8.9e11 },
  { symbol: 'AMZN',  name: 'Amazon',    brand: 'amazon',    price: 186.42,  changePct: -1.24, vol: 0.022, volume: 38_190_000,  marketCap: 1.94e12 },
  { symbol: 'NFLX',  name: 'Netflix',   brand: 'netflix',   price: 486.12,  changePct: 2.31,  vol: 0.026, volume: 4_120_000,   marketCap: 2.1e11 },
  { symbol: 'GOOGL', name: 'Alphabet',  brand: 'google',    price: 168.75,  changePct: 0.86,  vol: 0.019, volume: 24_870_000,  marketCap: 2.08e12 },
  { symbol: 'MSFT',  name: 'Microsoft', brand: 'microsoft', price: 412.3,   changePct: -0.42, vol: 0.017, volume: 18_450_000,  marketCap: 3.06e12 },
];

const bySymbol = new Map(UNIVERSE.map(s => [s.symbol, s]));

/* ----------------------------- deterministic RNG --------------------------- */

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — small, fast, good enough for fixtures. */
function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------- series shape ------------------------------ */

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** Bars per window, and how far back each bar sits. */
const RANGE_SPEC: Record<ChartRange, { bars: number; stepMs: number; spread: number }> = {
  '24hr': { bars: 7, stepMs: 60 * 60 * 1000,          spread: 0.35 },
  week:   { bars: 7, stepMs: 24 * 60 * 60 * 1000,     spread: 1 },
  month:  { bars: 7, stepMs: 4 * 24 * 60 * 60 * 1000, spread: 2.1 },
  year:   { bars: 7, stepMs: 52 * 24 * 60 * 60 * 1000 / 7, spread: 4.2 },
};

function axisLabels(range: ChartRange, dates: Date[]): { labels: string[]; group: string } {
  switch (range) {
    case '24hr': {
      const labels = dates.map(d => `${d.getHours()}`);
      return { labels, group: 'HRS' };
    }
    case 'year': {
      const short = (d: Date) => {
        const m = MONTHS[d.getMonth()];
        return m[0] + m.slice(1).toLowerCase();
      };
      return { labels: dates.map(short), group: `${dates[0].getFullYear()}` };
    }
    default: {
      const labels = dates.map(d => `${d.getDate()}`);
      return { labels, group: MONTHS[dates[0].getMonth()] };
    }
  }
}

/**
 * Build a candle series that lands exactly on `last`, so the chart's final
 * close always agrees with the headline price. Walking forward from a start
 * price and hoping to hit the quote is the classic way these disagree.
 */
function buildCandles(seed: Seed, range: ChartRange, now: Date): Candle[] {
  const { bars, stepMs, spread } = RANGE_SPEC[range];
  const rand = rng(hash(`${seed.symbol}:${range}`));
  const drift = seed.vol * spread;

  // Random walk backwards from the current price, then reverse.
  const closes: number[] = [seed.price];
  for (let i = 1; i < bars; i += 1) {
    const step = (rand() - 0.5) * 2 * drift;
    closes.push(closes[i - 1] / (1 + step));
  }
  closes.reverse();

  const dates = Array.from(
    { length: bars },
    (_, i) => new Date(now.getTime() - (bars - 1 - i) * stepMs),
  );
  const { labels, group } = axisLabels(range, dates);

  return closes.map((close, i) => {
    const open = i === 0 ? close / (1 + (rand() - 0.5) * drift) : closes[i - 1];
    const body = Math.abs(close - open);
    const wick = (body || close * drift * 0.4) * (0.5 + rand());
    return {
      t: dates[i].toISOString(),
      label: labels[i],
      group: i === 0 ? group : undefined,
      o: +open.toFixed(2),
      c: +close.toFixed(2),
      h: +(Math.max(open, close) + wick).toFixed(2),
      l: +Math.max(0.01, Math.min(open, close) - wick).toFixed(2),
      v: Math.round(seed.volume * (0.6 + rand() * 0.8)),
    };
  });
}

/** 18-point line for the home-screen card sparkline. */
function buildSpark(seed: Seed): number[] {
  const rand = rng(hash(`${seed.symbol}:spark`));
  const pts: number[] = [seed.price];
  for (let i = 1; i < 18; i += 1) {
    pts.push(pts[i - 1] / (1 + (rand() - 0.5) * seed.vol * 1.6));
  }
  return pts.reverse().map(p => +p.toFixed(2));
}

/* --------------------------------- builders -------------------------------- */

export function mockQuote(symbol: string, now = new Date()): StockQuote | null {
  const seed = bySymbol.get(symbol);
  if (!seed) return null;
  return {
    symbol: seed.symbol,
    name: seed.name,
    brand: seed.brand,
    price: seed.price,
    changePct: seed.changePct,
    currency: '$',
    spark: buildSpark(seed),
    asOf: now.toISOString(),
  };
}

export function mockQuotes(now = new Date()): StockQuote[] {
  return UNIVERSE.map(s => mockQuote(s.symbol, now)).filter(
    (q): q is StockQuote => q !== null,
  );
}

export function mockDetail(
  symbol: string,
  range: ChartRange = '24hr',
  now = new Date(),
): StockDetail | null {
  const seed = bySymbol.get(symbol);
  const quote = mockQuote(symbol, now);
  if (!seed || !quote) return null;

  const candles = buildCandles(seed, range, now);
  const highs = candles.map(c => c.h);
  const lows = candles.map(c => c.l);
  const first = candles[0];
  const peak = Math.max(...candles.map(c => c.c));

  return {
    ...quote,
    range,
    candles,
    open: first.o,
    prevClose: +(seed.price / (1 + seed.changePct / 100)).toFixed(2),
    high: +Math.max(...highs).toFixed(2),
    low: +Math.min(...lows).toFixed(2),
    dayHigh: +Math.max(...highs).toFixed(2),
    dayLow: +Math.min(...lows).toFixed(2),
    volume: seed.volume,
    marketCap: seed.marketCap,
    peakChangePct: +(((peak - first.o) / first.o) * 100).toFixed(2),
  };
}

/**
 * Mock order fill. Rejects what a real venue would reject — unknown symbol,
 * non-positive quantity — so the UI's error path is exercised offline.
 */
export function mockOrder(body: {
  symbol: string; side: OrderSide; qty: number;
}): Order {
  const seed = bySymbol.get(body.symbol);
  const base = {
    id: `ord_${Date.now().toString(36)}`,
    symbol: body.symbol,
    side: body.side,
    qty: body.qty,
    placedAt: new Date().toISOString(),
  };
  if (!seed) {
    return { ...base, price: 0, status: 'REJECTED', reason: `Unknown symbol ${body.symbol}` };
  }
  if (!(body.qty > 0)) {
    return { ...base, price: seed.price, status: 'REJECTED', reason: 'Quantity must be greater than zero' };
  }
  return { ...base, price: seed.price, status: 'FILLED' };
}

export const isKnownSymbol = (symbol: string) => bySymbol.has(symbol);
export const seedPrice = (symbol: string) => bySymbol.get(symbol)?.price ?? 0;
export const seedFor = (symbol: string) => bySymbol.get(symbol);
