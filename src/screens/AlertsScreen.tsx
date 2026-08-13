import React, { useMemo } from 'react';
import { FlatList, View, Text, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { Chip } from '@/components/primitives';
import { Loading, ErrorState, EmptyState } from '@/components/StateViews';
import { useGetAlertsQuery, useAckAlertMutation } from '@/api/marketApi';
import { useAppSelector } from '@/store';
import { colors, font, radius, space } from '@/theme';
import type { AlertItem, ApiError } from '@/types';

const TYPE_COLOR: Record<string, string> = {
  iv_spike: colors.amber, unusual_oi: colors.blue,
  gap_up: colors.green, reversal: colors.red,
};

export default function AlertsScreen() {
  const { data, error, isLoading, isFetching, refetch } = useGetAlertsQuery();
  const pushed = useAppSelector((s) => s.live.liveAlerts);
  const [ack] = useAckAlertMutation();

  // Socket-pushed alerts merge ahead of the fetched list, deduped by id.
  const merged: AlertItem[] = useMemo(() => {
    const seen = new Set<string>();
    return [...pushed, ...(data ?? [])].filter((a) =>
      seen.has(a.id) ? false : (seen.add(a.id), true),
    );
  }, [pushed, data]);

  if (isLoading) return <Loading label="Loading alerts…" />;
  if (error && !merged.length) return <ErrorState error={error as ApiError} onRetry={refetch} />;
  if (!merged.length) return <EmptyState title="No alerts" hint="You'll be notified when thresholds trigger." />;

  return (
    <FlatList
      style={s.screen}
      contentContainerStyle={s.content}
      data={merged}
      keyExtractor={(a) => a.id}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.blue} />}
      renderItem={({ item }) => {
        const c = TYPE_COLOR[item.type] ?? colors.muted;
        return (
          <Pressable
            onPress={() => !item.read && ack(item.id)}
            style={[s.card, !item.read && { borderColor: `${c}55` }]}
          >
            <View style={s.top}>
              <Chip color={c}>{item.type.replace('_', ' ').toUpperCase()}</Chip>
              <Text style={s.symbol}>{item.symbol}</Text>
              {!item.read && <View style={[s.dot, { backgroundColor: c }]} />}
            </View>
            <Text style={s.msg}>{item.message}</Text>
            <Text style={s.time}>{new Date(item.createdAt).toLocaleTimeString()}</Text>
          </Pressable>
        );
      }}
    />
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, paddingBottom: space.xl * 2 },
  card: {
    backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: space.md, marginBottom: space.sm,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  symbol: { color: colors.muted, fontSize: 11, fontFamily: font.monoBold, flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  msg: { color: colors.text, fontSize: 13, fontFamily: font.sans, marginTop: space.sm, lineHeight: 18 },
  time: { color: colors.dim, fontSize: 10, fontFamily: font.mono, marginTop: 4 },
});
