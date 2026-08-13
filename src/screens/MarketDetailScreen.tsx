/**
 * The core screen of the app: one share's buy confidence, synthesized from
 * every indicator group, with the full breakdown underneath. No order ticket
 * here — this app tells you what the signals say, it doesn't execute trades.
 */
import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { CandleChart } from '@/components/ui/CandleChart';
import { StockAvatar } from '@/components/ui/StockAvatar';
import { Screen, CircleButton, SegmentedPills } from '@/components/ui/Layout';
import { Bell, ChevronLeft, LockIcon, BookmarkIcon, BookmarkIconSolid } from '@/design/icons';
import { useStock, useStockConfidence } from '@/hooks/useStocks';
import {
  useGetWatchlistQuery, useAddToWatchlistMutation, useRemoveFromWatchlistMutation,
} from '@/api/marketApi';
import { useAppSelector } from '@/store';
import { DISCLAIMER } from '@/config';
import { ui, gap, radii, shadow, fmtMoney, fmtPct, recommendationColor } from '@/design/tokens';
import type { ChartRange, IndicatorGroup, SignalDirection } from '@/types';
import type { RootStackParamList, RootScreenProps } from '@/navigation/types';

const RANGES: { value: ChartRange; label: string }[] = [
  { value: '24hr', label: '24hr' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
];

const signalColor = (sig: SignalDirection) =>
  sig === 'BULLISH' ? ui.green : sig === 'BEARISH' ? ui.red : ui.amber;

export default function MarketDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<RootScreenProps<'MarketDetail'>['route']>();
  const symbol = params.symbol;

  const [range, setRange] = useState<ChartRange>('24hr');
  const [selected, setSelected] = useState<number | null>(null);
  const plan = useAppSelector(st => st.settings.plan);

  const { data: stock, isLoading: stockLoading } = useStock(symbol, range);
  const { data: confidence, error, isLoading, refetch } = useStockConfidence(symbol);
  const { data: watchlist } = useGetWatchlistQuery();
  const [addWatch, addState] = useAddToWatchlistMutation();
  const [removeWatch, removeState] = useRemoveFromWatchlistMutation();

  const watched = (watchlist ?? []).includes(symbol);
  const busyWatch = addState.isLoading || removeState.isLoading;

  const selectedIndex = useMemo(() => {
    const last = Math.max(0, (stock?.candles.length ?? 1) - 1);
    if (selected === null) return last;
    return Math.min(selected, last);
  }, [selected, stock?.candles.length]);

  if (isLoading) {
    return (
      <Screen>
        <SafeAreaView style={s.centerFill} edges={['top']}>
          <ActivityIndicator color={ui.purple} />
        </SafeAreaView>
      </Screen>
    );
  }

  if (error || !confidence) {
    return (
      <Screen>
        <SafeAreaView style={s.centerFill} edges={['top']}>
          <Pressable onPress={refetch} accessibilityRole="button">
            <Text style={s.errorText}>Couldn't load confidence for {symbol}. Tap to retry.</Text>
          </Pressable>
        </SafeAreaView>
      </Screen>
    );
  }

  const tint = recommendationColor(confidence.recommendation);

  return (
    <Screen gradient={false} style={{ backgroundColor: ui.screenBottom }}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* ---- confidence hero --------------------------------------- */}
        <View style={s.hero}>
          <SafeAreaView edges={['top']}>
            <View style={s.headerRow}>
              <CircleButton
                accessibilityLabel="Go back"
                background={ui.inkRaised}
                onPress={() => navigation.goBack()}
              >
                <ChevronLeft size={20} color="#FFFFFF" />
              </CircleButton>
              <View style={s.headerTitleRow}>
                {!!stock && <StockAvatar symbol={stock.symbol} sector={stock.sector} size={26} />}
                <Text style={s.headerTitle} numberOfLines={1}>{stock?.name ?? symbol}</Text>
              </View>
              <CircleButton
                accessibilityLabel="Alerts"
                background={ui.inkRaised}
                onPress={() => navigation.navigate('Alerts')}
              >
                <Bell size={19} color="#FFFFFF" />
              </CircleButton>
            </View>

            <View style={s.ringRow}>
              <ConfidenceRing value={confidence.overall} color={tint} />
              <View style={{ flex: 1, marginLeft: gap.xl }}>
                <View style={[s.recPill, { backgroundColor: `${tint}2a` }]}>
                  <Text style={[s.recPillText, { color: tint }]}>{confidence.recommendation}</Text>
                </View>
                {!!stock && (
                  <Text style={s.priceLine}>
                    {fmtMoney(stock.price, stock.currency)}
                    <Text style={{ color: stock.changePct >= 0 ? ui.green : ui.red }}>
                      {'  '}{fmtPct(stock.changePct)}
                    </Text>
                  </Text>
                )}
              </View>
            </View>

            <Text style={s.summary}>{confidence.summary}</Text>

            <View style={s.actionsRow}>
              <Pressable
                onPress={() => (watched ? removeWatch(symbol) : addWatch(symbol))}
                disabled={busyWatch}
                accessibilityRole="button"
                style={[s.watchBtn, watched && s.watchBtnActive]}
              >
                {watched
                  ? <BookmarkIconSolid size={16} color="#FFFFFF" />
                  : <BookmarkIcon size={16} color="#FFFFFF" />}
                <Text style={s.watchBtnText}>{watched ? 'Watching' : 'Add to watchlist'}</Text>
              </Pressable>
              <Pressable
                onPress={() => navigation.navigate('Alerts')}
                accessibilityRole="button"
                style={s.alertBtn}
              >
                <Bell size={15} color={ui.text} />
                <Text style={s.alertBtnText}>Set alert</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </View>

        {/* ---- price action -------------------------------------------- */}
        {!!stock && (
          <View style={s.body}>
            <View style={s.priceCard}>
              <View style={s.priceCardHead}>
                <Text style={s.priceCardTitle}>Price action</Text>
                <SegmentedPills options={RANGES} value={range} onChange={r => { setRange(r); setSelected(null); }} />
              </View>
              <CandleChart candles={stock.candles} selected={selectedIndex} onSelect={setSelected} height={220} />
            </View>

            {stockLoading && <ActivityIndicator color={ui.purple} style={{ marginBottom: gap.md }} />}

            <Text style={s.groupsTitle}>Every indicator behind this score</Text>
            {confidence.groups.map(group => (
              <IndicatorPanel
                key={group.key}
                group={group}
                locked={group.premium && plan === 'free'}
                onUnlock={() => navigation.navigate('Subscription')}
              />
            ))}

            <Text style={s.disclaimer}>{confidence.disclaimer ?? DISCLAIMER}</Text>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const ConfidenceRing: React.FC<{ value: number; color: string }> = ({ value, color }) => {
  const size = 108, stroke = 10, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(100, value)) / 100);
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={ui.inkRaised} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={`${c} ${c}`} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={s.ringCenter}>
        <Text style={s.ringValue}>{value}%</Text>
        <Text style={s.ringLabel}>confidence</Text>
      </View>
    </View>
  );
};

