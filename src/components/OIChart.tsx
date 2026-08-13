import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Line } from 'react-native-svg';
import { colors, font } from '@/theme';
import type { ChainRow } from '@/types';

interface Props { rows: ChainRow[]; maxPain: number; height?: number; }

/** Grouped call/put OI bars by strike, with a Max Pain reference line. */
export const OIChart: React.FC<Props> = ({ rows, maxPain, height = 180 }) => {
  const W = 340, pad = 4;
  const maxOi = Math.max(...rows.flatMap((r) => [r.callOi, r.putOi]), 1);
  const slot = W / rows.length;
  const bw = Math.max(3, slot / 2 - 2);
  const mpIndex = rows.findIndex((r) => r.strike === maxPain);

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`}>
        {rows.map((r, i) => {
          const x = i * slot + pad;
          const ph = (r.putOi / maxOi) * (height - 18);
          const ch = (r.callOi / maxOi) * (height - 18);
          return (
            <React.Fragment key={r.strike}>
              <Rect x={x} y={height - 14 - ph} width={bw} height={ph} rx={2} fill={colors.green} />
              <Rect x={x + bw + 1} y={height - 14 - ch} width={bw} height={ch} rx={2} fill={colors.red} />
            </React.Fragment>
          );
        })}
        {mpIndex >= 0 && (
          <Line
            x1={mpIndex * slot + slot / 2} y1={0}
            x2={mpIndex * slot + slot / 2} y2={height - 14}
            stroke={colors.amber} strokeWidth={1.5} strokeDasharray="4,3"
          />
        )}
      </Svg>
      <View style={s.axis}>
        <Text style={s.tick}>{rows[0]?.strike.toLocaleString()}</Text>
        <Text style={[s.tick, { color: colors.amber }]}>MP {maxPain.toLocaleString()}</Text>
        <Text style={s.tick}>{rows[rows.length - 1]?.strike.toLocaleString()}</Text>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  tick: { color: colors.dim, fontSize: 10, fontFamily: font.mono },
});
