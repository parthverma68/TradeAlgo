/**
 * Order ticket. Quantity is validated here — affordability for buys, position
 * size for sells — so an obviously bad order never reaches the venue. The venue
 * still validates independently; this is convenience, not the guard.
 */
import React, { useEffect, useState } from 'react';
import {
  Modal, View, Text, Pressable, StyleSheet, TextInput, ActivityIndicator,
} from 'react-native';
import { BrandMark } from './BrandMark';
import { PrimaryButton } from './Layout';
import { CloseIcon } from '@/design/icons';
import { ui, gap, radii, fmtMoney } from '@/design/tokens';
import type { OrderSide, StockDetail } from '@/types';

interface Props {
  visible: boolean;
  side: OrderSide;
  stock: StockDetail;
  cash: number;
  owned: number;
  busy?: boolean;
  onClose: () => void;
  onSubmit: (qty: number) => void;
}

const QUICK = [1, 5, 10];

export const TradeSheet: React.FC<Props> = ({
  visible, side, stock, cash, owned, busy, onClose, onSubmit,
}) => {
  const [qtyText, setQtyText] = useState('1');

  useEffect(() => {
    if (visible) setQtyText('1');
  }, [visible, side]);

  const qty = Number(qtyText.replace(',', '.')) || 0;
  const cost = qty * stock.price;
  const buying = side === 'BUY';

  const problem = (() => {
    if (qty <= 0) return 'Enter a quantity greater than zero.';
    if (buying && cost > cash) return `Not enough buying power — you have ${fmtMoney(cash)}.`;
    if (!buying && qty > owned) return `You only hold ${owned} share${owned === 1 ? '' : 's'}.`;
    return null;
  })();

  const maxQty = buying
    ? Math.floor((cash / stock.price) * 100) / 100
    : owned;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} accessibilityLabel="Dismiss" />
      <View style={s.sheet}>
        <View style={s.grabber} />

        <View style={s.head}>
          <BrandMark brand={stock.brand} size={40} />
          <View style={{ flex: 1, marginLeft: gap.md }}>
            <Text style={s.title}>{buying ? 'Buy' : 'Sell'} {stock.name}</Text>
            <Text style={s.subtitle}>
              {fmtMoney(stock.price, stock.currency)} per share
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
            <CloseIcon size={22} color={ui.textMuted} />
          </Pressable>
        </View>

        <Text style={s.label}>Quantity</Text>
        <View style={s.qtyRow}>
          <TextInput
            value={qtyText}
            onChangeText={setQtyText}
            keyboardType="decimal-pad"
            style={s.qtyInput}
            accessibilityLabel="Quantity"
          />
          <View style={s.quick}>
            {QUICK.map(n => (
              <Pressable key={n} onPress={() => setQtyText(String(n))} style={s.quickBtn}>
                <Text style={s.quickText}>{n}</Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => setQtyText(String(maxQty))}
              style={[s.quickBtn, { backgroundColor: ui.purpleTint }]}
            >
              <Text style={[s.quickText, { color: ui.purple }]}>Max</Text>
            </Pressable>
          </View>
        </View>

        <View style={s.summary}>
          <Row label="Estimated total" value={fmtMoney(cost)} strong />
          <Row label={buying ? 'Buying power' : 'Position'}
            value={buying ? fmtMoney(cash) : `${owned} sh`} />
          <Row
            label={buying ? 'Left after order' : 'Left after sale'}
            value={buying ? fmtMoney(cash - cost) : `${Math.max(0, +(owned - qty).toFixed(4))} sh`}
          />
        </View>

        {!!problem && <Text style={s.problem}>{problem}</Text>}

        <PrimaryButton
          label={busy ? '' : `${buying ? 'Confirm buy' : 'Confirm sell'}`}
          background={buying ? ui.purple : ui.ink}
          disabled={!!problem || busy}
          onPress={() => onSubmit(qty)}
          style={{ marginTop: gap.md }}
        />
        {busy && (
          <View style={s.busy} pointerEvents="none">
            <ActivityIndicator color="#FFFFFF" />
          </View>
        )}
      </View>
    </Modal>
  );
};

const Row: React.FC<{ label: string; value: string; strong?: boolean }> = ({
  label, value, strong,
}) => (
  <View style={s.summaryRow}>
    <Text style={s.summaryLabel}>{label}</Text>
    <Text style={[s.summaryValue, strong && { fontSize: 17, fontWeight: '800' }]}>{value}</Text>
  </View>
);

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(10,10,20,0.42)' },
  sheet: {
    backgroundColor: ui.card,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: gap.xl,
    paddingBottom: gap.xxl,
  },
  grabber: {
    width: 44, height: 4, borderRadius: 2, backgroundColor: ui.hairline,
    alignSelf: 'center', marginBottom: gap.lg,
  },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: gap.xl },
  title: { color: ui.text, fontSize: 19, fontWeight: '800', letterSpacing: -0.3 },
  subtitle: { color: ui.textMuted, fontSize: 13, marginTop: 2 },
  label: { color: ui.textMuted, fontSize: 13, marginBottom: gap.sm },
  qtyRow: { flexDirection: 'row', alignItems: 'center' },
  qtyInput: {
    backgroundColor: ui.tile,
    borderRadius: radii.md,
    paddingHorizontal: gap.lg,
    paddingVertical: 14,
    fontSize: 20,
    fontWeight: '700',
    color: ui.text,
    minWidth: 96,
    marginRight: gap.md,
  },
  quick: { flexDirection: 'row', flex: 1, justifyContent: 'flex-end' },
  quickBtn: {
    backgroundColor: ui.tile,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginLeft: gap.sm,
  },
  quickText: { color: ui.text, fontSize: 13, fontWeight: '700' },
  summary: { marginTop: gap.xl },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
  },
  summaryLabel: { color: ui.textMuted, fontSize: 14 },
  summaryValue: { color: ui.text, fontSize: 15, fontWeight: '600' },
  problem: { color: ui.red, fontSize: 13, marginTop: gap.md },
  busy: { position: 'absolute', left: 0, right: 0, bottom: 46, alignItems: 'center' },
});
