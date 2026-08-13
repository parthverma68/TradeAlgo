import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, FlatList, ActivityIndicator, Pressable, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { Screen, SegmentedPills } from '@/components/ui/Layout';
import { StockCard } from '@/components/ui/StockCard';
import { Search } from '@/design/icons';
import { useStocks } from '@/hooks/useStocks';
import { ui, gap, radii, shadow } from '@/design/tokens';
import type { TabNav } from '@/navigation/types';
import type { StockQuote } from '@/types';

type Sort = 'name' | 'gainers' | 'losers';

const SORTS: { value: Sort; label: string }[] = [
  { value: 'name', label: 'All' },
  { value: 'gainers', label: 'Gainers' },
  { value: 'losers', label: 'Losers' },
];

export default function MarketsScreen() {
  const navigation = useNavigation<TabNav<'Markets'>>();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('name');
  const { data, isLoading, isFetching, error, refetch } = useStocks();

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list: StockQuote[] = q
      ? data.filter(s => s.name.toLowerCase().includes(q) || s.symbol.toLowerCase().includes(q))
      : [...data];

    if (sort === 'gainers') list = list.filter(s => s.changePct >= 0).sort((a, b) => b.changePct - a.changePct);
    if (sort === 'losers') list = list.filter(s => s.changePct < 0).sort((a, b) => a.changePct - b.changePct);
    return list;
  }, [data, query, sort]);

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <FlatList
          data={rows}
          keyExtractor={item => item.symbol}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={ui.purple} />
          }
          ListHeaderComponent={
            <View>
              <Text style={s.title}>Markets</Text>
              <View style={s.search}>
                <Search size={19} color={ui.textFaint} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search a company or ticker"
                  placeholderTextColor={ui.textFaint}
                  style={s.input}
                  autoCorrect={false}
                />
              </View>
              <View style={s.sorts}>
                <SegmentedPills options={SORTS} value={sort} onChange={setSort} dark={false} />
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <StockCard
              quote={item}
              subtitle={item.symbol}
              onPress={() => navigation.navigate('MarketDetail', { symbol: item.symbol })}
            />
          )}
          ListEmptyComponent={
            isLoading ? (
              <View style={s.state}><ActivityIndicator color={ui.purple} /></View>
            ) : error ? (
              <Pressable style={s.state} onPress={refetch}>
                <Text style={s.stateText}>{error.message}</Text>
                <Text style={s.retry}>Tap to retry</Text>
              </Pressable>
            ) : (
              <View style={s.state}>
                <Text style={s.stateText}>Nothing matches that filter.</Text>
              </View>
            )
          }
        />
      </SafeAreaView>
    </Screen>
  );
}

const s = StyleSheet.create({
  list: { paddingHorizontal: gap.lg, paddingBottom: 120 },
  title: {
    color: ui.text, fontSize: 30, fontWeight: '800',
    letterSpacing: -0.8, marginTop: gap.lg, marginBottom: gap.lg,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ui.card,
    borderRadius: radii.pill,
    paddingHorizontal: gap.lg,
    ...shadow.card,
  },
  input: { flex: 1, color: ui.text, fontSize: 15, paddingVertical: 14, marginLeft: gap.sm },
  sorts: { marginTop: gap.lg, marginBottom: gap.lg },
  state: {
    backgroundColor: ui.card, borderRadius: radii.lg, padding: gap.xl,
    alignItems: 'center', ...shadow.card,
  },
  stateText: { color: ui.textMuted, fontSize: 14, textAlign: 'center' },
  retry: { color: ui.purple, fontSize: 13, fontWeight: '600', marginTop: gap.sm },
});
