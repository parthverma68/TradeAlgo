import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView, Pressable,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { Screen, CircleButton, SectionHeading } from '@/components/ui/Layout';
import { StockCard } from '@/components/ui/StockCard';
import { BrandCluster } from '@/components/ui/BrandMark';
import { Bell, Search, ArrowUpRight, ArrowDownRight } from '@/design/icons';
import { useStocks, usePortfolio } from '@/hooks/useStocks';
import { useAppSelector } from '@/store';
import { ui, gap, radii, shadow, deltaColor, fmtMoney, fmtPct } from '@/design/tokens';
import type { TabNav } from '@/navigation/types';

export default function HomeScreen() {
  const navigation = useNavigation<TabNav<'Home'>>();
  const [query, setQuery] = useState('');
  const { data: stocks, isLoading, error, refetch, isFetching } = useStocks();
  const portfolio = usePortfolio();
  const user = useAppSelector(s => s.auth.user);

  const initials = (user?.email ?? 'trader')[0].toUpperCase();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stocks;
    return stocks.filter(
      s => s.name.toLowerCase().includes(q) || s.symbol.toLowerCase().includes(q),
    );
  }, [stocks, query]);

  const positive = portfolio.dayChangePct >= 0;
  const Arrow = positive ? ArrowUpRight : ArrowDownRight;

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={ui.purple} />
          }
        >
          {/* header */}
          <View style={s.headerRow}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{initials}</Text>
            </View>
            <CircleButton
              accessibilityLabel="Alerts"
              onPress={() => navigation.navigate('Alerts')}
            >
              <Bell size={20} color="#FFFFFF" />
            </CircleButton>
          </View>

          {/* portfolio total */}
          <View style={s.totalRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.totalLabel}>Total Invest</Text>
              <Text style={s.totalValue}>{fmtMoney(portfolio.total)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <View style={s.deltaRow}>
                <Arrow size={15} color={deltaColor(portfolio.dayChangePct)} strokeWidth={2.2} />
                <Text style={[s.delta, { color: deltaColor(portfolio.dayChangePct) }]}>
                  {fmtPct(portfolio.dayChangePct)}
                </Text>
              </View>
              <View style={{ marginTop: gap.sm }}>
                <BrandCluster
                  brands={portfolio.positions
                    .map(p => p.quote?.brand ?? 'generic')
                    .slice(0, 4)}
                />
              </View>
            </View>
          </View>

          {/* search */}
          <View style={s.search}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search here"
              placeholderTextColor={ui.textFaint}
              style={s.searchInput}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="search"
            />
            <View style={s.searchBtn}>
              <Search size={20} color="#FFFFFF" strokeWidth={2.2} />
            </View>
          </View>

          {/* list */}
          <SectionHeading
            title="Stock Activates"
            actionLabel="See all"
            onAction={() => navigation.navigate('Markets')}
          />

          {isLoading && (
            <View style={s.state}>
              <ActivityIndicator color={ui.purple} />
            </View>
          )}

          {!!error && !isLoading && (
            <Pressable style={s.state} onPress={refetch}>
              <Text style={s.errorText}>{error.message}</Text>
              <Text style={s.retry}>Tap to retry</Text>
            </Pressable>
          )}

          {!isLoading && !error && filtered.length === 0 && (
            <View style={s.state}>
              <Text style={s.errorText}>No stock matches “{query}”.</Text>
            </View>
          )}

          {filtered.map(q => (
            <StockCard
              key={q.symbol}
              quote={q}
              onPress={() => navigation.navigate('MarketDetail', { symbol: q.symbol })}
            />
          ))}
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: gap.lg, paddingBottom: 120 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: gap.md,
  },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: ui.purple, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  totalRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: gap.xl },
  totalLabel: { color: ui.textMuted, fontSize: 15, marginBottom: gap.xs },
  totalValue: { color: ui.text, fontSize: 34, fontWeight: '800', letterSpacing: -1 },
  deltaRow: { flexDirection: 'row', alignItems: 'center' },
  delta: { fontSize: 14, fontWeight: '700', marginLeft: 3 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ui.card,
    borderRadius: radii.pill,
    paddingLeft: gap.xl,
    paddingRight: 6,
    paddingVertical: 6,
    marginTop: gap.xl,
    marginBottom: gap.xl,
    ...shadow.card,
  },
  searchInput: { flex: 1, color: ui.text, fontSize: 15, paddingVertical: 10 },
  searchBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: ui.purple, alignItems: 'center', justifyContent: 'center',
  },
  state: {
    backgroundColor: ui.card,
    borderRadius: radii.lg,
    padding: gap.xl,
    alignItems: 'center',
    marginBottom: gap.md,
    ...shadow.card,
  },
  errorText: { color: ui.textMuted, fontSize: 14, textAlign: 'center' },
  retry: { color: ui.purple, fontSize: 13, fontWeight: '600', marginTop: gap.sm },
});
