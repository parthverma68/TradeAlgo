import { mockConfidence, mockDetail, mockQuote, mockQuotes, UNIVERSE } from '@/api/mockStocks';
import { resolveMock } from '@/api/mock';
import type { ChartRange } from '@/types';

const RANGES: ChartRange[] = ['24hr', 'week', 'month', 'year'];

describe('mock market data', () => {
  it('returns a quote for every symbol in the universe', () => {
    const quotes = mockQuotes();
    expect(quotes).toHaveLength(UNIVERSE.length);
    quotes.forEach(q => {
      expect(q.spark.length).toBeGreaterThan(1);
      expect(q.price).toBeGreaterThan(0);
    });
  });

  it('is deterministic — the same symbol and range give the same series', () => {
    const at = new Date('2026-08-13T09:30:00.000Z');
    expect(mockDetail('TCS', 'week', at)).toEqual(mockDetail('TCS', 'week', at));
  });

  it('ends every series on the headline price so chart and header agree', () => {
    RANGES.forEach(range => {
      const detail = mockDetail('TCS', range);
      const quote = mockQuote('TCS');
      expect(detail).not.toBeNull();
      expect(detail!.candles[detail!.candles.length - 1].c).toBeCloseTo(quote!.price, 2);
    });
  });

  it('keeps candles internally consistent (low <= open/close <= high)', () => {
    UNIVERSE.forEach(seed => {
      const detail = mockDetail(seed.symbol, 'month');
      detail!.candles.forEach(c => {
        expect(c.l).toBeLessThanOrEqual(Math.min(c.o, c.c));
        expect(c.h).toBeGreaterThanOrEqual(Math.max(c.o, c.c));
        expect(c.v).toBeGreaterThan(0);
      });
    });
  });

  it('labels the first candle with a group heading for the axis', () => {
    const detail = mockDetail('INFY', 'week');
    expect(detail!.candles[0].group).toBeTruthy();
    expect(detail!.candles.slice(1).every(c => c.group === undefined)).toBe(true);
  });

  it('has no data for an unknown symbol rather than inventing one', () => {
    expect(mockDetail('NOPE')).toBeNull();
    expect(mockQuote('NOPE')).toBeNull();
  });
});

describe('mock confidence engine', () => {
  it('builds six weighted indicator groups for every symbol', () => {
    UNIVERSE.forEach(seed => {
      const confidence = mockConfidence(seed.symbol);
      expect(confidence).not.toBeNull();
      expect(confidence!.groups).toHaveLength(6);
      expect(confidence!.overall).toBeGreaterThanOrEqual(0);
      expect(confidence!.overall).toBeLessThanOrEqual(100);
      expect(['BUY', 'WATCH', 'AVOID']).toContain(confidence!.recommendation);
    });
  });

  it('marks earnings, forward outlook and shareholder confidence as premium', () => {
    const confidence = mockConfidence('TCS')!;
    const premiumKeys = confidence.groups.filter(g => g.premium).map(g => g.key);
    expect(premiumKeys.sort()).toEqual(['earnings', 'future', 'shareholder']);
    const freeKeys = confidence.groups.filter(g => !g.premium).map(g => g.key);
    expect(freeKeys.sort()).toEqual(['fno', 'news', 'technical']);
  });

  it('is deterministic — the same symbol gives the same score every call', () => {
    expect(mockConfidence('RELIANCE')).toEqual(mockConfidence('RELIANCE'));
  });

  it('has no confidence for an unknown symbol', () => {
    expect(mockConfidence('NOPE')).toBeNull();
  });
});

describe('mock route resolution', () => {
  it('serves the consumer confidence endpoints', () => {
    expect(Array.isArray(resolveMock('/stocks'))).toBe(true);
    expect(resolveMock('/stocks/TCS?range=week')).toMatchObject({ symbol: 'TCS', range: 'week' });
    expect(resolveMock('/stocks/TCS/confidence')).toMatchObject({ symbol: 'TCS' });
  });

  it('falls back to a safe range when the query string is junk', () => {
    expect(resolveMock('/stocks/TCS?range=decade')).toMatchObject({ range: '24hr' });
  });

  it('returns null for an unmapped route so the caller can error honestly', () => {
    expect(resolveMock('/not/a/route')).toBeNull();
  });
});
