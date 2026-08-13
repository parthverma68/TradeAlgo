/**
 * Discovery flow: pick a market, then an industry category — or skip both and
 * search a share directly. This is the app's primary "where do I look" screen.
 */
import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, FlatList, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { Screen, SegmentedPills } from '@/components/ui/Layout';
import { StockCard } from '@/components/ui/StockCard';
import { ChevronRight, Search } from '@/design/icons';
import { useStocks } from '@/hooks/useStocks';
import { mockConfidence } from '@/api/mockStocks';
import { ui, gap, radii, shadow, recommendationColor } from '@/design/tokens';
import { MARKETS, SECTORS } from '@/types';
import type { MarketKey, SectorInfo, StockConfidence, StockQuote } from '@/types';
import type { TabNav } from '@/navigation/types';

interface SearchRow { quote: StockQuote; confidence: StockConfidence | null; }
interface SectorRow { sector: SectorInfo; count: number; avg: number; }

export default function MarketsScreen() {
  const navigation = useNavigation<TabNav<'Markets'>>();
  const [market, setMarket] = useState<MarketKey>('IN');
  const [query, setQuery] = useState('');
  const { data: stocks, isLoading } = useStocks();

  const searching = query.trim().length > 0;

  const searchResults = useMemo<SearchRow[]>(() => {
    if (!searching) return [];
    const q = query.trim().toLowerCase();
    return stocks
      .filter(s => s.name.toLowerCase().includes(q) || s.symbol.toLowerCase().includes(q))
      .map(quote => ({ quote, confidence: mockConfidence(quote.symbol) }));
  }, [stocks, query, searching]);

  const sectorTiles = useMemo<SectorRow[]>(() => {
    const inMarket = stocks.filter(s => s.market === market);
    return SECTORS.map(sec => {
      const list = inMarket.filter(s => s.sector === sec.key);
      const scores = list.map(s => mockConfidence(s.symbol)?.overall ?? 0);
      const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      return { sector: sec, count: list.length, avg };
    }).filter(row => row.count > 0);
  }, [stocks, market]);

  const header = (
    <View>
      <Text style={s.title}>Markets</Text>
      <View style={s.search}>
        <Search size={19} color={ui.textFaint} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search any company or ticker"
          placeholderTextColor={ui.textFaint}
          style={s.input}
          autoCorrect={false}
        />
      </View>

      {!searching && (
        <>
          <View style={s.marketRow}>
            <SegmentedPills
              options={MARKETS.map(m => ({ value: m.key, label: m.label }))}
              value={market}
              onChange={setMarket}
              dark={false}
            />
          </View>
          <Text style={s.sectionLabel}>Browse by industry</Text>
        </>
      )}
    </View>
  );

  if (searching) {
    return (
      <Screen>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <FlatList
            data={searchResults}
            keyExtractor={row => row.quote.symbol}
            contentContainerStyle={s.list}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={header}
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
              <View style={s.state}>
                <Text style={s.stateText}>Nothing matches “{query}”.</Text>
              </View>
            }
          />
        </SafeAreaView>
      </Screen>
    );
  }

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <FlatList
          data={sectorTiles}
          keyExtractor={row => row.sector.key}
          numColumns={2}
          columnWrapperStyle={s.tileRow}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={header}
          renderItem={({ item }) => (
            <SectorTile
              label={item.sector.label}
              count={item.count}
              avg={item.avg}
              onPress={() => navigation.navigate('Industry', { market, sector: item.sector.key })}
            />
          )}
          ListEmptyComponent={
            <View style={s.state}>
              <Text style={s.stateText}>
                {isLoading ? 'Loading markets…' : 'No shares mapped to this market yet.'}
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </Screen>
  );
}

const SectorTile: React.FC<{
  label: string; count: number; avg: number; onPress: () => void;
}> = ({ label, count, avg, onPress }) => {
  const recommendation = avg >= 68 ? 'BUY' : avg >= 45 ? 'WATCH' : 'AVOID';
  const tint = recommendationColor(recommendation);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [t.tile, { backgroundColor: `${tint}14` }, pressed && { opacity: 0.85 }]}
    >
      <Text style={t.label}>{label}</Text>
      <Text style={t.count}>{count} share{count === 1 ? '' : 's'}</Text>
      <View style={t.footer}>
        <Text style={[t.avg, { color: tint }]}>{avg}% avg confidence</Text>
        <ChevronRight size={16} color={ui.textFaint} />
      </View>
    </Pressable>
  );
};

const t = StyleSheet.create({
  tile: {
    flex: 1, borderRadius: radii.lg, padding: gap.lg, minHeight: 118,
    justifyContent: 'space-between',
  },
  label: { color: ui.text, fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  count: { color: ui.textMuted, fontSize: 12, marginTop: 2 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: gap.md },
  avg: { fontSize: 12, fontWeight: '800' },
});

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
  marketRow: { marginTop: gap.lg, marginBottom: gap.lg },
  sectionLabel: { color: ui.text, fontSize: 16, fontWeight: '800', marginBottom: gap.md },
  tileRow: { gap: gap.md, marginBottom: gap.md },
  state: {
    backgroundColor: ui.card, borderRadius: radii.lg, padding: gap.xl,
    alignItems: 'center', ...shadow.card,
  },
  stateText: { color: ui.textMuted, fontSize: 14, textAlign: 'center' },
});
