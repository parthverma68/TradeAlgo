/**
 * The floating dark tab bar: a rounded black pill with a purple capsule that
 * expands, with a label, around the active tab.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  HomeIconSolid, HomeIcon, ChartIcon, BriefcaseIcon, UserIcon, IconProps,
} from '@/design/icons';
import { ui, radii, gap, shadow } from '@/design/tokens';

type IconCmp = React.FC<IconProps>;

const ICONS: Record<string, { inactive: IconCmp; active: IconCmp }> = {
  Home: { inactive: HomeIcon, active: HomeIconSolid },
  Markets: { inactive: ChartIcon, active: ChartIcon },
  Portfolio: { inactive: BriefcaseIcon, active: BriefcaseIcon },
  Profile: { inactive: UserIcon, active: UserIcon },
};

export const FloatingTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[s.wrap, { paddingBottom: Math.max(insets.bottom, gap.md) }]}
      pointerEvents="box-none"
    >
      <View style={s.bar}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const label = (options.title ?? route.name) as string;
          const set = ICONS[route.name] ?? ICONS.Home;
          const Icon = focused ? set.active : set.inactive;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              style={[s.item, focused && s.itemActive]}
            >
              <Icon size={22} color={focused ? '#FFFFFF' : ui.onInkMuted} />
              {focused && <Text style={s.label}>{label}</Text>}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: gap.xl,
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: ui.ink,
    borderRadius: radii.pill,
    padding: 7,
    width: '100%',
    ...shadow.floating,
  },
  item: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: radii.pill,
  },
  itemActive: { backgroundColor: ui.purple, flex: 1.55 },
  label: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', marginLeft: gap.sm },
});
