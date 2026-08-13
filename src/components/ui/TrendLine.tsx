/**
 * The small smoothed price line on the stock cards — dashed baseline, curved
 * path, dot on the latest point.
 */
import React from 'react';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { ui } from '@/design/tokens';

export interface TrendLineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  /** Draw the dashed mean line behind the series. */
  baseline?: boolean;
  strokeWidth?: number;
  /** Show the filled dot at the last point. */
  endDot?: boolean;
}

/**
 * Catmull-Rom → cubic bezier. Keeps the line curvy without overshooting the
 * data the way a naive quadratic smoother does.
 */
export function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length < 3) {
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');
  }
  let d = `M${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

export const TrendLine: React.FC<TrendLineProps> = ({
  data,
  width = 240,
  height = 56,
  color = ui.text,
  baseline = true,
  strokeWidth = 1.8,
  endDot = true,
}) => {
  if (!data?.length) return null;

  const pad = 6;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const stepX = width / Math.max(1, data.length - 1);
  const toY = (v: number) => pad + (1 - (v - min) / span) * (height - pad * 2);

  const points = data.map((v, i) => ({ x: i * stepX, y: toY(v) }));
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const last = points[points.length - 1];

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      {baseline && (
        <Line
          x1={0} y1={toY(mean)} x2={width - 4} y2={toY(mean)}
          stroke={ui.textFaint} strokeWidth={1} strokeDasharray="3 4"
        />
      )}
      <Path
        d={smoothPath(points)}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {endDot && <Circle cx={last.x} cy={last.y} r={3.4} fill={color} />}
    </Svg>
  );
};
