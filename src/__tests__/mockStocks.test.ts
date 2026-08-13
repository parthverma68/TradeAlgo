import { mockDetail, mockOrder, mockQuote, mockQuotes, UNIVERSE } from '@/api/mockStocks';
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
    expect(mockDetail('TSLA', 'week', at)).toEqual(mockDetail('TSLA', 'week', at));
  });

  it('ends every series on the headline price so chart and header agree', () => {
    RANGES.forEach(range => {
      const detail = mockDetail('TSLA', range);
      const quote = mockQuote('TSLA');
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
    const detail = mockDetail('META', 'week');
    expect(detail!.candles[0].group).toBeTruthy();
    expect(detail!.candles.slice(1).every(c => c.group === undefined)).toBe(true);
  });

  it('has no data for an unknown symbol rather than inventing one', () => {
    expect(mockDetail('NOPE')).toBeNull();
    expect(mockQuote('NOPE')).toBeNull();
  });
});

describe('mock order placement', () => {
  it('fills a valid order at the current price', () => {
    const order = mockOrder({ symbol: 'META', side: 'BUY', qty: 3 });
    expect(order.status).toBe('FILLED');
    expect(order.price).toBeCloseTo(40.8, 2);
  });

  it('rejects an unknown symbol and a non-positive quantity', () => {
    expect(mockOrder({ symbol: 'NOPE', side: 'BUY', qty: 1 }).status).toBe('REJECTED');
    expect(mockOrder({ symbol: 'META', side: 'SELL', qty: 0 }).status).toBe('REJECTED');
  });
});

describe('mock route resolution', () => {
  it('serves the consumer endpoints', () => {
    expect(Array.isArray(resolveMock('/stocks'))).toBe(true);
    expect(resolveMock('/stocks/TSLA?range=week')).toMatchObject({ symbol: 'TSLA', range: 'week' });
    expect(resolveMock('/orders', 'POST', { symbol: 'TSLA', side: 'BUY', qty: 1 }))
      .toMatchObject({ status: 'FILLED', side: 'BUY' });
  });

  it('falls back to a safe range when the query string is junk', () => {
    expect(resolveMock('/stocks/TSLA?range=decade')).toMatchObject({ range: '24hr' });
  });

  it('returns null for an unmapped route so the caller can error honestly', () => {
    expect(resolveMock('/not/a/route')).toBeNull();
  });
});
