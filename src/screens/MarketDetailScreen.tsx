import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { CandleChart } from '@/components/ui/CandleChart';
import { BrandMark } from '@/components/ui/BrandMark';
import { Screen, CircleButton, SegmentedPills, PrimaryButton } from '@/components/ui/Layout';
import { TradeSheet } from '@/components/ui/TradeSheet';
import { Bell, ChevronLeft, ArrowUpRight, ArrowDownRight } from '@/design/icons';
import { useStock } from '@/hooks/useStocks';
import { useAppDispatch, useAppSelector } from '@/store';
import { orderFilled, heldQty } from '@/store/portfolioSlice';
import { usePlaceOrderMutation } from '@/api/marketApi';
import { ui, gap, radii, shadow, fmtMoney, fmtPct, fmtCompact } from '@/design/tokens';
import type { ChartRange, OrderSide } from '@/types';
import type { RootStackParamList, RootScreenProps } from '@/navigation/types';

const RANGES: { value: ChartRange; label: string }[] = [
  { value: '24hr', label: '24hr' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
];

export default function MarketDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<RootScreenProps<'MarketDetail'>['route']>();
  const symbol = params.symbol;

  const dispatch = useAppDispatch();
  const [range, setRange] = useState<ChartRange>('24hr');
  const [selected, setSelected] = useState<number | null>(null);
  const [sheet, setSheet] = useState<OrderSide | null>(null);

  const { data, isLoading, error, refetch } = useStock(symbol, range);
  const [placeOrder, orderState] = usePlaceOrderMutation();
  const { cash } = useAppSelector(s => s.portfolio);
  const owned = useAppSelector(s => heldQty(s.portfolio, symbol));

  // Default the cursor to the latest bar, but respect an explicit tap.
  const selectedIndex = useMemo(() => {
    const last = Math.max(0, (data?.candles.length ?? 1) - 1);
    if (selected === null) return last;
    return Math.min(selected, last);
  }, [selected, data?.candles.length]);

  const submit = async (side: OrderSide, qty: number) => {
    const res = await placeOrder({ symbol, side, qty });

    if ('error' in res && res.error) {
      Alert.alert('Order failed', res.error.message);
      return;
    }
    if (!('data' in res) || !res.data) return;

    if (res.data.status === 'REJECTED') {
      Alert.alert('Order rejected', res.data.reason ?? 'The venue rejected this order.');
      return;
    }

    dispatch(orderFilled(res.data));
    setSheet(null);
    Alert.alert(
      `${side === 'BUY' ? 'Bought' : 'Sold'} ${qty} ${symbol}`,
      `Filled at ${fmtMoney(res.data.price)} · ${fmtMoney(qty * res.data.price)} total`,
    );
  };

  const positive = (data?.changePct ?? 0) >= 0;
  const Arrow = positive ? ArrowUpRight : ArrowDownRight;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[]}
      >
        {/* ---- dark chart card ------------------------------------------- */}
        <View style={s.dark}>
          <SafeAreaView edges={['top']}>
            <View style={s.headerRow}>
              <CircleButton
                accessibilityLabel="Go back"
                background={ui.inkRaised}
                onPress={() => navigation.goBack()}
              >
                <ChevronLeft size={20} color="#FFFFFF" />
              </CircleButton>
              <Text style={s.headerTitle}>Market</Text>
              <CircleButton
                accessibilityLabel="Alerts"
                background={ui.inkRaised}
                onPress={() => navigation.navigate('Alerts')}
              >
                <Bell size={19} color="#FFFFFF" />
              </CircleButton>
            </View>

            {isLoading && (
              <View style={s.darkState}>
                <ActivityIndicator color={ui.purple} />
              </View>
            )}

            {!!error && !isLoading && (
              <Pressable style={s.darkState} onPress={refetch}>
                <Text style={s.darkStateText}>{error.message}</Text>
                <Text style={s.retry}>Tap to retry</Text>
              </Pressable>
            )}

            {!!data && (
              <>
                <View style={s.priceRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.priceLabel}>{data.name} price</Text>
                    <View style={s.priceLine}>
                      <Text style={s.price}>{data.price.toFixed(2)}</Text>
                      <Arrow size={16} color="#FFFFFF" strokeWidth={2.2} />
                      <Text style={s.priceDelta}>{fmtPct(data.changePct).replace('+', '')}</Text>
                    </View>
                  </View>
                  <BrandMark brand={data.brand} size={54} />
                </View>

                <View style={s.pills}>
                  <SegmentedPills
                    options={RANGES}
                    value={range}
                    onChange={r => { setRange(r); setSelected(null); }}
                  />
                </View>

                <View style={s.chart}>
                  <CandleChart
                    candles={data.candles}
                    selected={selectedIndex}
                    onSelect={setSelected}
                    height={300}
                  />
                </View>
              </>
            )}
          </SafeAreaView>
        </View>

        {/* ---- stats ------------------------------------------------------ */}
        {!!data && (
          <View style={s.body}>
            <View style={s.card}>
              <View style={s.statRow}>
                <Stat label="High" value={fmtMoney(data.high, '', 2)} />
                <View style={s.dot} />
                <Stat label="Low" value={fmtMoney(data.low, '', 2)} align="flex-end" />
              </View>
              <View style={s.hairline} />
              <View style={s.statRow}>
                <Stat label="Open" value={fmtMoney(data.open, '', 2)} />
                <View style={[s.dot, { backgroundColor: ui.purple }]} />
                <Stat label="Prev close" value={fmtMoney(data.prevClose, '', 2)} align="flex-end" />
              </View>
            </View>

            <View style={s.card}>
              <View style={s.volumeHead}>
                <Text style={s.volumeTitle}>Today Volume</Text>
                <Text style={s.volumeValue}>{fmtCompact(data.volume)}</Text>
              </View>
              <Text style={s.volumeBody}>
                Volume is the number of shares of a security traded during a given
                period of time.
              </Text>
            </View>

            <View style={s.card}>
              <View style={s.volumeHead}>
                <Text style={s.volumeTitle}>Your position</Text>
                <Text style={s.volumeValue}>
                  {owned > 0 ? `${owned} sh` : 'None'}
                </Text>
              </View>
              <Text style={s.volumeBody}>
                {owned > 0
                  ? `Worth ${fmtMoney(owned * data.price)} at the current price. Buying power ${fmtMoney(cash)}.`
                  : `You don't hold ${data.symbol} yet. Buying power ${fmtMoney(cash)}.`}
              </Text>
            </View>

            <View style={s.actions}>
              <View style={{ flex: 1 }}>
                <PrimaryButton
                  label="Sell"
                  background={ui.ink}
                  disabled={owned <= 0}
                  onPress={() => setSheet('SELL')}
                />
              </View>
              <View style={{ width: gap.md }} />
              <View style={{ flex: 1 }}>
                <PrimaryButton label="Buy" onPress={() => setSheet('BUY')} />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {!!data && (
        <TradeSheet
          visible={sheet !== null}
          side={sheet ?? 'BUY'}
          stock={data}
          cash={cash}
          owned={owned}
          busy={orderState.isLoading}
          onClose={() => setSheet(null)}
          onSubmit={qty => submit(sheet ?? 'BUY', qty)}
        />
      )}
    </Screen>
  );
}

