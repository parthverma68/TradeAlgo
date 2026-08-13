import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, font, radius, space, signalColor } from '@/theme';
import type { PreOpen } from '@/types';

const BUILDUP_LABEL: Record<string, string> = {
  long_buildup: 'Long buildup',
  short_buildup: 'Short buildup',
  short_covering: 'Short covering',
  long_unwinding: 'Long unwinding',
};

export const SignalCard: React.FC<{ data: PreOpen }> = ({ data }) => {
  const c = signalColor(data.verdict.signal);
  return (
    <View style={[s.card, { borderColor: `${c}55` }]}>
      <View style={[s.glow, { backgroundColor: c }]} />
      <Text style={s.eyebrow}>{data.symbol} · PRE-OPEN SIGNAL</Text>
      <Text style={[s.signal, { color: c }]}>{data.verdict.signal}</Text>

      <View style={s.barRow}>
        <Text style={s.barLabel}>CONFIDENCE</Text>
        <Text style={[s.barValue, { color: c }]}>{data.verdict.confidence}%</Text>
      </View>
      <View style={s.barTrack}>
        <View style={[s.barFill, { width: `${data.verdict.confidence}%`, backgroundColor: c }]} />
      </View>

      <View style={s.scores}>
        <View style={s.scoreCol}>
          <Text style={s.scoreLabel}>Bull</Text>
          <Text style={[s.scoreValue, { color: colors.green }]}>{data.verdict.bullScore}</Text>
        </View>
        <View style={s.scoreCol}>
          <Text style={s.scoreLabel}>Bear</Text>
          <Text style={[s.scoreValue, { color: colors.red }]}>{data.verdict.bearScore}</Text>
        </View>
        <View style={s.scoreCol}>
          <Text style={s.scoreLabel}>Risk</Text>
          <Text style={[s.scoreValue, {
            color: data.verdict.riskScore > 60 ? colors.red
              : data.verdict.riskScore > 40 ? colors.amber : colors.green,
          }]}>{data.verdict.riskScore}</Text>
        </View>
        <View style={[s.scoreCol, { flex: 1.4 }]}>
          <Text style={s.scoreLabel}>Buildup</Text>
          <Text style={s.buildup}>{BUILDUP_LABEL[data.metrics.buildup] ?? '—'}</Text>
        </View>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.panel2, borderWidth: 1, borderRadius: radius.lg,
    padding: space.lg, marginBottom: space.md, overflow: 'hidden',
  },
  glow: {
    position: 'absolute', top: -70, right: -50, width: 160, height: 160,
    borderRadius: 80, opacity: 0.13,
  },
  eyebrow: {
    color: colors.muted, fontSize: 10, letterSpacing: 1,
    fontFamily: font.sansBold, marginBottom: 2,
  },
  signal: { fontSize: 34, fontFamily: font.sansBold, letterSpacing: -0.8, marginBottom: space.md },
  barRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  barLabel: { color: colors.muted, fontSize: 10, fontFamily: font.sans, letterSpacing: 0.5 },
  barValue: { fontSize: 12, fontFamily: font.monoBold },
  barTrack: { height: 7, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  scores: { flexDirection: 'row', marginTop: space.lg, gap: space.md },
  scoreCol: { flex: 1 },
  scoreLabel: {
    color: colors.dim, fontSize: 9, textTransform: 'uppercase',
    letterSpacing: 0.5, fontFamily: font.sans,
  },
  scoreValue: { fontSize: 17, fontFamily: font.monoBold, marginTop: 1 },
  buildup: { color: colors.text, fontSize: 12, fontFamily: font.monoBold, marginTop: 4 },
});
