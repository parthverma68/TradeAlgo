import React from 'react';
import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { Panel, Stat, Chip, Divider } from '@/components/primitives';
import { SymbolTabs } from '@/components/SymbolTabs';
import { Loading, ErrorState } from '@/components/StateViews';
import { useGetFuturesQuery } from '@/api/marketApi';
import { useAppDispatch, useAppSelector } from '@/store';
import { symbolSelected } from '@/store/settingsSlice';
import { colors, font, space, deltaColor } from '@/theme';
import type { ApiError } from '@/types';

const MATRIX = [
  { price: 'Price ↑', oi: 'OI ↑', label: 'Long buildup', key: 'long_buildup', read: 'Bullish' },
  { price: 'Price ↓', oi: 'OI ↑', label: 'Short buildup', key: 'short_buildup', read: 'Bearish' },
  { price: 'Price ↑', oi: 'OI ↓', label: 'Short covering', key: 'short_covering', read: 'Temporary bullish' },
  { price: 'Price ↓', oi: 'OI ↓', label: 'Long unwinding', key: 'long_unwinding', read: 'Bearish exit' },
];

export default function FuturesScreen() {
  const dispatch = useAppDispatch();
  const { activeSymbol, symbols } = useAppSelector((s) => s.settings);
  const { data, error, isLoading, isFetching, refetch } = useGetFuturesQuery(activeSymbol);

  if (isLoading) return <Loading label="Loading futures…" />;
  if (error && !data) return <ErrorState error={error as ApiError} onRetry={refetch} />;
  if (!data) return null;

  return (
    <ScrollView
      style={s.screen} contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.blue} />}
    >
      <SymbolTabs symbols={symbols} active={activeSymbol} onSelect={(x) => dispatch(symbolSelected(x))} />

      <Panel title="Snapshot">
        <View style={s.row}>
          <Stat label="Futures" value={data.futPrice.toLocaleString()} />
          <Stat label="Spot" value={data.spotPrice.toLocaleString()} />
        </View>
        <Divider />
        <View style={s.row}>
          <Stat label="Basis" value={`${data.basis >= 0 ? '+' : ''}${data.basis.toFixed(1)}`}
            sub={data.basis >= 0 ? 'premium' : 'discount'} color={deltaColor(data.basis)} />
          <Stat label="Open Interest" value={(data.oi / 1e6).toFixed(2) + 'M'} />
          <Stat label="Change in OI" value={`${data.chgOi >= 0 ? '+' : ''}${(data.chgOi / 1e3).toFixed(0)}K`}
            color={deltaColor(data.chgOi)} />
        </View>
      </Panel>

      <Panel title="Buildup Detection">
        {MATRIX.map((m) => {
          const on = m.key === data.buildup;
          return (
            <View key={m.key} style={[s.matrixRow, on && s.matrixOn]}>
              <Text style={[s.matrixCond, on && { color: colors.text }]}>{m.price}  {m.oi}</Text>
              <Text style={[s.matrixLabel, on && { color: colors.text }]}>{m.label}</Text>
              {on ? <Chip color={colors.blue}>CURRENT</Chip> : <Text style={s.matrixRead}>{m.read}</Text>}
            </View>
          );
        })}
      </Panel>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, paddingBottom: space.xl * 2 },
  row: { flexDirection: 'row', gap: space.md },
  matrixRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  matrixOn: { backgroundColor: `${colors.blue}12`, borderRadius: 6, paddingHorizontal: 6 },
  matrixCond: { color: colors.dim, fontSize: 11, fontFamily: font.mono, width: 100 },
  matrixLabel: { color: colors.muted, fontSize: 12, fontFamily: font.sansBold, flex: 1 },
  matrixRead: { color: colors.dim, fontSize: 10, fontFamily: font.sans },
});
