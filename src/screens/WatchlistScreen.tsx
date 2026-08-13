import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, FlatList, Pressable,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { Screen, SectionHeading } from '@/components/ui/Layout';
import { StockCard } from '@/components/ui/StockCard';
import { CloseIcon, Search } from '@/design/icons';
import { useStocks } from '@/hooks/useStocks';
import {
  useGetWatchlistQuery, useAddToWatchlistMutation, useRemoveFromWatchlistMutation,
} from '@/api/marketApi';
import { isKnownSymbol, mockConfidence } from '@/api/mockStocks';
import { ui, gap, radii, shadow } from '@/design/tokens';
import type { TabNav } from '@/navigation/types';
import type { StockQuote } from '@/types';

export default function WatchlistScreen() {
  const navigation = useNavigation<TabNav<'Watchlist'>>();
  const { data: symbols, isLoading, isFetching, refetch } = useGetWatchlistQuery();
  const [add, addState] = useAddToWatchlistMutation();
  const [remove] = useRemoveFromWatchlistMutation();
  const { data: quotes } = useStocks();
  const [input, setInput] = useState('');

  const bySymbol = useMemo(() => new Map(quotes.map(q => [q.symbol, q])), [quotes]);
  const rows = symbols ?? [];

  const onAdd = async () => {
    const sym = input.trim().toUpperCase();
    if (!sym) return;
    if (!isKnownSymbol(sym)) {
      Alert.alert('Not found', `No share matches “${sym}”. Try a ticker, e.g. TCS or NVDA.`);
      return;
    }
    await add(sym);
    setInput('');
  };

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <FlatList<string>
          data={rows}
          keyExtractor={sym => sym}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={ui.purple} />
          }
          ListHeaderComponent={
            <View>
              <Text style={s.title}>Watchlist</Text>
              <Text style={s.hint}>
                Shares you're tracking — check back to see how their confidence score has moved.
              </Text>

              <View style={s.addRow}>
                <View style={s.search}>
                  <Search size={17} color={ui.textFaint} />
                  <TextInput
                    value={input}
                    onChangeText={setInput}
                    placeholder="Add a ticker, e.g. TCS"
                    placeholderTextColor={ui.textFaint}
                    style={s.input}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={onAdd}
                  />
                </View>
                <Pressable onPress={onAdd} disabled={addState.isLoading} style={s.addBtn} accessibilityRole="button">
                  {addState.isLoading
                    ? <ActivityIndicator color="#FFFFFF" size="small" />
                    : <Text style={s.addBtnText}>Add</Text>}
                </Pressable>
              </View>

              <SectionHeading title={`Tracking (${rows.length})`} />

              {rows.length === 0 && !isLoading && (
                <View style={s.empty}>
                  <Text style={s.emptyText}>
                    Nothing tracked yet. Add a ticker above, or star a share from its confidence screen.
                  </Text>
                </View>
              )}
            </View>
          }
          renderItem={({ item: symbol }) => {
            const quote: StockQuote | undefined = bySymbol.get(symbol);
            if (!quote) return null;
            const confidence = mockConfidence(symbol);
            return (
              <View style={s.row}>
                <View style={{ flex: 1 }}>
                  <StockCard
                    quote={quote}
                    subtitle={symbol}
                    confidence={confidence?.overall}
                    recommendation={confidence?.recommendation}
                    onPress={() => navigation.navigate('MarketDetail', { symbol })}
                  />
                </View>
                <Pressable
                  onPress={() => remove(symbol)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${symbol} from watchlist`}
                  style={s.removeBtn}
                >
                  <CloseIcon size={16} color={ui.textFaint} />
                </Pressable>
              </View>
            );
          }}
        />
      </SafeAreaView>
    </Screen>
  );
}

const s = StyleSheet.create({
  list: { paddingHorizontal: gap.lg, paddingBottom: 120 },
  title: {
    color: ui.text, fontSize: 30, fontWeight: '800',
    letterSpacing: -0.8, marginTop: gap.lg, marginBottom: gap.xs,
  },
  hint: { color: ui.textMuted, fontSize: 13, lineHeight: 18, marginBottom: gap.lg },
  addRow: { flexDirection: 'row', alignItems: 'center', marginBottom: gap.xl },
  search: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: ui.card, borderRadius: radii.pill,
    paddingHorizontal: gap.lg, marginRight: gap.sm, ...shadow.card,
  },
  input: { flex: 1, color: ui.text, fontSize: 14, paddingVertical: 12, marginLeft: gap.sm },
  addBtn: {
    backgroundColor: ui.purple, borderRadius: radii.pill,
    paddingHorizontal: gap.xl, paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
  },
  addBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  empty: {
    backgroundColor: ui.card, borderRadius: radii.lg, padding: gap.xl,
    alignItems: 'center', marginBottom: gap.md, ...shadow.card,
  },
  emptyText: { color: ui.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center' },
  removeBtn: {
    marginLeft: -gap.sm, marginBottom: gap.md, padding: gap.sm,
  },
});
