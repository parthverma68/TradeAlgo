import React, { useCallback } from 'react';
import { ScrollView, View, Text, RefreshControl, StyleSheet } from 'react-native';
import { Panel, Chip, Stat } from '@/components/primitives';
import { SignalCard } from '@/components/SignalCard';
import { Gauge } from '@/components/Gauge';
import { Sparkline } from '@/components/Sparkline';
import { SymbolTabs } from '@/components/SymbolTabs';
import { Loading, ErrorState, ConnectionBanner, Skeleton } from '@/components/StateViews';
import { useLiveVerdict } from '@/hooks/useLiveVerdict';
import { useGetGlobalMarketsQuery, useGetSectorStrengthQuery } from '@/api/marketApi';
import { useAppDispatch, useAppSelector } from '@/store';
import { symbolSelected } from '@/store/settingsSlice';
import { colors, font, radius, space, deltaColor, signalColor } from '@/theme';
import { DISCLAIMER } from '@/config';

export default function DashboardScreen() {
  const dispatch = useAppDispatch();
  const { activeSymbol, symbols } = useAppSelector((s) => s.settings);
  const { data, error, isLoading, isFetching, refetch, connection } = useLiveVerdict(activeSymbol);
  const globals = useGetGlobalMarketsQuery();
  const sectors = useGetSectorStrengthQuery();

  const onRefresh = useCallback(() => {
    refetch(); globals.refetch(); sectors.refetch();
  }, [refetch, globals, sectors]);

  if (isLoading) return <Loading label="Fetching pre-market analysis…" />;
  if (error && !data) return <ErrorState error={error} onRetry={refetch} />;
  if (!data) return null;

  const m = data.metrics;
  const sc = signalColor(data.verdict.signal);
  const rangePos =
    ((data.spot - m.range[0]) / Math.max(1, m.range[1] - m.range[0])) * 100;

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.content}
      refreshControl={
        <RefreshControl refreshing={isFetching} onRefresh={onRefresh} tintColor={colors.blue} />
      }
    >
      <ConnectionBanner state={connection} />

      <SymbolTabs
        symbols={symbols}
        active={activeSymbol}
        onSelect={(sym) => dispatch(symbolSelected(sym))}
      />

      <View style={s.priceRow}>
        <View>
          <Text style={s.spot}>{data.spot.toLocaleString()}</Text>
          <Text style={[s.change, { color: deltaColor(data.dayChangePct) }]}>
            {data.dayChangePct >= 0 ? '▲' : '▼'} {Math.abs(data.dayChangePct).toFixed(2)}%
            {'   '}FUT {data.futures.toLocaleString()}
          </Text>
        </View>
        <Chip color={m.basis >= 0 ? colors.green : colors.red}>
          BASIS {m.basis >= 0 ? '+' : ''}{m.basis.toFixed(1)}
        </Chip>
      </View>

      <SignalCard data={data} />

      <Panel title="AI Market Explanation" right={<Chip color={colors.purple}>SYNTHESIS</Chip>}>
        <Text style={s.ai}>{data.aiExplanation}</Text>
      </Panel>

      <Panel title="Key Metrics">
        <View style={s.gaugeGrid}>
          <Gauge value={+m.pcr.toFixed(2)} max={2} label={m.pcr > 1 ? 'bullish bias' : 'bearish bias'}
            color={m.pcr > 1 ? colors.green : colors.red} />
          <Gauge value={+m.ivScore.toFixed(2)} max={2} label="iv score"
            color={m.ivScore > 1 ? colors.amber : colors.green} />
          <Gauge value={m.volScore} max={100} label="volatility"
            color={m.volScore > 60 ? colors.red : m.volScore > 40 ? colors.amber : colors.green} />
          <Gauge value={m.gapUpProb} max={100} suffix="%" label="gap up"
            color={m.gapUpProb > 55 ? colors.green : m.gapUpProb > 40 ? colors.amber : colors.red} />
        </View>
      </Panel>

      <Panel title="Expected Range">
        <View style={s.levelRow}>
          <Text style={[s.level, { color: colors.green }]}>S {m.range[0].toLocaleString()}</Text>
          <Text style={[s.level, { color: colors.amber }]}>MP {m.maxPain.toLocaleString()}</Text>
          <Text style={[s.level, { color: colors.red }]}>R {m.range[1].toLocaleString()}</Text>
        </View>
        <View style={s.rangeTrack}>
          <View style={[s.rangeMarker, { left: `${Math.max(0, Math.min(100, rangePos))}%` }]} />
        </View>
        <View style={{ marginTop: space.lg }}>
          <Sparkline data={data.spark} color={deltaColor(data.dayChangePct)} />
        </View>
      </Panel>

      <Panel title="Global Overnight">
        {globals.isLoading ? <Skeleton height={120} /> : (
          <View style={s.globalGrid}>
            {(globals.data ?? []).map((g) => (
              <View key={g.key} style={s.globalCell}>
                <Text style={s.globalKey}>{g.key}</Text>
                <Text style={s.globalVal}>{g.value.toLocaleString()}</Text>
                <Text style={[s.globalChg, { color: deltaColor(g.changePct) }]}>
                  {g.changePct >= 0 ? '▲' : '▼'} {Math.abs(g.changePct).toFixed(2)}%
                </Text>
              </View>
            ))}
          </View>
        )}
      </Panel>

      <Panel title="Sector Heatmap">
        {sectors.isLoading ? <Skeleton height={140} /> : (
          <View style={s.heatGrid}>
            {(sectors.data ?? []).map((x) => {
              const a = Math.min(1, Math.abs(x.changePct) / 2.2);
              const bg = x.changePct >= 0
                ? `rgba(34,211,154,${0.12 + a * 0.45})`
                : `rgba(255,81,104,${0.12 + a * 0.45})`;
              return (
                <View key={x.sector} style={[s.heatCell, { backgroundColor: bg }]}>
                  <Text style={s.heatName}>{x.sector}</Text>
                  <Text style={[s.heatVal, { color: deltaColor(x.changePct) }]}>
                    {x.changePct >= 0 ? '+' : ''}{x.changePct.toFixed(1)}%
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </Panel>

      <Text style={s.disclaimer}>{data.disclaimer ?? DISCLAIMER}</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, paddingBottom: space.xl * 2 },
  priceRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: space.md,
  },
  spot: { color: colors.text, fontSize: 30, fontFamily: font.monoBold },
  change: { fontSize: 12, fontFamily: font.mono, marginTop: 2 },
  ai: { color: colors.muted, fontSize: 13, lineHeight: 20, fontFamily: font.sans },
  gaugeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', gap: space.md },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: space.sm },
  level: { fontSize: 12, fontFamily: font.mono },
  rangeTrack: { height: 7, borderRadius: 4, backgroundColor: colors.border, overflow: 'visible' },
  rangeMarker: {
    position: 'absolute', top: -4, width: 3, height: 15,
    backgroundColor: colors.text, borderRadius: 2,
  },
  globalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  globalCell: {
    backgroundColor: colors.panel2, borderRadius: radius.sm, padding: space.sm,
    borderWidth: 1, borderColor: colors.border, minWidth: '31%', flexGrow: 1,
  },
  globalKey: { color: colors.muted, fontSize: 9, textTransform: 'uppercase', fontFamily: font.sans },
  globalVal: { color: colors.text, fontSize: 13, fontFamily: font.monoBold, marginTop: 1 },
  globalChg: { fontSize: 10, fontFamily: font.mono },
  heatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  heatCell: {
    borderRadius: radius.sm, paddingVertical: space.sm,
    alignItems: 'center', minWidth: '31%', flexGrow: 1,
  },
  heatName: { color: colors.text, fontSize: 11, fontFamily: font.sansBold },
  heatVal: { fontSize: 11, fontFamily: font.mono, marginTop: 1 },
  disclaimer: {
    color: colors.dim, fontSize: 10, lineHeight: 15, textAlign: 'center',
    fontFamily: font.sans, marginTop: space.sm, paddingHorizontal: space.lg,
  },
});
