import React from 'react';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

interface Props { data: number[]; color: string; width?: number; height?: number; }

export const Sparkline: React.FC<Props> = ({ data, color, width = 300, height = 60 }) => {
  if (!data?.length) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const step = width / Math.max(1, data.length - 1);
  const pts = data.map((v, i) => [i * step, height - ((v - min) / span) * (height - 6) - 3]);
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${line} L ${width} ${height} L 0 ${height} Z`;

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <LinearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.35} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={area} fill="url(#spark)" />
      <Path d={line} stroke={color} strokeWidth={2} fill="none" />
    </Svg>
  );
};
