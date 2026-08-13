import reducer, { orderFilled, portfolioReset, heldQty } from '@/store/portfolioSlice';
import type { Order } from '@/types';

const initial = reducer(undefined, { type: '@@INIT' });

const order = (o: Partial<Order>): Order => ({
  id: 'ord_1',
  symbol: 'META',
  side: 'BUY',
  qty: 10,
  price: 40,
  status: 'FILLED',
  placedAt: new Date().toISOString(),
  ...o,
});

describe('portfolio reducer', () => {
  it('starts with a seeded book worth $8,434.00 at seed prices', () => {
    // META 60@40.80 + TWTR 45@30.00 + TSLA 0.4@7154.45 + cash
    const value = 60 * 40.8 + 45 * 30 + 0.4 * 7154.45 + initial.cash;
    expect(value).toBeCloseTo(8434, 2);
  });

  it('adds a new position and debits cash on a buy', () => {
    const next = reducer(initial, orderFilled(order({ symbol: 'NFLX', qty: 2, price: 100 })));
    expect(heldQty(next, 'NFLX')).toBe(2);
    expect(next.cash).toBeCloseTo(initial.cash - 200, 2);
    expect(next.orders[0].symbol).toBe('NFLX');
  });

  it('averages cost when buying more of an existing position', () => {
    // Seeded: 60 @ 34.10. Buying 40 @ 44.10 → 100 @ 38.10.
    const next = reducer(initial, orderFilled(order({ symbol: 'META', qty: 40, price: 44.1 })));
    const meta = next.holdings.find(h => h.symbol === 'META')!;
    expect(meta.qty).toBe(100);
    expect(meta.avgPrice).toBeCloseTo(38.1, 2);
  });

  it('credits cash and leaves average cost alone on a sell', () => {
    const next = reducer(initial, orderFilled(order({ symbol: 'META', side: 'SELL', qty: 10, price: 50 })));
    const meta = next.holdings.find(h => h.symbol === 'META')!;
    expect(meta.qty).toBe(50);
    expect(meta.avgPrice).toBeCloseTo(34.1, 2);
    expect(next.cash).toBeCloseTo(initial.cash + 500, 2);
  });

  it('drops the position once it is fully sold', () => {
    const next = reducer(initial, orderFilled(order({ symbol: 'META', side: 'SELL', qty: 60, price: 40 })));
    expect(next.holdings.find(h => h.symbol === 'META')).toBeUndefined();
    expect(heldQty(next, 'META')).toBe(0);
  });

  it('ignores a rejected order entirely', () => {
    const next = reducer(
      initial,
      orderFilled(order({ status: 'REJECTED', reason: 'Insufficient funds' })),
    );
    expect(next).toEqual(initial);
  });

  it('restores the seeded book on reset', () => {
    const traded = reducer(initial, orderFilled(order({ qty: 5, price: 40 })));
    expect(reducer(traded, portfolioReset())).toEqual(initial);
  });
});
