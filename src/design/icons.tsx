/**
 * Line icons for the consumer UI. Everything is SVG so nothing depends on a
 * bundled icon font — see the "fonts not bundled" note in the README.
 */
import React from 'react';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';

export interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

const Base: React.FC<IconProps & { children: React.ReactNode }> = ({
  size = 22,
  color = '#0D0D14',
  strokeWidth = 1.9,
  children,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </Svg>
);

export const ChevronLeft: React.FC<IconProps> = p => (
  <Base {...p}><Path d="M15 5 8 12l7 7" /></Base>
);

export const Bell: React.FC<IconProps> = p => (
  <Base {...p}>
    <Path d="M18 15.5V10a6 6 0 1 0-12 0v5.5L4.4 17.6a.6.6 0 0 0 .5.9h14.2a.6.6 0 0 0 .5-.9L18 15.5Z" />
    <Path d="M9.8 21.2a2.4 2.4 0 0 0 4.4 0" />
  </Base>
);

export const Search: React.FC<IconProps> = p => (
  <Base {...p}><Circle cx="11" cy="11" r="6.4" /><Path d="m20 20-3.6-3.6" /></Base>
);

export const ArrowUpRight: React.FC<IconProps> = p => (
  <Base {...p}><Path d="M7 17 17 7" /><Path d="M8.5 7H17v8.5" /></Base>
);

export const ArrowDownRight: React.FC<IconProps> = p => (
  <Base {...p}><Path d="M7 7l10 10" /><Path d="M17 8.5V17H8.5" /></Base>
);

export const HomeIcon: React.FC<IconProps> = p => (
  <Base {...p}>
    <Path d="M4 10.6 12 4l8 6.6V19a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 19v-8.4Z" />
  </Base>
);

/** Solid variant used inside the active tab pill. */
export const HomeIconSolid: React.FC<IconProps> = ({ size = 22, color = '#fff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M11.35 3.3a1 1 0 0 1 1.3 0l7.4 6.35a1 1 0 0 1 .35.76V19a2 2 0 0 1-2 2h-3.6v-5.1h-3.6V21H7.6a2 2 0 0 1-2-2v-8.59a1 1 0 0 1 .35-.76l7.4-6.35Z" />
  </Svg>
);

export const ChartIcon: React.FC<IconProps> = p => (
  <Base {...p}>
    <Rect x="3.4" y="4.4" width="17.2" height="15.2" rx="3.2" />
    <Path d="m7 15 3.2-3.8 2.6 2.2L17 8.4" />
  </Base>
);

export const UserIcon: React.FC<IconProps> = p => (
  <Base {...p}>
    <Circle cx="12" cy="8.4" r="3.9" />
    <Path d="M4.6 20.2a7.6 7.6 0 0 1 14.8 0" />
  </Base>
);

export const CheckIcon: React.FC<IconProps> = p => (
  <Base {...p}><Path d="m5 12.6 4.4 4.4L19 7.4" /></Base>
);

export const CloseIcon: React.FC<IconProps> = p => (
  <Base {...p}><Path d="M6 6l12 12M18 6 6 18" /></Base>
);

export const ChevronRight: React.FC<IconProps> = p => (
  <Base {...p}><Path d="m9 5 7 7-7 7" /></Base>
);

export const LockIcon: React.FC<IconProps> = p => (
  <Base {...p}>
    <Rect x="5" y="10.6" width="14" height="10" rx="2.4" />
    <Path d="M8 10.6V7.8a4 4 0 0 1 8 0v2.8" />
  </Base>
);

export const BookmarkIcon: React.FC<IconProps> = p => (
  <Base {...p}><Path d="M6 3.6h12v16.8l-6-4.4-6 4.4V3.6Z" /></Base>
);

/** Solid variant used inside the active tab pill. */
export const BookmarkIconSolid: React.FC<IconProps> = ({ size = 22, color = '#fff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M6 3.6h12v16.8l-6-4.4-6 4.4V3.6Z" />
  </Svg>
);

/** The seated-investor illustration on the onboarding screen. */
export const WealthIllustration: React.FC<{ width?: number; height?: number }> = ({
  width = 300,
  height = 210,
}) => (
  <Svg width={width} height={height} viewBox="0 0 300 210" fill="none">
    {/* rising arrow — the anchor of the composition */}
    <G>
      <Path
        d="M18 186 62 96l30 44 34-84 30 62 33-70"
        stroke="#6C4DF6" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round"
      />
      <Path d="m173 22 28 6-8 27" stroke="#6C4DF6" strokeWidth="12"
        strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M14 190h268" stroke="#6C4DF6" strokeWidth="4" strokeLinecap="round" />
    </G>

    {/* seated figure, line-art */}
    <G stroke="#0D0D14" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <Path d="M96 190h74" />
      <Path d="M104 190c-6-16 0-31 14-38" />
      <Path d="M118 152c14-6 30-4 40 6l14 14" />
      <Path d="M118 152c-4-16 2-30 16-36" />
      <Path d="M134 116c10-4 22 0 27 9l9 17" />
      <Path d="M170 142c8 4 12 10 12 18" />
      <Path d="M154 96c9-9 24-8 32 2 8 10 6 24-4 31" />
      <Path d="M182 129c-9 6-21 5-28-3" />
      <Path d="M186 74c8-6 19-3 22 6 3 9-3 17-12 18" />
      <Rect x="196" y="86" width="17" height="27" rx="4" />
      <Path d="M199 108h11" />
    </G>

    {/* the check pattern on the figure's top, echoing the reference */}
    <G stroke="#6C4DF6" strokeWidth="2" opacity={0.75}>
      <Path d="M140 112v34M152 108v40M164 112v36" />
      <Path d="M132 122h40M132 134h44M134 146h40" />
    </G>
  </Svg>
);
