/**
 * Deterministic fixture engine for the consumer confidence screens.
 *
 * Everything the home / markets / stock screens render is generated here, so
 * the whole product is usable with `USE_MOCK=true` and no backend at all.
 * Series are seeded from `symbol + range` (or `symbol + <indicator salt>`),
 * which means a chart or a confidence score looks the same every time you
 * open it — a random walk regenerated per render makes the UI impossible to
 * eyeball for bugs.
 *
 * Shapes mirror what the Spring Boot service is expected to return
 * (`/stocks`, `/stocks/{symbol}`, `/stocks/{symbol}/confidence`); flipping
 * USE_MOCK to false needs no component changes.
 */
import type {
  Buildup, Candle, ChartRange, IndicatorGroup, MarketKey, Recommendation,
  SectorKey, SignalDirection, StockConfidence, StockDetail, StockQuote,
} from '@/types';

interface Seed {
  symbol: string;
  name: string;
  market: MarketKey;
  sector: SectorKey;
  price: number;
  changePct: number;
  /** Daily volatility as a fraction of price — drives candle spread. */
  vol: number;
  volume: number;
  marketCap: number;
}

/** The tradable universe: 2 markets × 10 industry categories. */
export const UNIVERSE: Seed[] = [
  // ---- India · NSE -----------------------------------------------------
  { symbol: 'TCS',        name: 'Tata Consultancy Services', market: 'IN', sector: 'it',            price: 3854.2,  changePct: 0.62,  vol: 0.014, volume: 2_140_000,  marketCap: 1.40e13 },
  { symbol: 'INFY',       name: 'Infosys',                   market: 'IN', sector: 'it',            price: 1621.4,  changePct: -0.85, vol: 0.017, volume: 6_820_000,  marketCap: 6.73e12 },
  { symbol: 'TATASTEEL',  name: 'Tata Steel',                market: 'IN', sector: 'metal',         price: 148.35,  changePct: 2.14,  vol: 0.026, volume: 41_200_000, marketCap: 1.85e12 },
  { symbol: 'HINDALCO',   name: 'Hindalco Industries',       market: 'IN', sector: 'metal',         price: 645.7,   changePct: 1.38,  vol: 0.023, volume: 8_450_000,  marketCap: 1.45e12 },
  { symbol: 'DIXON',      name: 'Dixon Technologies',        market: 'IN', sector: 'semiconductor', price: 11238.5, changePct: 3.42,  vol: 0.033, volume: 610_000,    marketCap: 6.7e11 },
  { symbol: 'TATAELXSI',  name: 'Tata Elxsi',                market: 'IN', sector: 'semiconductor', price: 7104.8,  changePct: -1.12, vol: 0.024, volume: 210_000,    marketCap: 4.4e11 },
  { symbol: 'SUNPHARMA',  name: 'Sun Pharmaceutical',        market: 'IN', sector: 'pharma',        price: 1782.6,  changePct: 0.94,  vol: 0.016, volume: 4_120_000,  marketCap: 4.28e12 },
  { symbol: 'DRREDDY',    name: "Dr. Reddy's Laboratories",  market: 'IN', sector: 'pharma',        price: 6652.1,  changePct: -0.38, vol: 0.018, volume: 980_000,    marketCap: 1.11e12 },
  { symbol: 'HDFCBANK',   name: 'HDFC Bank',                 market: 'IN', sector: 'banking',       price: 1652.9,  changePct: 0.47,  vol: 0.012, volume: 9_340_000,  marketCap: 1.26e13 },
  { symbol: 'ICICIBANK',  name: 'ICICI Bank',                market: 'IN', sector: 'banking',       price: 1195.3,  changePct: 1.05,  vol: 0.014, volume: 7_610_000,  marketCap: 8.4e12 },
  { symbol: 'MARUTI',     name: 'Maruti Suzuki',             market: 'IN', sector: 'auto',          price: 12104.7, changePct: -0.61, vol: 0.015, volume: 480_000,    marketCap: 3.8e12 },
  { symbol: 'TATAMOTORS', name: 'Tata Motors',               market: 'IN', sector: 'auto',          price: 985.4,   changePct: 2.87,  vol: 0.028, volume: 12_600_000, marketCap: 3.6e12 },
  { symbol: 'RELIANCE',   name: 'Reliance Industries',       market: 'IN', sector: 'energy',        price: 2951.8,  changePct: 0.28,  vol: 0.013, volume: 6_950_000,  marketCap: 1.99e13 },
  { symbol: 'NTPC',       name: 'NTPC',                      market: 'IN', sector: 'energy',        price: 365.2,   changePct: -1.24, vol: 0.017, volume: 15_400_000, marketCap: 3.54e12 },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever',        market: 'IN', sector: 'fmcg',          price: 2412.6,  changePct: 0.19,  vol: 0.010, volume: 1_850_000,  marketCap: 5.67e12 },
  { symbol: 'ITC',        name: 'ITC',                       market: 'IN', sector: 'fmcg',          price: 465.8,   changePct: -0.44, vol: 0.011, volume: 10_200_000, marketCap: 5.83e12 },
  { symbol: 'DLF',        name: 'DLF',                       market: 'IN', sector: 'realty',        price: 810.3,   changePct: 3.65,  vol: 0.031, volume: 9_120_000,  marketCap: 2.01e12 },
  { symbol: 'GODREJPROP', name: 'Godrej Properties',         market: 'IN', sector: 'realty',        price: 2341.9,  changePct: -2.08, vol: 0.029, volume: 1_240_000,  marketCap: 7.6e11 },
  { symbol: 'ZEEL',       name: 'Zee Entertainment',         market: 'IN', sector: 'media',         price: 135.6,   changePct: -3.21, vol: 0.038, volume: 22_400_000, marketCap: 1.3e11 },
  { symbol: 'SUNTV',      name: 'Sun TV Network',            market: 'IN', sector: 'media',         price: 640.2,   changePct: 1.62,  vol: 0.021, volume: 2_180_000,  marketCap: 2.5e11 },

  // ---- United States -----------------------------------------------------
  { symbol: 'MSFT',  name: 'Microsoft',            market: 'US', sector: 'it',            price: 412.3,  changePct: -0.42, vol: 0.017, volume: 18_450_000, marketCap: 3.06e12 },
  { symbol: 'ORCL',  name: 'Oracle',               market: 'US', sector: 'it',            price: 172.5,  changePct: 1.18,  vol: 0.021, volume: 8_760_000,  marketCap: 4.76e11 },
  { symbol: 'NVDA',  name: 'NVIDIA',               market: 'US', sector: 'semiconductor', price: 118.4,  changePct: 4.26,  vol: 0.036, volume: 220_400_000, marketCap: 2.91e12 },
  { symbol: 'AMD',   name: 'Advanced Micro Devices', market: 'US', sector: 'semiconductor', price: 142.7, changePct: -2.15, vol: 0.034, volume: 54_100_000, marketCap: 2.31e11 },
  { symbol: 'PFE',   name: 'Pfizer',               market: 'US', sector: 'pharma',        price: 28.9,   changePct: -0.72, vol: 0.019, volume: 33_600_000, marketCap: 1.64e11 },
  { symbol: 'JNJ',   name: 'Johnson & Johnson',    market: 'US', sector: 'pharma',        price: 156.2,  changePct: 0.31,  vol: 0.011, volume: 6_120_000,  marketCap: 3.76e11 },
  { symbol: 'XOM',   name: 'Exxon Mobil',          market: 'US', sector: 'energy',        price: 112.8,  changePct: 1.44,  vol: 0.016, volume: 15_800_000, marketCap: 4.55e11 },
  { symbol: 'CVX',   name: 'Chevron',              market: 'US', sector: 'energy',        price: 158.4,  changePct: -0.18, vol: 0.015, volume: 8_340_000,  marketCap: 2.9e11 },
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

/** 18-point line for the card sparkline. */
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
    market: seed.market,
    sector: seed.sector,
    price: seed.price,
    changePct: seed.changePct,
    currency: seed.market === 'IN' ? '₹' : '$',
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

/* ------------------------------- confidence -------------------------------- */

const BUILDUPS: Buildup[] = ['long_buildup', 'short_buildup', 'short_covering', 'long_unwinding'];
const BUILDUP_LABEL: Record<Buildup, string> = {
  long_buildup: 'Long buildup', short_buildup: 'Short buildup',
  short_covering: 'Short covering', long_unwinding: 'Long unwinding',
};
const RATINGS = ['Strong Buy', 'Buy', 'Hold', 'Sell'];
const GUIDANCE = ['Raised', 'Maintained', 'Cautious', 'Withdrawn'];

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const signOf = (n: number) => (n >= 0 ? '+' : '');

/** 0-100 score for one group, gently correlated with the stock's day move. */
function scoreFor(symbol: string, salt: string, tilt: number): number {
  const r = rng(hash(`${symbol}:${salt}`))();
  return Math.round(clamp(r * 66 + 17 + tilt, 2, 98));
}
const signalFor = (score: number): SignalDirection =>
  score >= 60 ? 'BULLISH' : score <= 40 ? 'BEARISH' : 'NEUTRAL';

const GROUP_WEIGHTS: Record<string, number> = {
  fno: 0.20, technical: 0.15, news: 0.15, earnings: 0.15, future: 0.20, shareholder: 0.15,
};

/**
 * Deterministic indicator + confidence build for a single share. Six groups
 * synthesize the F&O tape, price technicals, headline sentiment, the last
 * earnings print, forward earnings prospects and shareholder conviction into
 * one 0-100 buy confidence.
 */
export function mockConfidence(symbol: string, now = new Date()): StockConfidence | null {
  const seed = bySymbol.get(symbol);
  if (!seed) return null;

  const tilt = clamp(seed.changePct * 2.4, -14, 14);
  const rand = rng(hash(`${symbol}:confidence-detail`));

  const fnoScore = scoreFor(symbol, 'fno', tilt);
  const pcr = +(0.6 + rand() * 1.2).toFixed(2);
  const ivDelta = +((rand() - 0.5) * 30).toFixed(1);
  const maxPainDist = +((rand() - 0.5) * 5).toFixed(2);
  const buildup = BUILDUPS[Math.floor(rand() * BUILDUPS.length)];
  const fno: IndicatorGroup = {
    key: 'fno', title: 'F&O Positioning', score: fnoScore, signal: signalFor(fnoScore), premium: false,
    items: [
      { label: 'Put/Call Ratio', value: pcr.toFixed(2), signal: pcr > 1.05 ? 'BULLISH' : pcr < 0.9 ? 'BEARISH' : 'NEUTRAL' },
      { label: 'OI Buildup', value: BUILDUP_LABEL[buildup], signal: buildup === 'long_buildup' || buildup === 'short_covering' ? 'BULLISH' : 'BEARISH' },
      { label: 'IV vs 20D avg', value: `${signOf(ivDelta)}${ivDelta}%`, signal: ivDelta < 0 ? 'BULLISH' : ivDelta > 10 ? 'BEARISH' : 'NEUTRAL' },
      { label: 'Max pain distance', value: `${signOf(maxPainDist)}${maxPainDist}%`, signal: Math.abs(maxPainDist) < 1.5 ? 'NEUTRAL' : maxPainDist > 0 ? 'BEARISH' : 'BULLISH' },
    ],
  };

  const techScore = scoreFor(symbol, 'technical', tilt);
  const rsi = Math.round(30 + rand() * 50);
  const above50 = rand() > 0.4;
  const above200 = rand() > 0.35;
  const volSurge = +((rand() - 0.3) * 60).toFixed(0);
  const technical: IndicatorGroup = {
    key: 'technical', title: 'Technical Momentum', score: techScore, signal: signalFor(techScore), premium: false,
    items: [
      { label: 'RSI (14)', value: `${rsi}`, signal: rsi > 60 ? 'BULLISH' : rsi < 40 ? 'BEARISH' : 'NEUTRAL' },
      { label: 'Vs 50-day average', value: above50 ? 'Above' : 'Below', signal: above50 ? 'BULLISH' : 'BEARISH' },
      { label: 'Vs 200-day average', value: above200 ? 'Above' : 'Below', signal: above200 ? 'BULLISH' : 'BEARISH' },
      { label: 'Volume vs 30D avg', value: `${signOf(volSurge)}${volSurge}%`, signal: volSurge > 15 ? 'BULLISH' : volSurge < -15 ? 'BEARISH' : 'NEUTRAL' },
    ],
  };

  const newsScore = scoreFor(symbol, 'news', tilt);
  const bullHeadlines = Math.round(2 + rand() * 9);
  const bearHeadlines = Math.round(1 + rand() * 6);
  const netSentiment = +((newsScore - 50) / 50).toFixed(2);
  const news: IndicatorGroup = {
    key: 'news', title: 'News & Sentiment', score: newsScore, signal: signalFor(newsScore), premium: false,
    items: [
      { label: 'Net headline sentiment', value: `${signOf(netSentiment)}${netSentiment}`, signal: signalFor(newsScore) },
      { label: 'Bullish headlines (7d)', value: `${bullHeadlines}`, signal: 'BULLISH' },
      { label: 'Bearish headlines (7d)', value: `${bearHeadlines}`, signal: 'BEARISH' },
      { label: 'Sector theme', value: SECTOR_THEME[seed.sector], signal: signalFor(newsScore) },
    ],
  };

  const earnScore = scoreFor(symbol, 'earnings', tilt);
  const epsSurprise = +((rand() - 0.35) * 18).toFixed(1);
  const revGrowth = +((rand() - 0.2) * 22).toFixed(1);
  const marginTrend = rand() > 0.5 ? 'Expanding' : 'Contracting';
  const guidance = GUIDANCE[Math.floor(rand() * GUIDANCE.length)];
  const earnings: IndicatorGroup = {
    key: 'earnings', title: 'Earnings Track Record', score: earnScore, signal: signalFor(earnScore), premium: true,
    items: [
      { label: 'Last quarter EPS surprise', value: `${signOf(epsSurprise)}${epsSurprise}%`, signal: epsSurprise >= 0 ? 'BULLISH' : 'BEARISH' },
      { label: 'Revenue growth YoY', value: `${signOf(revGrowth)}${revGrowth}%`, signal: revGrowth >= 5 ? 'BULLISH' : revGrowth < 0 ? 'BEARISH' : 'NEUTRAL' },
      { label: 'Margin trend', value: marginTrend, signal: marginTrend === 'Expanding' ? 'BULLISH' : 'BEARISH' },
      { label: 'Management guidance', value: guidance, signal: guidance === 'Raised' ? 'BULLISH' : guidance === 'Withdrawn' ? 'BEARISH' : 'NEUTRAL' },
    ],
  };

  const futureScore = scoreFor(symbol, 'future', tilt);
  const fyGrowth = +((rand() - 0.15) * 26).toFixed(1);
  const rating = RATINGS[Math.floor(clamp((100 - futureScore) / 25, 0, 3))];
  const upside = +((futureScore - 50) / 2.2).toFixed(1);
  const forwardPe = +(12 + rand() * 22).toFixed(1);
  const future: IndicatorGroup = {
    key: 'future', title: 'Future Earnings Prospect', score: futureScore, signal: signalFor(futureScore), premium: true,
    items: [
      { label: 'Next FY consensus EPS growth', value: `${signOf(fyGrowth)}${fyGrowth}%`, signal: fyGrowth >= 8 ? 'BULLISH' : fyGrowth < 0 ? 'BEARISH' : 'NEUTRAL' },
      { label: 'Analyst rating consensus', value: rating, signal: rating.includes('Buy') ? 'BULLISH' : rating === 'Sell' ? 'BEARISH' : 'NEUTRAL' },
      { label: 'Price target upside', value: `${signOf(upside)}${upside}%`, signal: upside > 5 ? 'BULLISH' : upside < -5 ? 'BEARISH' : 'NEUTRAL' },
      { label: 'Forward P/E vs sector avg', value: `${forwardPe}x`, signal: 'NEUTRAL' },
    ],
  };

  const shareScore = scoreFor(symbol, 'shareholder', tilt);
  const promoterChg = +((rand() - 0.4) * 4).toFixed(2);
  const fiiFlow = Math.round((rand() - 0.35) * 900);
  const diiFlow = Math.round((rand() - 0.3) * 600);
  const delivery = +((rand() - 0.3) * 25).toFixed(1);
  const insider = rand() > 0.55 ? 'Net buying' : rand() > 0.3 ? 'Net selling' : 'No activity';
  const shareholder: IndicatorGroup = {
    key: 'shareholder', title: 'Shareholder Confidence', score: shareScore, signal: signalFor(shareScore), premium: true,
    items: [
      { label: 'Promoter holding change (QoQ)', value: `${signOf(promoterChg)}${promoterChg}%`, signal: promoterChg >= 0 ? 'BULLISH' : 'BEARISH' },
      { label: 'FII net flow', value: `${signOf(fiiFlow)}${Math.abs(fiiFlow)} cr`, signal: fiiFlow >= 0 ? 'BULLISH' : 'BEARISH' },
      { label: 'DII net flow', value: `${signOf(diiFlow)}${Math.abs(diiFlow)} cr`, signal: diiFlow >= 0 ? 'BULLISH' : 'BEARISH' },
      { label: 'Delivery % vs average', value: `${signOf(delivery)}${delivery}%`, signal: delivery >= 0 ? 'BULLISH' : 'NEUTRAL' },
      { label: 'Insider activity', value: insider, signal: insider === 'Net buying' ? 'BULLISH' : insider === 'Net selling' ? 'BEARISH' : 'NEUTRAL' },
    ],
  };

  const groups = [fno, technical, news, earnings, future, shareholder];
  const overall = Math.round(
    groups.reduce((sum, g) => sum + g.score * (GROUP_WEIGHTS[g.key] ?? 0), 0),
  );
  const recommendation: Recommendation = overall >= 68 ? 'BUY' : overall >= 45 ? 'WATCH' : 'AVOID';
  const signal = signalFor(overall);

  const summary = `${seed.name} scores ${overall}% across F&O positioning, technical momentum, news `
    + `sentiment, earnings track record, forward earnings outlook and shareholder confidence. `
    + `Net read: ${recommendation === 'BUY' ? 'buyers are in control' : recommendation === 'AVOID' ? 'sellers are in control' : 'signals are mixed'} — `
    + `treat this as one input, not a standalone call.`;

  return {
    symbol, overall, signal, recommendation, summary, groups,
    asOf: now.toISOString(),
  };
}

const SECTOR_THEME: Record<SectorKey, string> = {
  it: 'Deal wins & margin commentary', metal: 'Global prices & China demand',
  semiconductor: 'Capex cycle & export orders', pharma: 'US generics pricing & approvals',
  banking: 'Credit growth & asset quality', auto: 'Volume data & new launches',
  energy: 'Crude prices & refining margins', fmcg: 'Rural demand & input costs',
  realty: 'Launch pipeline & rate outlook', media: 'Ad spend & subscriber trends',
};

export const isKnownSymbol = (symbol: string) => bySymbol.has(symbol);
export const seedPrice = (symbol: string) => bySymbol.get(symbol)?.price ?? 0;
export const seedFor = (symbol: string) => bySymbol.get(symbol);
