import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useLoginMutation, useRegisterMutation } from '@/api/marketApi';
import { useAppDispatch } from '@/store';
import { credentialsReceived } from '@/store/authSlice';
import { saveSession } from '@/services/secureStorage';
import { colors, font, radius, space } from '@/theme';
import { DISCLAIMER } from '@/config';
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
    <KeyboardAvoidingView
      style={s.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={s.inner}>
        <Text style={s.brand}>PREMARKET<Text style={{ color: colors.blue }}>·</Text>IQ</Text>
        <Text style={s.tagline}>Pre-market intelligence</Text>

        <TextInput
          value={email} onChangeText={setEmail}
          placeholder="Email" placeholderTextColor={colors.dim}
          autoCapitalize="none" keyboardType="email-address" style={s.input}
        />
        <TextInput
          value={password} onChangeText={setPassword}
          placeholder="Password" placeholderTextColor={colors.dim}
          secureTextEntry style={s.input}
        />

        {!!err && <Text style={s.error}>{err.message}</Text>}

        <Pressable onPress={submit} disabled={busy} style={[s.btn, busy && { opacity: 0.6 }]}>
          {busy ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnText}>{mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}</Text>}
        </Pressable>

        <Pressable onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>
          <Text style={s.switch}>
            {mode === 'login' ? 'No account? Register' : 'Have an account? Sign in'}
          </Text>
        </Pressable>

        <Text style={s.disclaimer}>{DISCLAIMER}</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center' },
  inner: { padding: space.xl, gap: space.md },
  brand: { color: colors.text, fontSize: 26, fontFamily: font.sansBold, letterSpacing: -0.5 },
  tagline: { color: colors.dim, fontSize: 12, fontFamily: font.sans, marginBottom: space.lg },
  input: {
    backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: space.md,
    color: colors.text, fontFamily: font.sans, fontSize: 14,
  },
  error: { color: colors.red, fontSize: 12, fontFamily: font.sans },
  btn: {
    backgroundColor: colors.blue, borderRadius: radius.md,
    paddingVertical: space.md, alignItems: 'center', marginTop: space.sm,
  },
  btnText: { color: '#fff', fontFamily: font.sansBold, fontSize: 13, letterSpacing: 0.5 },
  switch: { color: colors.blue, fontSize: 12, textAlign: 'center', fontFamily: font.sans, marginTop: space.sm },
  disclaimer: {
    color: colors.dim, fontSize: 10, lineHeight: 15,
    textAlign: 'center', fontFamily: font.sans, marginTop: space.xl,
  },
});
