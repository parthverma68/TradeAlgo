import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { Screen, SectionHeading } from '@/components/ui/Layout';
import { ChevronRight } from '@/design/icons';
import { useAppDispatch, useAppSelector } from '@/store';
import { notificationsToggled } from '@/store/settingsSlice';
import { loggedOut } from '@/store/authSlice';
import { liveCleared } from '@/store/liveSlice';
import { clearSession } from '@/services/secureStorage';
import { disconnectStomp } from '@/realtime/stompClient';
import { CONFIG, DISCLAIMER } from '@/config';
import { ui, gap, radii, shadow } from '@/design/tokens';
import { PLANS } from '@/types';
import type { TabNav, RootStackParamList } from '@/navigation/types';

/** The index F&O terminal — NIFTY/BANKNIFTY analytics, kept reachable from here. */
const ANALYTICS: { route: keyof RootStackParamList; label: string; hint: string }[] = [
  { route: 'Dashboard', label: 'Pre-market dashboard', hint: 'Verdict, confidence, gauges' },
  { route: 'Chain', label: 'Option chain', hint: 'OI by strike, max pain' },
  { route: 'Futures', label: 'Futures', hint: 'Basis, OI buildup' },
  { route: 'News', label: 'News sentiment', hint: 'Scored headlines' },
  { route: 'Alerts', label: 'Alerts', hint: 'Pushed + fetched alerts' },
  { route: 'Settings', label: 'Alert settings', hint: 'Types, connection status' },
];

export default function ProfileScreen() {
  const navigation = useNavigation<TabNav<'Profile'>>();
  const dispatch = useAppDispatch();
  const user = useAppSelector(s => s.auth.user);
  const { notificationsEnabled, plan } = useAppSelector(s => s.settings);
  const connection = useAppSelector(s => s.live.connection);
  const planInfo = PLANS.find(p => p.key === plan) ?? PLANS[0];

  const signOut = () => {
    Alert.alert('Sign out', 'You will need to sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          disconnectStomp();
          dispatch(liveCleared());
          dispatch(loggedOut());
          await clearSession();
        },
      },
    ]);
  };

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <Text style={s.title}>Profile</Text>

          <View style={s.identity}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{(user?.email ?? 'T')[0].toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: gap.lg }}>
              <Text style={s.email}>{user?.email ?? 'Signed in'}</Text>
              <Text style={s.meta}>
                {CONFIG.useMock ? 'Demo data' : CONFIG.envName} · stream {connection}
              </Text>
            </View>
          </View>

          <SectionHeading title="Subscription" />
          <Pressable
            onPress={() => navigation.navigate('Subscription')}
            accessibilityRole="button"
            style={[s.card, s.planCard]}
          >
            <View style={{ flex: 1 }}>
              <Text style={s.rowLabel}>{planInfo.label} plan · {planInfo.priceLabel}</Text>
              <Text style={s.rowHint}>
                {plan === 'pro'
                  ? 'Every indicator, alert and job unlocked'
                  : 'Upgrade to unlock earnings, forward outlook, shareholder confidence & alerts'}
              </Text>
            </View>
            <ChevronRight size={18} color={ui.textFaint} />
          </Pressable>

          <SectionHeading title="Preferences" />
          <View style={s.card}>
            <View style={s.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.rowLabel}>Push alerts</Text>
                <Text style={s.rowHint}>Price and signal notifications</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={v => { dispatch(notificationsToggled(v)); }}
                trackColor={{ true: ui.purple, false: ui.hairline }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          <SectionHeading title="Index analytics" />
          <View style={s.card}>
            {ANALYTICS.map((item, i) => (
              <Pressable
                key={item.route}
                onPress={() => navigation.navigate(item.route as 'Dashboard')}
                accessibilityRole="button"
                style={[s.linkRow, i > 0 && s.linkDivider]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={s.rowLabel}>{item.label}</Text>
                  <Text style={s.rowHint}>{item.hint}</Text>
                </View>
                <ChevronRight size={18} color={ui.textFaint} />
              </Pressable>
            ))}
          </View>

          <SectionHeading title="Account" />
          <View style={s.card}>
            <Pressable onPress={signOut} style={s.linkRow} accessibilityRole="button">
              <Text style={[s.rowLabel, { color: ui.red }]}>Sign out</Text>
              <ChevronRight size={18} color={ui.textFaint} />
            </Pressable>
          </View>

          <Text style={s.disclaimer}>{DISCLAIMER}</Text>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: gap.lg, paddingBottom: 120 },
  title: {
    color: ui.text, fontSize: 30, fontWeight: '800',
    letterSpacing: -0.8, marginTop: gap.lg, marginBottom: gap.lg,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ui.card,
    borderRadius: radii.lg,
    padding: gap.lg,
    marginBottom: gap.xl,
    ...shadow.card,
  },
  avatar: {
    width: 54, height: 54, borderRadius: 27, backgroundColor: ui.purple,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontSize: 21, fontWeight: '800' },
  email: { color: ui.text, fontSize: 16, fontWeight: '700' },
  meta: { color: ui.textMuted, fontSize: 12, marginTop: 3 },
  card: {
    backgroundColor: ui.card,
    borderRadius: radii.lg,
    paddingHorizontal: gap.lg,
    marginBottom: gap.xl,
    ...shadow.card,
  },
  planCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: gap.lg },
  switchRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: gap.lg },
  linkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: gap.lg },
  linkDivider: { borderTopWidth: 1, borderTopColor: ui.hairline },
  rowLabel: { color: ui.text, fontSize: 15, fontWeight: '600', flex: 1 },
  rowHint: { color: ui.textMuted, fontSize: 12, marginTop: 2 },
  disclaimer: {
    color: ui.textFaint, fontSize: 11, lineHeight: 16, textAlign: 'center',
    marginTop: gap.sm,
  },
});
