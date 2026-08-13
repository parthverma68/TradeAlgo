import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView, Pressable,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { Screen, CircleButton, SectionHeading } from '@/components/ui/Layout';
import { StockCard } from '@/components/ui/StockCard';
import { Bell, Search } from '@/design/icons';
import { useStocks } from '@/hooks/useStocks';
import { mockConfidence } from '@/api/mockStocks';
import { useAppSelector } from '@/store';
import { ui, gap, radii, shadow } from '@/design/tokens';
import { SECTORS } from '@/types';
import type { TabNav } from '@/navigation/types';

/** A handful of categories to surface as one-tap shortcuts. */
const QUICK_SECTORS = SECTORS.slice(0, 6);

export default function HomeScreen() {
  const navigation = useNavigation<TabNav<'Home'>>();
  const [query, setQuery] = useState('');
  const { data: stocks, isLoading, error, refetch, isFetching } = useStocks();
  const user = useAppSelector(s => s.auth.user);
  const plan = useAppSelector(s => s.settings.plan);

  const initials = (user?.email ?? 'trader')[0].toUpperCase();

  const ranked = useMemo(
    () => stocks
      .map(quote => ({ quote, confidence: mockConfidence(quote.symbol) }))
      .sort((a, b) => (b.confidence?.overall ?? 0) - (a.confidence?.overall ?? 0)),
    [stocks],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return ranked.filter(
      r => r.quote.name.toLowerCase().includes(q) || r.quote.symbol.toLowerCase().includes(q),
    );
  }, [ranked, query]);

  const searching = query.trim().length > 0;
  const topPicks = ranked.slice(0, 5);

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
            <View style={s.identity}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{initials}</Text>
              </View>
              <View style={{ marginLeft: gap.md }}>
                <Text style={s.greeting}>Welcome back</Text>
                <View style={[s.planPill, plan === 'pro' && s.planPillPro]}>
                  <Text style={[s.planPillText, plan === 'pro' && s.planPillTextPro]}>
                    {plan === 'pro' ? 'Pro plan' : 'Free plan'}
                  </Text>
                </View>
              </View>
            </View>
            <CircleButton
              accessibilityLabel="Alerts"
              onPress={() => navigation.navigate('Alerts')}
            >
              <Bell size={20} color="#FFFFFF" />
            </CircleButton>
          </View>

          <Text style={s.headline}>Should you buy today?</Text>
          <Text style={s.subhead}>Search a share to see its confidence score across every indicator.</Text>

          {/* search */}
          <View style={s.search}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search a company or ticker"
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

          {searching ? (
            <>
              <SectionHeading title={`Results for “${query}”`} />
              {!isLoading && !error && filtered.length === 0 && (
                <View style={s.state}>
                  <Text style={s.errorText}>No share matches “{query}”.</Text>
                </View>
              )}
              {filtered.map(r => (
                <StockCard
                  key={r.quote.symbol}
                  quote={r.quote}
                  subtitle={r.quote.symbol}
                  confidence={r.confidence?.overall}
                  recommendation={r.confidence?.recommendation}
                  onPress={() => navigation.navigate('MarketDetail', { symbol: r.quote.symbol })}
                />
              ))}
            </>
          ) : (
            <>
              <SectionHeading title="Browse by industry" />
              <View style={s.chipRow}>
                {QUICK_SECTORS.map(sec => (
                  <Pressable
                    key={sec.key}
                    onPress={() => navigation.navigate('Industry', { market: 'IN', sector: sec.key })}
                    style={s.chip}
                    accessibilityRole="button"
                  >
                    <Text style={s.chipText}>{sec.label}</Text>
                  </Pressable>
                ))}
              </View>

              <SectionHeading
                title="Today's top confidence picks"
                actionLabel="See all"
                onAction={() => navigation.navigate('Markets')}
              />
              {!isLoading && topPicks.map(r => (
                <StockCard
                  key={r.quote.symbol}
                  quote={r.quote}
                  subtitle={r.quote.symbol}
                  confidence={r.confidence?.overall}
                  recommendation={r.confidence?.recommendation}
                  onPress={() => navigation.navigate('MarketDetail', { symbol: r.quote.symbol })}
                />
              ))}
            </>
          )}
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
  identity: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: ui.purple, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  greeting: { color: ui.textMuted, fontSize: 13, fontWeight: '600' },
  planPill: {
    alignSelf: 'flex-start', backgroundColor: ui.tile, borderRadius: radii.pill,
    paddingHorizontal: 9, paddingVertical: 2, marginTop: 3,
  },
  planPillPro: { backgroundColor: ui.purpleTint },
  planPillText: { color: ui.textMuted, fontSize: 10, fontWeight: '800' },
  planPillTextPro: { color: ui.purple },
  headline: {
    color: ui.text, fontSize: 26, fontWeight: '800',
    letterSpacing: -0.6, marginTop: gap.xl,
  },
  subhead: { color: ui.textMuted, fontSize: 13, marginTop: gap.xs, lineHeight: 18 },
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: gap.sm, marginBottom: gap.xl },
  chip: {
    backgroundColor: ui.card, borderRadius: radii.pill,
    paddingHorizontal: gap.lg, paddingVertical: 10, ...shadow.card,
  },
  chipText: { color: ui.text, fontSize: 13, fontWeight: '700' },
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
