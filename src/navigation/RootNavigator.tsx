import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '@/screens/HomeScreen';
import MarketsScreen from '@/screens/MarketsScreen';
import PortfolioScreen from '@/screens/PortfolioScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import MarketDetailScreen from '@/screens/MarketDetailScreen';
import OnboardingScreen from '@/screens/OnboardingScreen';
import LoginScreen from '@/screens/LoginScreen';

/* analytics surface — reachable from Profile */
import DashboardScreen from '@/screens/DashboardScreen';
import OptionChainScreen from '@/screens/OptionChainScreen';
import FuturesScreen from '@/screens/FuturesScreen';
import NewsScreen from '@/screens/NewsScreen';
import AlertsScreen from '@/screens/AlertsScreen';
import WatchlistScreen from '@/screens/WatchlistScreen';
import SettingsScreen from '@/screens/SettingsScreen';

import { FloatingTabBar } from '@/components/ui/FloatingTabBar';
import { useAppSelector } from '@/store';
import { ui } from '@/design/tokens';
import { colors } from '@/theme';
import type { MainTabParamList, RootStackParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: ui.screenBottom,
    card: ui.card,
    text: ui.text,
    border: ui.hairline,
    primary: ui.purple,
    notification: ui.red,
  },
};

/** Header styling for the dark analytics screens pushed above the tabs. */
const analyticsOptions = {
  headerStyle: { backgroundColor: colors.bg },
  headerTitleStyle: { color: colors.text, fontSize: 15 },
  headerTintColor: colors.blue,
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.bg },
};

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      sceneContainerStyle={{ backgroundColor: 'transparent' }}
      tabBar={props => <FloatingTabBar {...props} />}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Markets" component={MarketsScreen} />
      <Tab.Screen name="Portfolio" component={PortfolioScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const token = useAppSelector(s => s.auth.token);
  const onboarded = useAppSelector(s => s.settings.onboarded);

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!onboarded ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : !token ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={Tabs} />
            <Stack.Screen
              name="MarketDetail"
              component={MarketDetailScreen}
              options={{ animation: 'slide_from_right' }}
            />

            <Stack.Group screenOptions={{ ...analyticsOptions, headerShown: true }}>
              <Stack.Screen name="Dashboard" component={DashboardScreen} />
              <Stack.Screen name="Chain" component={OptionChainScreen} options={{ title: 'Option Chain' }} />
              <Stack.Screen name="Futures" component={FuturesScreen} />
              <Stack.Screen name="News" component={NewsScreen} />
              <Stack.Screen name="Alerts" component={AlertsScreen} />
              <Stack.Screen name="Watchlist" component={WatchlistScreen} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
            </Stack.Group>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
