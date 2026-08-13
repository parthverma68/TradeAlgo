import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DashboardScreen from '@/screens/DashboardScreen';
import OptionChainScreen from '@/screens/OptionChainScreen';
import FuturesScreen from '@/screens/FuturesScreen';
import NewsScreen from '@/screens/NewsScreen';
import AlertsScreen from '@/screens/AlertsScreen';
import WatchlistScreen from '@/screens/WatchlistScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import LoginScreen from '@/screens/LoginScreen';
import { useAppSelector } from '@/store';
import { colors, font } from '@/theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const navTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg, card: colors.panel, text: colors.text,
    border: colors.border, primary: colors.blue, notification: colors.red,
  },
};

const icon = (glyph: string) => ({ color }: { color: string }) => (
  <Text style={{ color, fontSize: 16 }}>{glyph}</Text>
);

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTitleStyle: { color: colors.text, fontFamily: font.sansBold, fontSize: 15 },
        headerShadowVisible: false,
        tabBarStyle: { backgroundColor: colors.panel, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: colors.dim,
        tabBarLabelStyle: { fontFamily: font.sans, fontSize: 10 },
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen}
        options={{ tabBarIcon: icon('◈') }} />
      <Tab.Screen name="Chain" component={OptionChainScreen}
        options={{ title: 'Option Chain', tabBarIcon: icon('▤') }} />
      <Tab.Screen name="Futures" component={FuturesScreen}
        options={{ tabBarIcon: icon('⇅') }} />
      <Tab.Screen name="News" component={NewsScreen}
        options={{ tabBarIcon: icon('◫') }} />
      <Tab.Screen name="Alerts" component={AlertsScreen}
        options={{ tabBarIcon: icon('◉') }} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const token = useAppSelector((s) => s.auth.token);

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTitleStyle: { color: colors.text, fontFamily: font.sansBold, fontSize: 15 },
          headerTintColor: colors.blue,
          headerShadowVisible: false,
        }}
      >
        {!token ? (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen name="Main" component={Tabs} options={{ headerShown: false }} />
            <Stack.Screen name="Watchlist" component={WatchlistScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
