/**
 * Circular company marks. Simplified vector glyphs — the real wordmarks are
 * trademarked assets we don't ship, and these read correctly at 24–48px.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Rect, G } from 'react-native-svg';
import type { BrandKey } from '@/types';

const BRAND_BG: Record<BrandKey, string> = {
  facebook: '#1877F2',
  twitter: '#1DA1F2',
  tesla: '#E31937',
  amazon: '#141821',
  netflix: '#111111',
  google: '#FFFFFF',
  microsoft: '#111827',
  generic: '#6C4DF6',
};

const Glyph: React.FC<{ brand: BrandKey; size: number }> = ({ brand, size }) => {
  const s = size * 0.62;

  switch (brand) {
    case 'tesla':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Path
            fill="#FFFFFF"
            d="M4.6 5.9C6.9 4.7 9.4 4.1 12 4.1s5.1.6 7.4 1.8L18 8.1c-1.3-.6-2.6-1-4-1.2l-1.9 13h-.2L10 6.9c-1.4.2-2.7.6-4 1.2L4.6 5.9Z"
          />
          <Path
            fill="#FFFFFF"
            d="M12 3.1c-2.3 0-4.6.4-6.7 1.2l-.6-1A17.6 17.6 0 0 1 12 2c2.5 0 4.9.4 7.3 1.3l-.6 1c-2.1-.8-4.4-1.2-6.7-1.2Z"
          />
        </Svg>
      );
    case 'twitter':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Path
            fill="#FFFFFF"
            d="M23.6 4.9c-.8.4-1.7.6-2.7.7a4.7 4.7 0 0 0 2-2.6 9.3 9.3 0 0 1-2.9 1.2 4.7 4.7 0 0 0-8 4.2A13.2 13.2 0 0 1 2.5 3.6a4.7 4.7 0 0 0 1.4 6.2 4.6 4.6 0 0 1-2.1-.6v.1a4.7 4.7 0 0 0 3.7 4.5 4.7 4.7 0 0 1-2.1.1 4.7 4.7 0 0 0 4.4 3.2A9.3 9.3 0 0 1 1 19.1a13.2 13.2 0 0 0 7.1 2.1c8.6 0 13.3-7.1 13.3-13.3v-.6c.9-.7 1.7-1.5 2.2-2.4Z"
          />
        </Svg>
      );
    case 'microsoft':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <G>
            <Rect x="2.5" y="2.5" width="8.4" height="8.4" fill="#F25022" />
            <Rect x="13.1" y="2.5" width="8.4" height="8.4" fill="#7FBA00" />
            <Rect x="2.5" y="13.1" width="8.4" height="8.4" fill="#00A4EF" />
            <Rect x="13.1" y="13.1" width="8.4" height="8.4" fill="#FFB900" />
          </G>
        </Svg>
      );
    case 'amazon':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Path
            fill="#FF9900"
            d="M3.4 16.6c4.2 2.6 9.4 3.1 13.9 1.2.6-.3 1 .4.5.8-2 1.6-4.6 2.4-7 2.4-3.3 0-6.4-1.3-8.7-3.6-.3-.3 0-.8.4-.6l.9-.2Z"
          />
          <Path
            fill="#FF9900"
            d="M19 15.4c.6-.1 1.6-.2 1.9.2.3.4-.1 1.5-.4 2.1-.1.3.1.4.3.2.9-.8 1.2-2.4 1-3-.2-.4-1.5-.7-2.6-.2-.4.2-.5.5-.2.7Z"
          />
          <Path
            fill="#FFFFFF"
            d="M13.9 12.4c0 1-.2 1.9-.7 2.4-.4.4-.9.6-1.4.5-.7-.1-1.1-.7-1.1-1.6 0-1.9 1.7-2.3 3.2-2.3v1Zm2.5 3.3c-.2-.2-.4-.5-.4-1.2v-3.9c0-1.6-1.1-2.7-3.3-2.7-1.8 0-3.4.9-3.7 2.6 0 .2.1.3.2.3l1.6.2c.2 0 .3-.2.3-.3.2-.7.7-1 1.4-1 .8 0 1.2.5 1.2 1.4v.5c-2.3 0-4.9.5-4.9 3 0 1.6 1.1 2.5 2.6 2.5 1.2 0 2-.4 2.7-1.2.2.4.4.7.9 1.1.1.1.3.1.4 0l1.2-1.1c.1-.1.1-.2-.2-.2Z"
          />
        </Svg>
      );
    default:
      return null;
  }
};

const LETTER: Partial<Record<BrandKey, { char: string; color: string }>> = {
  facebook: { char: 'f', color: '#FFFFFF' },
  netflix: { char: 'N', color: '#E50914' },
  google: { char: 'G', color: '#4285F4' },
  generic: { char: '•', color: '#FFFFFF' },
};

export const BrandMark: React.FC<{ brand: BrandKey; size?: number }> = ({
  brand,
  size = 34,
}) => {
  const letter = LETTER[brand];
  return (
    <View
      style={[
        s.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: BRAND_BG[brand] ?? BRAND_BG.generic,
          borderWidth: brand === 'google' ? 1 : 0,
        },
      ]}
    >
      {letter ? (
        <Text style={{ color: letter.color, fontSize: size * 0.58, fontWeight: '800' }}>
          {letter.char}
        </Text>
      ) : (
        <Glyph brand={brand} size={size} />
      )}
    </View>
  );
};

/** Overlapping brand cluster used beside the portfolio total. */
export const BrandCluster: React.FC<{ brands: BrandKey[]; size?: number }> = ({
  brands,
  size = 26,
}) => (
  <View style={{ flexDirection: 'row' }}>
    {brands.map((b, i) => (
      <View
        key={`${b}-${i}`}
        style={{
          marginLeft: i === 0 ? 0 : -size * 0.32,
          borderRadius: size,
          borderWidth: 2,
          borderColor: '#FFFFFF',
        }}
      >
        <BrandMark brand={b} size={size} />
      </View>
    ))}
  </View>
);

const s = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center', borderColor: '#E6E6EF' },
});
