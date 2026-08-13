import React from 'react';
import { ScrollView, View, Text, Switch, Pressable, StyleSheet } from 'react-native';
import { Panel, Divider } from '@/components/primitives';
import { useAppDispatch, useAppSelector } from '@/store';
import { notificationsToggled, alertTypeToggled } from '@/store/settingsSlice';
import { loggedOut } from '@/store/authSlice';
import { clearSession } from '@/services/secureStorage';
import { disconnectStomp } from '@/realtime/stompClient';
import { deletePushToken } from '@/services/notifications';
import { CONFIG, DISCLAIMER } from '@/config';
import { colors, font, radius, space } from '@/theme';

export default function SettingsScreen() {
  const dispatch = useAppDispatch();
  const { notificationsEnabled, alertTypes } = useAppSelector((s) => s.settings);
  const { user } = useAppSelector((s) => s.auth);
  const conn = useAppSelector((s) => s.live.connection);

  const signOut = async () => {
    disconnectStomp();
    await deletePushToken();   // stop alerts reaching this device
    await clearSession();
    dispatch(loggedOut());
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <Panel title="Account">
        <Text style={s.value}>{user?.email ?? 'Not signed in'}</Text>
      </Panel>

      <Panel title="Notifications">
        <View style={s.row}>
          <Text style={s.label}>Push alerts</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={(v) => dispatch(notificationsToggled(v))}
            trackColor={{ true: colors.blue, false: colors.border }}
          />
        </View>
        <Divider />
        {Object.entries(alertTypes).map(([k, on]) => (
          <View key={k} style={s.row}>
            <Text style={s.label}>{k.replace('_', ' ')}</Text>
            <Switch
              value={on}
              onValueChange={() => dispatch(alertTypeToggled(k))}
              trackColor={{ true: colors.blue, false: colors.border }}
            />
          </View>
        ))}
      </Panel>

      <Panel title="Connection">
        <View style={s.row}><Text style={s.label}>Live feed</Text><Text style={s.mono}>{conn}</Text></View>
        <View style={s.row}><Text style={s.label}>Data mode</Text>
          <Text style={s.mono}>{CONFIG.useMock ? 'MOCK' : 'LIVE'}</Text></View>
        <View style={s.row}><Text style={s.label}>API</Text>
          <Text style={[s.mono, { flex: 1, textAlign: 'right' }]} numberOfLines={1}>{CONFIG.apiBaseUrl}</Text></View>
      </Panel>

      <Pressable onPress={signOut} style={s.signOut}>
        <Text style={s.signOutText}>SIGN OUT</Text>
      </Pressable>

      <Text style={s.disclaimer}>{DISCLAIMER}</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, paddingBottom: space.xl * 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  label: { color: colors.text, fontSize: 13, fontFamily: font.sans, textTransform: 'capitalize' },
  value: { color: colors.text, fontSize: 14, fontFamily: font.mono },
  mono: { color: colors.muted, fontSize: 12, fontFamily: font.mono },
  signOut: {
    borderWidth: 1, borderColor: colors.red, borderRadius: radius.md,
    paddingVertical: space.md, alignItems: 'center', marginTop: space.sm,
  },
  signOutText: { color: colors.red, fontFamily: font.sansBold, fontSize: 12, letterSpacing: 0.5 },
  disclaimer: {
    color: colors.dim, fontSize: 10, lineHeight: 15,
    textAlign: 'center', fontFamily: font.sans, marginTop: space.xl,
  },
});
