import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView,
  Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLoginMutation, useRegisterMutation } from '@/api/marketApi';
import { useAppDispatch } from '@/store';
import { credentialsReceived } from '@/store/authSlice';
import { saveSession } from '@/services/secureStorage';
import { Screen, PrimaryButton } from '@/components/ui/Layout';
import { ui, gap, radii, shadow } from '@/design/tokens';
import { CONFIG, DISCLAIMER } from '@/config';
import type { ApiError } from '@/types';

export default function LoginScreen() {
  const dispatch = useAppDispatch();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [login, loginState] = useLoginMutation();
  const [register, regState] = useRegisterMutation();
  const busy = loginState.isLoading || regState.isLoading;
  const err = (loginState.error ?? regState.error) as ApiError | undefined;

  const submit = async () => {
    const fn = mode === 'login' ? login : register;
    const res = await fn({ email: email.trim(), password });
    if ('data' in res && res.data) {
      await saveSession(res.data.token, res.data.user);
      dispatch(credentialsReceived(res.data));
    }
  };

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={s.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={s.card}>
              <Text style={s.brand}>TradeAlgo</Text>
              <Text style={s.title}>
                {mode === 'login' ? 'Welcome back' : 'Create your account'}
              </Text>
              <Text style={s.subtitle}>
                {mode === 'login'
                  ? 'Sign in to pick up where you left off.'
                  : 'Start tracking and trading in under a minute.'}
              </Text>

              <Text style={s.label}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={ui.textFaint}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                style={s.input}
              />

              <Text style={s.label}>Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={ui.textFaint}
                secureTextEntry
                style={s.input}
              />

              {!!err && <Text style={s.error}>{err.message}</Text>}

              <PrimaryButton
                label={busy ? '' : mode === 'login' ? 'Sign in' : 'Create account'}
                onPress={submit}
                disabled={busy || !email || !password}
                style={{ marginTop: gap.lg }}
              />
              {busy && (
                <View style={s.busy} pointerEvents="none">
                  <ActivityIndicator color="#FFFFFF" />
                </View>
              )}

              <Pressable
                onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
                style={{ marginTop: gap.lg }}
                accessibilityRole="button"
              >
                <Text style={s.switch}>
                  {mode === 'login'
                    ? 'No account? Register'
                    : 'Have an account? Sign in'}
                </Text>
              </Pressable>

              {CONFIG.useMock && (
                <View style={s.demo}>
                  <Text style={s.demoText}>
                    Demo mode — any email and password signs you in, and all market
                    data is simulated locally.
                  </Text>
                </View>
              )}
            </View>

            <Text style={s.disclaimer}>{DISCLAIMER}</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Screen>
  );
}

const s = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: 'center', padding: gap.lg },
  card: {
    backgroundColor: ui.card,
    borderRadius: radii.xl,
    padding: gap.xl,
    ...shadow.card,
  },
  brand: { color: ui.purple, fontSize: 14, fontWeight: '800', letterSpacing: 1.2 },
  title: {
    color: ui.text, fontSize: 30, fontWeight: '800',
    letterSpacing: -0.9, marginTop: gap.sm,
  },
  subtitle: { color: ui.textMuted, fontSize: 14, marginTop: gap.sm, marginBottom: gap.xl },
  label: { color: ui.textMuted, fontSize: 12, marginBottom: gap.xs, marginTop: gap.md },
  input: {
    backgroundColor: ui.tile,
    borderRadius: radii.md,
    paddingHorizontal: gap.lg,
    paddingVertical: 14,
    fontSize: 15,
    color: ui.text,
  },
  error: { color: ui.red, fontSize: 13, marginTop: gap.md },
  busy: { position: 'absolute', left: 0, right: 0, bottom: 118, alignItems: 'center' },
  switch: { color: ui.purple, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  demo: {
    backgroundColor: ui.purpleTint,
    borderRadius: radii.md,
    padding: gap.md,
    marginTop: gap.xl,
  },
  demoText: { color: ui.purpleDeep, fontSize: 12, lineHeight: 18 },
  disclaimer: {
    color: ui.textFaint, fontSize: 11, lineHeight: 16,
    textAlign: 'center', marginTop: gap.lg,
  },
});