const IndicatorPanel: React.FC<{
  group: IndicatorGroup; locked: boolean; onUnlock: () => void;
}> = ({ group, locked, onUnlock }) => {
  const c = signalColor(group.signal);
  return (
    <View style={s.panel}>
      <View style={s.panelHead}>
        <Text style={s.panelTitle}>{group.title}</Text>
        {!locked && (
          <View style={[s.scorePill, { backgroundColor: `${c}1f` }]}>
            <Text style={[s.scorePillText, { color: c }]}>{group.score}%</Text>
          </View>
        )}
      </View>

      {locked ? (
        <Pressable onPress={onUnlock} accessibilityRole="button" style={s.lockedBox}>
          <LockIcon size={18} color={ui.textFaint} />
          <Text style={s.lockedText}>Unlock {group.title.toLowerCase()} with Pro</Text>
        </Pressable>
      ) : (
        group.items.map(item => (
          <View key={item.label} style={s.itemRow}>
            <View style={[s.itemDot, { backgroundColor: signalColor(item.signal) }]} />
            <Text style={s.itemLabel} numberOfLines={1}>{item.label}</Text>
            <Text style={s.itemValue}>{item.value}</Text>
          </View>
        ))
      )}
    </View>
  );
};

const s = StyleSheet.create({
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: ui.textMuted, fontSize: 14, textAlign: 'center', paddingHorizontal: gap.xl },
  scroll: { paddingBottom: 60 },
  hero: {
    backgroundColor: ui.ink,
    borderBottomLeftRadius: radii.xl,
    borderBottomRightRadius: radii.xl,
    paddingHorizontal: gap.lg,
    paddingBottom: gap.xl,
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: gap.md,
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginHorizontal: gap.md },
  headerTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', marginLeft: gap.sm, flexShrink: 1 },
  ringRow: { flexDirection: 'row', alignItems: 'center', marginTop: gap.xl },
  ringCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  ringValue: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  ringLabel: { color: ui.onInkMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 },
  recPill: { alignSelf: 'flex-start', borderRadius: radii.pill, paddingHorizontal: 14, paddingVertical: 6 },
  recPillText: { fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
  priceLine: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginTop: gap.sm },
  summary: { color: ui.onInkMuted, fontSize: 13, lineHeight: 19, marginTop: gap.lg },
  actionsRow: { flexDirection: 'row', marginTop: gap.lg },
  watchBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: ui.inkRaised, borderRadius: radii.pill, paddingVertical: 12, marginRight: gap.sm,
  },
  watchBtnActive: { backgroundColor: ui.purple },
  watchBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', marginLeft: gap.sm },
  alertBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFFFFF', borderRadius: radii.pill, paddingVertical: 12, paddingHorizontal: gap.lg,
  },
  alertBtnText: { color: ui.text, fontSize: 13, fontWeight: '700', marginLeft: gap.sm },
  body: { paddingHorizontal: gap.lg, paddingTop: gap.lg },
  priceCard: {
    backgroundColor: ui.card, borderRadius: radii.lg, padding: gap.lg, marginBottom: gap.xl, ...shadow.card,
  },
  priceCardHead: { marginBottom: gap.md },
  priceCardTitle: { color: ui.text, fontSize: 15, fontWeight: '800', marginBottom: gap.md },
  groupsTitle: { color: ui.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.3, marginBottom: gap.md },
  panel: {
    backgroundColor: ui.card, borderRadius: radii.lg, padding: gap.lg, marginBottom: gap.md, ...shadow.card,
  },
  panelHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: gap.sm },
  panelTitle: { color: ui.text, fontSize: 15, fontWeight: '800' },
  scorePill: { borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 3 },
  scorePillText: { fontSize: 12, fontWeight: '800' },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  itemDot: { width: 7, height: 7, borderRadius: 3.5, marginRight: gap.sm },
  itemLabel: { flex: 1, color: ui.textMuted, fontSize: 13 },
  itemValue: { color: ui.text, fontSize: 13, fontWeight: '700', marginLeft: gap.sm },
  lockedBox: { alignItems: 'center', paddingVertical: gap.lg },
  lockedText: { color: ui.textMuted, fontSize: 13, marginTop: gap.sm, textAlign: 'center' },
  disclaimer: {
    color: ui.textFaint, fontSize: 11, lineHeight: 16, textAlign: 'center',
    marginTop: gap.sm, paddingHorizontal: gap.lg,
  },
});
