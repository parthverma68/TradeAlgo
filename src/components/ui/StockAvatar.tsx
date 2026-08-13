/**
 * Circular stock mark: initials on a flat tint keyed by industry sector, so
 * the colour itself hints at the category (metal, IT, pharma…) without
 * shipping any trademarked company logos.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { SectorKey } from '@/types';

const SECTOR_BG: Record<SectorKey, string> = {
  it: '#6C4DF6',
  metal: '#71717A',
  semiconductor: '#0EA5E9',
  pharma: '#16C266',
  banking: '#2563EB',
  auto: '#F0495C',
  energy: '#F59E0B',
  fmcg: '#EC4899',
  realty: '#A855F7',
  media: '#14B8A6',
};

export const sectorColor = (sector: SectorKey) => SECTOR_BG[sector] ?? '#6C4DF6';

export const StockAvatar: React.FC<{
  symbol: string;
  sector: SectorKey;
  size?: number;
}> = ({ symbol, sector, size = 34 }) => {
  const initials = symbol.replace(/[^A-Z]/gi, '').slice(0, 2).toUpperCase() || '?';
  return (
    <View
      style={[
        s.circle,
        {
          width: size, height: size, borderRadius: size / 2,
          backgroundColor: SECTOR_BG[sector] ?? SECTOR_BG.it,
        },
      ]}
    >
      <Text style={{ color: '#FFFFFF', fontSize: size * 0.36, fontWeight: '800', letterSpacing: -0.2 }}>
        {initials}
      </Text>
    </View>
  );
};

const s = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
});
