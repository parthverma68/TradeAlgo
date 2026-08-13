import React from 'react';
import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { Panel, Chip } from '@/components/primitives';
import { OIChart } from '@/components/OIChart';
import { SymbolTabs } from '@/components/SymbolTabs';
import { Loading, ErrorState } from '@/components/StateViews';
import { useGetOptionChainQuery } from '@/api/marketApi';
import { useAppDispatch, useAppSelector } from '@/store';
import { symbolSelected } from '@/store/settingsSlice';
import { colors, font, radius, space } from '@/theme';
import type { ApiError } from '@/types';

export default function OptionChainScreen() {
  const dispatch = useAppDispatch();
  const { activeSymbol, symbols } = useAppSelector((s) => s.settings);
  const { data, error, isLoading, isFetching, refetch } =
    useGetOptionChainQuery({ symbol: activeSymbol });

  if (isLoading) return <Loading label="Loading option chain…" />;
  if (error && !data) return <ErrorState error={error as ApiError} onRetry={refetch} />;
  if (!data) return null;

  return (
    <ScrollView
      style={s.screen} contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.blue} />}
    >
      <SymbolTabs symbols={symbols} active={activeSymbol} onSelect={(x) => dispatch(symbolSelected(x))} />

      <Panel title="OI by Strike" right={<Chip color={colors.amber}>MP {data.maxPain.toLocaleString()}</Chip>}>
        <View style={s.legend}>
          <Text style={[s.legendItem, { color: colors.green }]}>■ Put OI</Text>
          <Text style={[s.legendItem, { color: colors.red }]}>■ Call OI</Text>
          <Text style={[s.legendItem, { color: colors.muted }]}>PCR {data.pcr.toFixed(2)}</Text>
        </View>
        <OIChart rows={data.rows} maxPain={data.maxPain} />
      </Panel>

      <Panel title="Zones">
        <ZoneRow label="Resistance" values={data.zones.resistance} color={colors.red} />
        <ZoneRow label="Support" values={data.zones.support} color={colors.green} />
        <ZoneRow label="Call writing" values={data.zones.callWriting} color={colors.amber} />
        <ZoneRow label="Put writing" values={data.zones.putWriting} color={colors.blue} />
      </Panel>

      <Panel title={`Chain · expiry ${data.expiry}`}>
        <View style={[s.row, s.headRow]}>
          <Text style={[s.cell, s.head]}>C-OI</Text>
          <Text style={[s.cell, s.head]}>C-IV</Text>
          <Text style={[s.cell, s.head, s.strikeCol]}>STRIKE</Text>
          <Text style={[s.cell, s.head]}>P-IV</Text>
          <Text style={[s.cell, s.head]}>P-OI</Text>
        </View>
        {data.rows.map((r) => {
          const atm = r.strike === data.maxPain;
          return (
            <View key={r.strike} style={[s.row, atm && s.atmRow]}>
              <Text style={[s.cell, { color: colors.red }]}>{r.callOi}</Text>
              <Text style={[s.cell, s.muted]}>{r.callIv.toFixed(1)}</Text>
              <Text style={[s.cell, s.strikeCol, s.strike]}>{r.strike.toLocaleString()}</Text>
              <Text style={[s.cell, s.muted]}>{r.putIv.toFixed(1)}</Text>
              <Text style={[s.cell, { color: colors.green }]}>{r.putOi}</Text>
            </View>
          );
        })}
      </Panel>
    </ScrollView>
  );
}

const ZoneRow: React.FC<{ label: string; values: number[]; color: string }> = ({ label, values, color }) => (
  <View style={s.zoneRow}>
    <Text style={s.zoneLabel}>{label}</Text>
    <View style={s.zoneChips}>
      {values.map((v) => (
        <View key={v} style={[s.zoneChip, { borderColor: `${color}55`, backgroundColor: `${color}15` }]}>
          <Text style={[s.zoneChipText, { color }]}>{v.toLocaleString()}</Text>
        </View>
      ))}
    </View>
  </View>
);

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, paddingBottom: space.xl * 2 },
  legend: { flexDirection: 'row', gap: space.md, marginBottom: space.sm },
  legendItem: { fontSize: 10, fontFamily: font.mono },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headRow: { borderBottomColor: colors.dim },
  atmRow: { backgroundColor: `${colors.amber}12` },
  cell: { flex: 1, textAlign: 'center', fontSize: 11, fontFamily: font.mono, color: colors.text },
  head: { color: colors.dim, fontSize: 9, letterSpacing: 0.5 },
  muted: { color: colors.muted },
  strikeCol: { flex: 1.3 },
  strike: { fontFamily: font.monoBold, color: colors.text },
  zoneRow: { flexDirection: 'row', alignItems: 'center', marginBottom: space.sm },
  zoneLabel: { color: colors.muted, fontSize: 11, fontFamily: font.sans, width: 92 },
  zoneChips: { flexDirection: 'row', gap: 6, flex: 1, flexWrap: 'wrap' },
  zoneChip: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 2 },
  zoneChipText: { fontSize: 11, fontFamily: font.monoBold },
});
