import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, font, radius, space } from '@/theme';

export const Panel: React.FC<{
  title?: string; right?: React.ReactNode; style?: ViewStyle; children: React.ReactNode;
}> = ({ title, right, style, children }) => (
  <View style={[s.panel, style]}>
    {(title || right) && (
      <View style={s.panelHead}>
        {title ? <Text style={s.panelTitle}>{title}</Text> : <View />}
        {right}
      </View>
    )}
    {children}
  </View>
);

export const Chip: React.FC<{ color?: string; children: React.ReactNode }> = ({
  color = colors.blue, children,
}) => (
  <View style={[s.chip, { borderColor: `${color}55`, backgroundColor: `${color}1a` }]}>
    <Text style={[s.chipText, { color }]}>{children}</Text>
  </View>
);

export const Stat: React.FC<{
  label: string; value: string; sub?: string; color?: string; style?: ViewStyle;
}> = ({ label, value, sub, color, style }) => (
  <View style={[{ flex: 1 }, style]}>
    <Text style={s.statLabel}>{label}</Text>
    <Text style={[s.statValue, color ? { color } : null]}>{value}</Text>
    {!!sub && <Text style={[s.statSub, color ? { color } : null]}>{sub}</Text>}
  </View>
);

export const Divider = () => <View style={s.divider} />;

export const Label: React.FC<{ children: React.ReactNode; style?: TextStyle }> = ({ children, style }) => (
  <Text style={[s.statLabel, style]}>{children}</Text>
);

const s = StyleSheet.create({
  panel: {
    backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1,
    borderRadius: radius.md, padding: space.lg, marginBottom: space.md,
  },
  panelHead: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: space.md,
  },
  panelTitle: {
    color: colors.muted, fontSize: 11, letterSpacing: 1,
    textTransform: 'uppercase', fontFamily: font.sansBold,
  },
  chip: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 7, paddingVertical: 2 },
  chipText: { fontSize: 10, fontFamily: font.monoBold },
  statLabel: {
    color: colors.dim, fontSize: 10, letterSpacing: 0.5,
    textTransform: 'uppercase', fontFamily: font.sans,
  },
  statValue: { color: colors.text, fontSize: 19, fontFamily: font.monoBold, marginTop: 2 },
  statSub: { color: colors.muted, fontSize: 11, fontFamily: font.mono },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: space.sm },
});
