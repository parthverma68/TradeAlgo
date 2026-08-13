import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type {
  NativeStackNavigationProp, NativeStackScreenProps,
} from '@react-navigation/native-stack';
import type { MarketKey, SectorKey } from '@/types';

export type MainTabParamList = {
  Home: undefined;
  Markets: undefined;
  Watchlist: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Main: undefined;
  /* market -> industry -> share confidence flow */
  Industry: { market: MarketKey; sector: SectorKey };
  MarketDetail: { symbol: string };
  Subscription: undefined;
  /* index analytics surface (NIFTY/BANKNIFTY F&O terminal), reachable from Profile */
  Dashboard: undefined;
  Chain: undefined;
  Futures: undefined;
  News: undefined;
  Alerts: undefined;
  Settings: undefined;
};

export type RootScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

/**
 * Navigation prop for a screen inside the tabs: can switch tabs *and* push
 * onto the root stack.
 */
export type TabNav<T extends keyof MainTabParamList> = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, T>,
  NativeStackNavigationProp<RootStackParamList>
>;
