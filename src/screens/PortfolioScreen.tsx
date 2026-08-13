import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { Screen, SectionHeading } from '@/components/ui/Layout';
import { BrandMark } from '@/components/ui/BrandMark';
import { TrendLine } from '@/components/ui/TrendLine';
import { ArrowUpRight, ArrowDownRight, ChevronRight } from '@/design/icons';
import { usePortfolio } from '@/hooks/useStocks';
import { useAppSelector } from '@/store';
import { ui, gap, radii, shadow, deltaColor, fmtMoney, fmtPct } from '@/design/tokens';
import type { TabNav } from '@/navigation/types';

export default function PortfolioScreen() {
  const navigation = useNavigation<TabNav<'Portfolio'>>();
  const p = usePortfolio();
  const orders = useAppSelector(s => s.portfolio.orders);
  const Arrow = p.dayChangePct >= 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <Text style={s.title}>Portfolio</Text>

          <View style={s.hero}>
            <Text style={s.heroLabel}>Portfolio value</Text>
            <Text style={s.heroValue}>{fmtMoney(p.total)}</Text>
            <View style={s.heroRow}>
              <Arrow size={15} color={deltaColor(p.dayChangePct)} strokeWidth={2.2} />
              <Text style={[s.heroDelta, { color: deltaColor(p.dayChangePct) }]}>
                {fmtPct(p.dayChangePct)} today
              </Text>
            </View>
            <View style={s.heroSplit}>
              <Split label="Invested" value={fmtMoney(p.holdingsValue)} />
              <Split label="Cash" value={fmtMoney(p.cash)} />
              <Split
                label="Unrealised"
                value={fmtMoney(p.totalPnl)}
                color={deltaColor(p.totalPnl)}
              />
            </View>
          </View>

          <SectionHeading title="Holdings" />
          {p.positions.length === 0 && (
            <View style={s.empty}>
              <Text style={s.emptyText}>
                No open positions. Buy something from the Markets tab and it shows up here.
              </Text>
            </View>
          )}

          {p.positions.map(pos => (
            <Pressable
              key={pos.symbol}
              style={s.row}
              onPress={() => navigation.navigate('MarketDetail', { symbol: pos.symbol })}
              accessibilityRole="button"
            >
              <BrandMark brand={pos.quote?.brand ?? 'generic'} size={38} />
              <View style={{ flex: 1, marginLeft: gap.md }}>
                <Text style={s.rowName}>{pos.quote?.name ?? pos.symbol}</Text>
                <Text style={s.rowMeta}>
                  {pos.qty} sh · avg {fmtMoney(pos.avgPrice)}
                </Text>
              </View>
              {!!pos.quote && (
                <View style={s.rowSpark}>
                  <TrendLine data={pos.quote.spark} width={90} height={34} baseline={false} endDot={false} />
                </View>
              )}
              <View style={{ alignItems: 'flex-end', marginLeft: gap.sm }}>
                <Text style={s.rowValue}>{fmtMoney(pos.marketValue)}</Text>
                <Text style={[s.rowPnl, { color: deltaColor(pos.pnl) }]}>
                  {fmtPct(pos.pnlPct)}
                </Text>
              </View>
              <ChevronRight size={18} color={ui.textFaint} />
            </Pressable>
          ))}

          <View style={{ height: gap.xl }} />
          <SectionHeading title="Recent orders" />
          {orders.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyText}>No orders in this session yet.</Text>
            </View>
          ) : (
            orders.slice(0, 12).map(o => (
              <View key={o.id} style={s.orderRow}>
                <View
                  style={[
                    s.sideTag,
                    { backgroundColor: o.side === 'BUY' ? ui.purpleTint : ui.tile },
                  ]}
                >
                  <Text
                    style={[
                      s.sideText,
                      { color: o.side === 'BUY' ? ui.purple : ui.text },
                    ]}
                  >
                    {o.side}
                  </Text>
                </View>
                <Text style={s.orderText}>
                  {o.qty} {o.symbol} @ {fmtMoney(o.price)}
                </Text>
                <Text style={s.orderTotal}>{fmtMoney(o.qty * o.price)}</Text>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

const Split: React.FC<{ label: string; value: string; color?: string }> = ({
  label, value, color = ui.text,
}) => (
  <View style={{ flex: 1 }}>
    <Text style={s.splitLabel}>{label}</Text>
    <Text style={[s.splitValue, { color }]} numberOfLines={1}>{value}</Text>
  </View>
);

const s = StyleSheet.create({
  scroll: { paddingHorizontal: gap.lg, paddingBottom: 120 },
  title: {
    color: ui.text, fontSize: 30, fontWeight: '800',
    letterSpacing: -0.8, marginTop: gap.lg, marginBottom: gap.lg,
  },
  hero: {
    backgroundColor: ui.ink,
    borderRadius: radii.xl,
    padding: gap.xl,
    marginBottom: gap.xl,
    ...shadow.floating,
  },
  heroLabel: { color: ui.onInkMuted, fontSize: 14 },
  heroValue: {
    color: '#FFFFFF', fontSize: 36, fontWeight: '800',
    letterSpacing: -1.2, marginTop: gap.xs,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', marginTop: gap.sm },
  heroDelta: { fontSize: 14, fontWeight: '700', marginLeft: 4 },
  heroSplit: {
    flexDirection: 'row',
    marginTop: gap.xl,
    paddingTop: gap.lg,
    borderTopWidth: 1,
    borderTopColor: ui.inkRaised,
  },
  splitLabel: { color: ui.onInkMuted, fontSize: 12 },
  splitValue: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', marginTop: 3 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ui.card,
    borderRadius: radii.lg,
    padding: gap.md,
    marginBottom: gap.sm,
    ...shadow.card,
  },
  rowName: { color: ui.text, fontSize: 15, fontWeight: '700' },
  rowMeta: { color: ui.textMuted, fontSize: 12, marginTop: 2 },
  rowSpark: { width: 90, height: 34, justifyContent: 'center' },
  rowValue: { color: ui.text, fontSize: 15, fontWeight: '700' },
  rowPnl: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  empty: {
    backgroundColor: ui.card, borderRadius: radii.lg, padding: gap.xl, ...shadow.card,
  },
  emptyText: { color: ui.textMuted, fontSize: 14, lineHeight: 20 },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ui.card,
    borderRadius: radii.md,
    paddingHorizontal: gap.md,
    paddingVertical: gap.md,
    marginBottom: gap.sm,
  },
  sideTag: { borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 4 },
  sideText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
  orderText: { flex: 1, color: ui.text, fontSize: 14, marginLeft: gap.md },
  orderTotal: { color: ui.textMuted, fontSize: 13, fontWeight: '600' },
});
