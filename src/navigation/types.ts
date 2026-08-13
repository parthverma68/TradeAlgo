import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type {
  NativeStackNavigationProp, NativeStackScreenProps,
} from '@react-navigation/native-stack';

export type MainTabParamList = {
  Home: undefined;
  Markets: undefined;
  Portfolio: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Main: undefined;
  MarketDetail: { symbol: string };
  /* analytics surface, reachable from Profile */
  Dashboard: undefined;
  Chain: undefined;
  Futures: undefined;
  News: undefined;
  Alerts: undefined;
  Watchlist: undefined;
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
