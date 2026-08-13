import React from 'react';
import { View, Text, ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { colors, font, radius, space } from '@/theme';
import type { ApiError } from '@/types';

export const Loading: React.FC<{ label?: string }> = ({ label = 'Loading…' }) => (
  <View style={s.center}>
    <ActivityIndicator color={colors.blue} />
    <Text style={s.dim}>{label}</Text>
  </View>
);

export const Skeleton: React.FC<{ height?: number; style?: object }> = ({ height = 80, style }) => (
  <View style={[s.skeleton, { height }, style]} />
);

export const ErrorState: React.FC<{ error?: ApiError; onRetry?: () => void }> = ({ error, onRetry }) => (
  <View style={s.center}>
    <Text style={s.errCode}>{error?.code ?? 'ERROR'}</Text>
    <Text style={s.errMsg}>{error?.message ?? 'Could not load data.'}</Text>
    {!!onRetry && (
      <Pressable onPress={onRetry} style={s.retry}>
        <Text style={s.retryText}>Retry</Text>
      </Pressable>
    )}
  </View>
);

export const EmptyState: React.FC<{ title: string; hint?: string }> = ({ title, hint }) => (
  <View style={s.center}>
    <Text style={s.emptyTitle}>{title}</Text>
    {!!hint && <Text style={s.dim}>{hint}</Text>}
  </View>
);

export const ConnectionBanner: React.FC<{ state: string }> = ({ state }) => {
  if (state === 'connected' || state === 'idle') return null;
  const offline = state === 'offline';
  return (
    <View style={[s.banner, { backgroundColor: offline ? `${colors.red}22` : `${colors.amber}22` }]}>
      <Text style={[s.bannerText, { color: offline ? colors.red : colors.amber }]}>
        {offline ? 'Live feed disconnected — showing last known data' : 'Reconnecting to live feed…'}
      </Text>
    </View>
  );
};

const s = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.sm },
  dim: { color: colors.muted, fontSize: 12, fontFamily: font.sans, textAlign: 'center' },
  skeleton: {
    backgroundColor: colors.panel2, borderRadius: radius.md,
    marginBottom: space.md, opacity: 0.6,
  },
  errCode: { color: colors.red, fontSize: 11, fontFamily: font.monoBold, letterSpacing: 1 },
  errMsg: { color: colors.text, fontSize: 13, fontFamily: font.sans, textAlign: 'center' },
  retry: {
    borderWidth: 1, borderColor: colors.blue, borderRadius: radius.sm,
    paddingHorizontal: space.lg, paddingVertical: space.sm, marginTop: space.sm,
  },
  retryText: { color: colors.blue, fontSize: 12, fontFamily: font.sansBold },
  emptyTitle: { color: colors.text, fontSize: 14, fontFamily: font.sansBold },
  banner: { paddingVertical: 6, paddingHorizontal: space.lg },
  bannerText: { fontSize: 11, fontFamily: font.mono, textAlign: 'center' },
});
