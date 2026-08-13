/**
 * Monthly subscription paywall — unlocks the premium indicator groups
 * (earnings, forward outlook, shareholder confidence), real-time alerts and
 * the scheduled scan jobs behind the confidence API. Billing itself is
 * mocked: subscribing just flips a local flag.
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { Screen, CircleButton, PrimaryButton } from '@/components/ui/Layout';
import { CheckIcon, ChevronLeft } from '@/design/icons';
import { useAppDispatch, useAppSelector } from '@/store';
import { planChanged } from '@/store/settingsSlice';
import { ui, gap, radii, shadow } from '@/design/tokens';
import { PLANS } from '@/types';
import type { PlanKey } from '@/types';

export default function SubscriptionScreen() {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const plan = useAppSelector(s => s.settings.plan);

  const choose = (key: PlanKey) => {
    if (key === plan) return;
    if (key === 'free') {
      Alert.alert('Downgrade to Free', 'You will lose premium indicators, alerts and job scheduling.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Downgrade', style: 'destructive', onPress: () => dispatch(planChanged('free')) },
      ]);
      return;
    }
    dispatch(planChanged('pro'));
    Alert.alert('You are on Pro', 'Every indicator, alert and job is unlocked. This is a demo — no card was charged.');
  };

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <View style={s.headerRow}>
            <CircleButton accessibilityLabel="Close" onPress={() => navigation.goBack()}>
              <ChevronLeft size={20} color={ui.text} />
            </CircleButton>
          </View>

          <Text style={s.title}>Subscription</Text>
          <Text style={s.hint}>
            Every indicator, every alert, every scheduled scan job runs on our API — the monthly plan
            covers that compute, not stock tips.
          </Text>

          {PLANS.map(p => {
            const active = p.key === plan;
            return (
              <View key={p.key} style={[s.card, active && s.cardActive]}>
                <View style={s.cardHead}>
                  <View>
                    <Text style={s.planLabel}>{p.label}</Text>
                    <Text style={s.planPrice}>{p.priceLabel}</Text>
                  </View>
                  {active && (
                    <View style={s.currentPill}>
                      <Text style={s.currentPillText}>Current</Text>
                    </View>
                  )}
                </View>

                {p.features.map(f => (
                  <View key={f} style={s.featureRow}>
                    <CheckIcon size={16} color={p.key === 'pro' ? ui.purple : ui.textMuted} />
                    <Text style={s.featureText}>{f}</Text>
                  </View>
                ))}

                <PrimaryButton
                  label={active ? 'Current plan' : p.key === 'pro' ? 'Upgrade to Pro' : 'Switch to Free'}
                  background={active ? ui.tile : p.key === 'pro' ? ui.purple : ui.ink}
                  color={active ? ui.textMuted : '#FFFFFF'}
                  disabled={active}
                  onPress={() => choose(p.key)}
                  style={{ marginTop: gap.lg }}
                />
              </View>
            );
          })}

          <Text style={s.disclaimer}>
            Demo billing — no payment is collected. Analytics only, not investment advice.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: gap.lg, paddingBottom: 120 },
  headerRow: { flexDirection: 'row', marginTop: gap.md },
  title: {
    color: ui.text, fontSize: 28, fontWeight: '800',
    letterSpacing: -0.6, marginTop: gap.lg, marginBottom: gap.xs,
  },
  hint: { color: ui.textMuted, fontSize: 13, lineHeight: 19, marginBottom: gap.xl },
  card: {
    backgroundColor: ui.card, borderRadius: radii.xl, padding: gap.xl,
    marginBottom: gap.lg, borderWidth: 1, borderColor: ui.hairline, ...shadow.card,
  },
  cardActive: { borderColor: ui.purple },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  planLabel: { color: ui.text, fontSize: 20, fontWeight: '800' },
  planPrice: { color: ui.textMuted, fontSize: 14, marginTop: 2 },
  currentPill: { backgroundColor: ui.purpleTint, borderRadius: radii.pill, paddingHorizontal: 12, paddingVertical: 5 },
  currentPillText: { color: ui.purple, fontSize: 11, fontWeight: '800' },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: gap.md },
  featureText: { color: ui.text, fontSize: 13, marginLeft: gap.sm, flex: 1, lineHeight: 18 },
  disclaimer: {
    color: ui.textFaint, fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: gap.sm,
  },
});