const Stat: React.FC<{ label: string; value: string; align?: 'flex-start' | 'flex-end' }> = ({
  label, value, align = 'flex-start',
}) => (
  <View style={{ flex: 1, alignItems: align }}>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{value}</Text>
    </View>
  </View>
);

const s = StyleSheet.create({
  scroll: { paddingBottom: 40 },
  dark: {
    backgroundColor: ui.ink,
    borderBottomLeftRadius: radii.xl,
    borderBottomRightRadius: radii.xl,
    paddingHorizontal: gap.lg,
    paddingBottom: gap.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: gap.md,
  },
  headerTitle: { color: '#FFFFFF', fontSize: 19, fontWeight: '700' },
  darkState: { paddingVertical: 60, alignItems: 'center' },
  darkStateText: { color: ui.onInkMuted, fontSize: 14, textAlign: 'center' },
  retry: { color: ui.purple, fontSize: 13, fontWeight: '600', marginTop: gap.sm },
  priceRow: { flexDirection: 'row', alignItems: 'center', marginTop: gap.xl },
  priceLabel: { color: ui.onInkMuted, fontSize: 17 },
  priceLine: { flexDirection: 'row', alignItems: 'center', marginTop: gap.xs },
  price: { color: '#FFFFFF', fontSize: 40, fontWeight: '700', letterSpacing: -1.4, marginRight: gap.md },
  priceDelta: { color: '#FFFFFF', fontSize: 15, marginLeft: 4 },
  pills: { marginTop: gap.xl },
  chart: { marginTop: gap.xl },
  body: { paddingHorizontal: gap.lg, paddingTop: gap.lg },
  card: {
    backgroundColor: ui.card,
    borderRadius: radii.lg,
    padding: gap.lg,
    marginBottom: gap.md,
    ...shadow.card,
  },
  statRow: { flexDirection: 'row', alignItems: 'center' },
  statLabel: { color: ui.textMuted, fontSize: 14, marginRight: gap.md },
  statValue: { color: ui.text, fontSize: 15, fontWeight: '700' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: ui.green, marginHorizontal: gap.sm },
  hairline: { height: 1, backgroundColor: ui.hairline, marginVertical: gap.md },
  volumeHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: gap.sm,
  },
  volumeTitle: { color: ui.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  volumeValue: { color: ui.text, fontSize: 17, fontWeight: '800' },
  volumeBody: { color: ui.textMuted, fontSize: 13, lineHeight: 19 },
  actions: { flexDirection: 'row', marginTop: gap.sm, marginBottom: gap.xl },
});
