/**
 * A row on the home / markets / industry list: sector-tinted avatar, name,
 * trend line, a price tile, and — when known — a confidence pill so the buy
 * signal is visible without opening the stock.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { StockAvatar } from './StockAvatar';
import { TrendLine } from './TrendLine';
import { ArrowUpRight, ArrowDownRight } from '@/design/icons';
import { ui, radii, gap, shadow, deltaColor, recommendationColor, fmtMoney, fmtPct } from '@/design/tokens';
import type { Recommendation, StockQuote } from '@/types';

export const StockCard: React.FC<{
  quote: StockQuote;
  onPress?: () => void;
  /** Optional second line under the name, e.g. the symbol or sector label. */
  subtitle?: string;
  /** 0-100 buy confidence — renders a coloured pill when provided. */
  confidence?: number;
  recommendation?: Recommendation;
}> = ({ quote, onPress, subtitle, confidence, recommendation }) => {
  const positive = quote.changePct >= 0;
  const Arrow = positive ? ArrowUpRight : ArrowDownRight;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${quote.name}, ${fmtMoney(quote.price, quote.currency)}, ${fmtPct(quote.changePct)}`}
      style={({ pressed }) => [s.card, pressed && { opacity: 0.9 }]}
    >
      <View style={s.left}>
        <View style={s.titleRow}>
          <StockAvatar symbol={quote.symbol} sector={quote.sector} size={32} />
          <View style={{ marginLeft: gap.md, flexShrink: 1 }}>
            <Text style={s.name} numberOfLines={1}>{quote.name}</Text>
            {!!subtitle && <Text style={s.subtitle} numberOfLines={1}>{subtitle}</Text>}
            {recommendation !== undefined && confidence !== undefined && (
              <View style={[s.pill, { backgroundColor: `${recommendationColor(recommendation)}1a` }]}>
                <Text style={[s.pillText, { color: recommendationColor(recommendation) }]}>
                  {`${confidence}% ${recommendation}`}
                </Text>
              </View>
            )}
          </View>
        </View>
        <View style={s.spark}>
          <TrendLine data={quote.spark} height={52} width={200} />
        </View>
      </View>

      <View style={s.tile}>
        <Text style={s.price} numberOfLines={1}>
          {fmtMoney(quote.price, quote.currency)}
        </Text>
        <View style={s.deltaRow}>
          <Arrow size={14} color={deltaColor(quote.changePct)} strokeWidth={2.2} />
          <Text style={[s.delta, { color: deltaColor(quote.changePct) }]}>
            {fmtPct(quote.changePct)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ui.card,
    borderRadius: radii.lg,
    padding: gap.lg,
    marginBottom: gap.md,
    ...shadow.card,
  },
  left: { flex: 1, paddingRight: gap.md },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  name: { color: ui.text, fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  subtitle: { color: ui.textMuted, fontSize: 12, marginTop: 2 },
  pill: { alignSelf: 'flex-start', borderRadius: radii.pill, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4 },
  pillText: { fontSize: 10, fontWeight: '800' },
  spark: { marginTop: gap.sm, height: 52, justifyContent: 'center' },
  tile: {
    backgroundColor: ui.tile,
    borderRadius: radii.md,
    paddingHorizontal: gap.md,
    paddingVertical: gap.md,
    minWidth: 108,
    alignItems: 'center',
    justifyContent: 'center',
  },
  price: { color: ui.text, fontSize: 17, fontWeight: '800' },
  deltaRow: { flexDirection: 'row', alignItems: 'center', marginTop: gap.sm },
  delta: { fontSize: 13, fontWeight: '700', marginLeft: 3 },
});
