/**
 * Candlestick chart for the market screen.
 *
 * Tapping a candle selects it: the column highlights, a tooltip shows that
 * bar's move, and a dashed level line is drawn at its close. Selection is
 * controlled by the parent so the price header can follow it.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Svg, { Rect, Line, G } from 'react-native-svg';
import type { Candle } from '@/types';
import { ui, radii, fmtCompact } from '@/design/tokens';

interface Props {
  candles: Candle[];
  selected: number;
  onSelect: (index: number) => void;
  height?: number;
}

const AXIS_W = 46;
const X_AXIS_H = 34;
const TICKS = 7;

const axisFormat = (v: number) => (Math.abs(v) >= 10000 ? fmtCompact(v) : v.toFixed(2));

export const CandleChart: React.FC<Props> = ({
  candles,
  selected,
  onSelect,
  height = 300,
}) => {
  const [plotW, setPlotW] = useState(0);
  const plotH = height - X_AXIS_H;

  const model = useMemo(() => {
    if (!candles.length) return null;
    const highs = candles.map(c => c.h);
    const lows = candles.map(c => c.l);
    const rawMax = Math.max(...highs);
    const rawMin = Math.min(...lows);
    const pad = (rawMax - rawMin || rawMax * 0.02) * 0.12;
    const max = rawMax + pad;
    const min = Math.max(0, rawMin - pad);
    const span = max - min || 1;

    const ticks = Array.from({ length: TICKS }, (_, i) => max - (span / (TICKS - 1)) * i);
    return { max, min, span, ticks };
  }, [candles]);

  if (!model || !candles.length) return null;

  const { min, span, ticks } = model;
  const toY = (v: number) => (1 - (v - min) / span) * plotH;

  const slot = plotW / candles.length;
  const bodyW = Math.min(18, Math.max(8, slot * 0.42));
  const centerX = (i: number) => slot * i + slot / 2;

  const active = candles[Math.min(selected, candles.length - 1)];
  const activeIdx = Math.min(selected, candles.length - 1);
  const activeMovePct = ((active.c - active.o) / active.o) * 100;
  const tooltipLabel = `${activeMovePct >= 0 ? '+' : '-'}${Math.abs(activeMovePct).toFixed(2)}%`;

  // Keep the tooltip inside the plot even when the first/last candle is picked.
  const tooltipW = 108;
  const tooltipLeft = Math.max(
    0,
    Math.min(plotW - tooltipW, centerX(activeIdx) - tooltipW / 2),
  );

  return (
    <View>
      <View style={{ flexDirection: 'row', height: plotH }}>
        {/* y axis */}
        <View style={[s.axis, { height: plotH }]}>
          {ticks.map(t => {
            const isActive = Math.abs(t - active.c) < span / (TICKS - 1) / 2;
            return (
              <View key={t} style={s.axisRow}>
                {isActive ? (
                  <View style={s.axisPill}>
                    <Text style={s.axisPillText} numberOfLines={1}>
                      {axisFormat(active.c)}
                    </Text>
                  </View>
                ) : (
                  <Text style={s.axisText} numberOfLines={1}>{axisFormat(t)}</Text>
                )}
              </View>
            );
          })}
        </View>

        {/* plot */}
        <View style={{ flex: 1 }} onLayout={e => setPlotW(e.nativeEvent.layout.width)}>
          {plotW > 0 && (
            <>
              <Svg width={plotW} height={plotH}>
                {/* grid */}
                <G>
                  {ticks.map(t => (
                    <Line
                      key={`g-${t}`}
                      x1={0} x2={plotW} y1={toY(t)} y2={toY(t)}
                      stroke={ui.inkRaised} strokeWidth={0.6} opacity={0.5}
                    />
                  ))}
                </G>

                {/* selected column */}
                <Rect
                  x={centerX(activeIdx) - slot * 0.34}
                  y={0}
                  width={slot * 0.68}
                  height={plotH}
                  rx={slot * 0.3}
                  fill="#26262A"
                />

                {/* level line at the selected close */}
                <Line
                  x1={0} x2={plotW} y1={toY(active.c)} y2={toY(active.c)}
                  stroke="#FFFFFF" strokeWidth={1.2} strokeDasharray="2 6" opacity={0.9}
                />

                {/* candles */}
                {candles.map((c, i) => {
                  const up = c.c >= c.o;
                  const yHigh = toY(c.h);
                  const yLow = toY(c.l);
                  const yTop = toY(Math.max(c.o, c.c));
                  const yBottom = toY(Math.min(c.o, c.c));
                  const bodyH = Math.max(bodyW * 0.9, yBottom - yTop);
                  return (
                    <G key={c.t}>
                      <Line
                        x1={centerX(i)} x2={centerX(i)} y1={yHigh} y2={yLow}
                        stroke={ui.wick} strokeWidth={2} strokeLinecap="round"
                      />
                      <Rect
                        x={centerX(i) - bodyW / 2}
                        y={yTop}
                        width={bodyW}
                        height={bodyH}
                        rx={bodyW / 2}
                        fill={up ? ui.candleUp : ui.candleDown}
                      />
                    </G>
                  );
                })}
              </Svg>

              {/* tooltip */}
              <View
                pointerEvents="none"
                style={[
                  s.tooltip,
                  {
                    left: tooltipLeft,
                    width: tooltipW,
                    top: Math.max(0, toY(active.h) - 46),
                  },
                ]}
              >
                <Text style={s.tooltipText}>{tooltipLabel}</Text>
              </View>

              {/* touch targets */}
              <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                <View style={{ flex: 1, flexDirection: 'row' }}>
                  {candles.map((c, i) => (
                    <Pressable
                      key={`hit-${c.t}`}
                      onPress={() => onSelect(i)}
                      style={{ flex: 1 }}
                      accessibilityRole="button"
                      accessibilityLabel={`${c.label}: open ${c.o}, close ${c.c}`}
                    />
                  ))}
                </View>
              </View>
            </>
          )}
        </View>
      </View>

      {/* x axis */}
      <View style={[s.xAxis, { height: X_AXIS_H }]}>
        <View style={{ width: AXIS_W }}>
          <Text style={s.xGroup}>{candles[0].group ?? ''}</Text>
        </View>
        <View style={{ flex: 1, flexDirection: 'row' }}>
          {candles.map((c, i) => (
            <Pressable key={`x-${c.t}`} onPress={() => onSelect(i)} style={s.xCell}>
              {i === activeIdx ? (
                <View style={s.xActive}>
                  <Text style={s.xActiveText}>{c.label}</Text>
                </View>
              ) : (
                <Text style={s.xLabel}>{c.label}</Text>
              )}
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  axis: { width: AXIS_W, justifyContent: 'space-between', paddingRight: 6 },
  axisRow: { height: 16, justifyContent: 'center' },
  axisText: { color: ui.onInkMuted, fontSize: 11, textAlign: 'right' },
  axisPill: {
    backgroundColor: ui.purple,
    borderRadius: radii.pill,
    paddingHorizontal: 7,
    paddingVertical: 3,
    alignSelf: 'flex-end',
  },
  axisPillText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  tooltip: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: radii.lg,
    paddingVertical: 9,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  tooltipText: { color: ui.text, fontSize: 15, fontWeight: '700' },
  xAxis: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  xGroup: { color: ui.onInkMuted, fontSize: 12, letterSpacing: 0.4 },
  xCell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  xLabel: { color: ui.onInkMuted, fontSize: 13 },
  xActive: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: ui.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  xActiveText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});
