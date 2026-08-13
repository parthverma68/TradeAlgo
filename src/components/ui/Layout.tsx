/**
 * Shared shells for the consumer screens: the soft lavender backdrop, circular
 * icon buttons, section headings and the range selector.
 */
import React from 'react';
import {
  View, Text, Pressable, StyleSheet, StyleProp, ViewStyle,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { ui, radii, gap } from '@/design/tokens';

/** Full-bleed vertical gradient — no extra native dependency needed. */
export const GradientBackground: React.FC<{
  from?: string; to?: string; style?: StyleProp<ViewStyle>;
}> = ({ from = ui.screenTop, to = ui.screenBottom, style }) => (
  <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
    <Svg width="100%" height="100%">
      <Defs>
        <LinearGradient id="bg" x1="0" y1="0" x2="0.35" y2="1">
          <Stop offset="0" stopColor={from} />
          <Stop offset="1" stopColor={to} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#bg)" />
    </Svg>
  </View>
);

export const Screen: React.FC<{
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  gradient?: boolean;
}> = ({ children, style, gradient = true }) => (
  <View style={[{ flex: 1, backgroundColor: gradient ? 'transparent' : ui.card }, style]}>
    {gradient && <GradientBackground />}
    {children}
  </View>
);

export const CircleButton: React.FC<{
  onPress?: () => void;
  children: React.ReactNode;
  size?: number;
  background?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}> = ({ onPress, children, size = 44, background = ui.inkSoft, accessibilityLabel, style }) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    style={({ pressed }) => [
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: background,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.75 : 1,
      },
      style,
    ]}
  >
    {children}
  </Pressable>
);

export const SectionHeading: React.FC<{
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  color?: string;
}> = ({ title, actionLabel, onAction, color = ui.text }) => (
  <View style={s.sectionHead}>
    <Text style={[s.sectionTitle, { color }]}>{title}</Text>
    {!!actionLabel && (
      <Pressable onPress={onAction} accessibilityRole="button" hitSlop={8}>
        <Text style={s.sectionAction}>{actionLabel}</Text>
      </Pressable>
    )}
  </View>
);

/** Pill selector used for chart ranges and any other short segmented choice. */
export function SegmentedPills<T extends string>({
  options,
  value,
  onChange,
  dark = true,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  dark?: boolean;
}) {
  return (
    <View style={s.pillRow}>
      {options.map(o => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[
              s.pill,
              {
                backgroundColor: active
                  ? ui.purple
                  : dark ? ui.inkRaised : ui.tile,
              },
            ]}
          >
            <Text
              style={[
                s.pillText,
                { color: active ? '#FFFFFF' : dark ? ui.onInkMuted : ui.textMuted },
              ]}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const PrimaryButton: React.FC<{
  label: string;
  onPress?: () => void;
  background?: string;
  color?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}> = ({ label, onPress, background = ui.purple, color = '#FFFFFF', disabled, style }) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="button"
    style={({ pressed }) => [
      s.button,
      { backgroundColor: background, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
      style,
    ]}
  >
    <Text style={[s.buttonText, { color }]}>{label}</Text>
  </Pressable>
);

const s = StyleSheet.create({
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: gap.md,
  },
  sectionTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  sectionAction: { color: ui.purple, fontSize: 14, fontWeight: '600' },
  pillRow: { flexDirection: 'row', gap: gap.sm },
  pill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: { fontSize: 14, fontWeight: '600' },
  button: {
    alignSelf: 'stretch',
    borderRadius: radii.pill,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: 16, fontWeight: '700' },
});
