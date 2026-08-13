import React from 'react';
import { ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { colors, font, radius, space } from '@/theme';

export const SymbolTabs: React.FC<{
  symbols: string[]; active: string; onSelect: (s: string) => void;
}> = ({ symbols, active, onSelect }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
    {symbols.map((sym) => {
      const on = sym === active;
      return (
        <Pressable
          key={sym}
          onPress={() => onSelect(sym)}
          style={[s.tab, on && { borderColor: colors.blue, backgroundColor: colors.panel2 }]}
        >
          <Text style={[s.text, on && { color: colors.text }]}>{sym}</Text>
        </Pressable>
      );
    })}
  </ScrollView>
);

const s = StyleSheet.create({
  row: { gap: space.sm, paddingBottom: space.md },
  tab: {
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel,
    borderRadius: radius.sm, paddingHorizontal: space.lg, paddingVertical: space.sm,
  },
  text: { color: colors.muted, fontSize: 12, fontFamily: font.sansBold, letterSpacing: 0.5 },
});
