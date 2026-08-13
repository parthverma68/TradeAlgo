/**
 * Render smoke tests. These exist to catch the failures that only show up when
 * a component actually mounts — bad SVG props, undefined tokens, division by
 * zero in the chart maths.
 */
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Rect } from 'react-native-svg';

import { CandleChart } from '@/components/ui/CandleChart';
import { StockCard } from '@/components/ui/StockCard';
import { TrendLine, smoothPath } from '@/components/ui/TrendLine';
import { BrandMark } from '@/components/ui/BrandMark';
import { mockDetail, mockQuote } from '@/api/mockStocks';
import type { BrandKey } from '@/types';

const detail = mockDetail('TSLA', 'week')!;
const quote = mockQuote('META')!;

const render = (el: React.ReactElement) => {
  let tree: renderer.ReactTestRenderer;
  act(() => { tree = renderer.create(el); });
  return tree!;
};

/** The plot only draws once it has been measured, so fake the layout pass. */
const layout = (tree: renderer.ReactTestRenderer, width = 300) => {
  const measured = tree.root.findAll(n => typeof n.props.onLayout === 'function');
  act(() => {
    measured.forEach(n =>
      n.props.onLayout({ nativeEvent: { layout: { width, height: 260, x: 0, y: 0 } } }),
    );
  });
};

describe('chart components', () => {
  it('draws one body per candle once measured, and reports taps', () => {
    const onSelect = jest.fn();
    const tree = render(
      <CandleChart candles={detail.candles} selected={2} onSelect={onSelect} />,
    );
    layout(tree);

    // One body per candle, plus the selection column behind the active bar.
    expect(tree.root.findAllByType(Rect).length).toBe(detail.candles.length + 1);

    const pressables = tree.root.findAll(n => typeof n.props.onPress === 'function');
    expect(pressables.length).toBeGreaterThanOrEqual(detail.candles.length);
    act(() => { pressables[0].props.onPress(); });
    expect(onSelect).toHaveBeenCalled();
  });

  it('clamps a selection past the end of the series', () => {
    const tree = render(
      <CandleChart candles={detail.candles} selected={99} onSelect={() => {}} />,
    );
    expect(() => layout(tree)).not.toThrow();
  });

  it('survives a flat series without dividing by zero', () => {
    const flat = detail.candles.map(c => ({ ...c, o: 10, h: 10, l: 10, c: 10 }));
    const tree = render(<CandleChart candles={flat} selected={0} onSelect={() => {}} />);
    expect(() => layout(tree)).not.toThrow();
    tree.root.findAllByType(Rect).forEach(r => {
      expect(Number.isFinite(Number(r.props.y))).toBe(true);
      expect(Number(r.props.height)).toBeGreaterThan(0);
    });
  });

  it('renders nothing for an empty series instead of crashing', () => {
    const tree = render(<CandleChart candles={[]} selected={0} onSelect={() => {}} />);
    expect(tree.toJSON()).toBeNull();
  });

  it('draws a smooth path through every point', () => {
    const d = smoothPath([
      { x: 0, y: 10 }, { x: 10, y: 4 }, { x: 20, y: 8 }, { x: 30, y: 2 },
    ]);
    expect(d.startsWith('M0 10')).toBe(true);
    expect(d.match(/C/g)).toHaveLength(3);
  });

  it('renders a trend line for a single-point series', () => {
    expect(() => render(<TrendLine data={[1]} />)).not.toThrow();
  });
});

describe('stock card', () => {
  it('renders price and change, and fires onPress', () => {
    const onPress = jest.fn();
    const tree = render(<StockCard quote={quote} onPress={onPress} />);
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('Facebook');
    expect(json).toContain('$40.80');
    expect(json).toContain('+6.70%');

    const card = tree.root.find(
      n => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function',
    );
    act(() => { card.props.onPress(); });
    expect(onPress).toHaveBeenCalled();
  });
});

describe('brand marks', () => {
  const brands: BrandKey[] = [
    'facebook', 'twitter', 'tesla', 'amazon', 'netflix', 'google', 'microsoft', 'generic',
  ];
  it.each(brands)('renders the %s mark', brand => {
    expect(() => render(<BrandMark brand={brand} />)).not.toThrow();
  });
});
