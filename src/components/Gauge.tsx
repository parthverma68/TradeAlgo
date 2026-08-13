import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, font } from '@/theme';

interface Props {
  value: number; max?: number; label: string; suffix?: string; color: string;
}

/** Semicircular gauge drawn with a single SVG arc. */
export const Gauge: React.FC<Props> = ({ value, max = 100, label, suffix = '', color }) => {
  const pct = Math.max(0, Math.min(1, value / max));
  const cx = 60, cy = 60, r = 46;
  const angle = Math.PI * (1 - pct);
  const x = cx + r * Math.cos(angle);
  const y = cy - r * Math.sin(angle);
  const large = pct > 0.5 ? 1 : 0;
  const track = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const fill = `M ${cx - r} ${cy} A ${r} ${r} 0 ${large} 1 ${x} ${y}`;

  return (
    <View style={s.wrap}>
      <Svg width={120} height={68} viewBox="0 0 120 68">
        <Path d={track} stroke={colors.border} strokeWidth={8} strokeLinecap="round" fill="none" />
        {pct > 0.001 && (
          <Path d={fill} stroke={color} strokeWidth={8} strokeLinecap="round" fill="none" />
        )}
      </Svg>
      <View style={s.center}>
        <Text style={[s.value, { color }]}>{value}{suffix}</Text>
        <Text style={s.label}>{label}</Text>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  wrap: { alignItems: 'center', width: 120 },
  center: { alignItems: 'center', marginTop: -20 },
  value: { fontSize: 18, fontFamily: font.monoBold },
  label: {
    color: colors.dim, fontSize: 9, letterSpacing: 0.5,
    textTransform: 'uppercase', fontFamily: font.sans, marginTop: 1,
  },
});
