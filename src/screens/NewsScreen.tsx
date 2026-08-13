import React from 'react';
import { FlatList, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { Chip } from '@/components/primitives';
import { Loading, ErrorState, EmptyState } from '@/components/StateViews';
import { useGetNewsQuery } from '@/api/marketApi';
import { colors, font, radius, space } from '@/theme';
import type { ApiError } from '@/types';

export default function NewsScreen() {
  const { data, error, isLoading, isFetching, refetch } = useGetNewsQuery();

  if (isLoading) return <Loading label="Scoring overnight news…" />;
  if (error && !data) return <ErrorState error={error as ApiError} onRetry={refetch} />;
  if (!data?.length) return <EmptyState title="No news yet" hint="Headlines appear after the overnight batch runs." />;

  const net = data.reduce((a, n) => a + n.sentiment, 0) / data.length;

  return (
    <FlatList
      style={s.screen}
      contentContainerStyle={s.content}
      data={data}
      keyExtractor={(n) => n.id}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.blue} />}
      ListHeaderComponent={
        <View style={s.header}>
          <Text style={s.headerLabel}>NET SENTIMENT</Text>
          <Chip color={net > 0.2 ? colors.green : net < -0.2 ? colors.red : colors.amber}>
            {net >= 0 ? '+' : ''}{net.toFixed(2)}
          </Chip>
        </View>
      }
      renderItem={({ item }) => {
        const c = item.sentiment > 0.2 ? colors.green : item.sentiment < -0.2 ? colors.red : colors.amber;
        return (
          <View style={[s.card, { borderLeftColor: c }]}>
            <Text style={s.headline}>{item.headline}</Text>
            <View style={s.meta}>
              <Text style={s.source}>{item.source}</Text>
              <Chip color={colors.blue}>{item.tag}</Chip>
              <Text style={[s.score, { color: c }]}>
                {item.sentiment >= 0 ? '+' : ''}{item.sentiment.toFixed(2)}
              </Text>
            </View>
          </View>
        );
      }}
    />
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, paddingBottom: space.xl * 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.md },
  headerLabel: { color: colors.muted, fontSize: 11, letterSpacing: 1, fontFamily: font.sansBold },
  card: {
    backgroundColor: colors.panel, borderRadius: radius.md, borderLeftWidth: 3,
    padding: space.md, marginBottom: space.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  headline: { color: colors.text, fontSize: 13, lineHeight: 19, fontFamily: font.sans },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm },
  source: { color: colors.dim, fontSize: 10, fontFamily: font.mono, flex: 1 },
  score: { fontSize: 12, fontFamily: font.monoBold },
});
