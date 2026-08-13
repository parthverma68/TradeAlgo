/**
 * Every share in one market + industry category — the screen the Markets
 * tab's category tiles lead to. Confidence badges use the same lightweight
 * local heuristic as every other list ( see `mockConfidence` ); the full
 * indicator breakdown only loads once a share is opened.
 */
import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, FlatList, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

import { Screen, CircleButton } from '@/components/ui/Layout';
import { StockCard } from '@/components/ui/StockCard';
import { ChevronLeft, Search } from '@/design/icons';
import { useStocks } from '@/hooks/useStocks';
import { mockConfidence } from '@/api/mockStocks';
import { ui, gap, radii, shadow } from '@/design/tokens';
import { MARKETS, SECTORS } from '@/types';
import type { RootStackParamList, RootScreenProps } from '@/navigation/types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export default function IndustryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<RootScreenProps<'Industry'>['route']>();
  const { market, sector } = params;
  const [query, setQuery] = useState('');

  const { data: stocks, isLoading } = useStocks();
  const marketLabel = MARKETS.find(m => m.key === market)?.label ?? market;
  const sectorLabel = SECTORS.find(s => s.key === sector)?.label ?? sector;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stocks
      .filter(s => s.market === market && s.sector === sector)
      .filter(s => !q || s.name.toLowerCase().includes(q) || s.symbol.toLowerCase().includes(q))
      .map(quote => ({ quote, confidence: mockConfidence(quote.symbol) }))
      .sort((a, b) => (b.confidence?.overall ?? 0) - (a.confidence?.overall ?? 0));
  }, [stocks, market, sector, query]);

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <FlatList
          data={rows}
          keyExtractor={r => r.quote.symbol}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View>
              <View style={s.headerRow}>
                <CircleButton accessibilityLabel="Go back" onPress={() => navigation.goBack()}>
                  <ChevronLeft size={20} color={ui.text} />
                </CircleButton>
              </View>
              <Text style={s.eyebrow}>{marketLabel}</Text>
              <Text style={s.title}>{sectorLabel}</Text>

              <View style={s.search}>
                <Search size={19} color={ui.textFaint} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder={`Search ${sectorLabel.toLowerCase()} shares`}
                  placeholderTextColor={ui.textFaint}
                  style={s.input}
                  autoCorrect={false}
                />
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <StockCard
              quote={item.quote}
              subtitle={item.quote.symbol}
              confidence={item.confidence?.overall}
              recommendation={item.confidence?.recommendation}
              onPress={() => navigation.navigate('MarketDetail', { symbol: item.quote.symbol })}
            />
          )}
          ListEmptyComponent={
            isLoading ? (
              <View style={s.state}><ActivityIndicator color={ui.purple} /></View>
            ) : (
              <View style={s.state}>
                <Text style={s.stateText}>No shares match that filter yet.</Text>
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
  headerRow: { flexDirection: 'row', marginTop: gap.md, marginBottom: gap.lg },
  eyebrow: { color: ui.textMuted, fontSize: 13, fontWeight: '600', marginBottom: 2 },
  title: {
    color: ui.text, fontSize: 28, fontWeight: '800',
    letterSpacing: -0.6, marginBottom: gap.lg,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ui.card,
    borderRadius: radii.pill,
    paddingHorizontal: gap.lg,
    marginBottom: gap.lg,
    ...shadow.card,
  },
  input: { flex: 1, color: ui.text, fontSize: 15, paddingVertical: 14, marginLeft: gap.sm },
  state: {
    backgroundColor: ui.card, borderRadius: radii.lg, padding: gap.xl,
    alignItems: 'center', ...shadow.card,
  },
  stateText: { color: ui.textMuted, fontSize: 14, textAlign: 'center' },
});
