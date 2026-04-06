import { Tabs, usePathname, useRouter } from 'expo-router';
import React, { useRef } from 'react';
import { DeviceEventEmitter, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/Styles';

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets(); // 🔥 KEY FIX

  const lastTap = useRef<{ [key: string]: number }>({});

  const handleTabPress = (name: string, eventName: string) => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;

    const route = name === 'index' ? '/' : `/${name}`;
    router.push(route);

    const isAlreadyOnTab = pathname === route;

    if (isAlreadyOnTab) {
      if (lastTap.current[name] && now - lastTap.current[name] < DOUBLE_PRESS_DELAY) {
        DeviceEventEmitter.emit(eventName);
      }
    }

    lastTap.current[name] = now;
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.tint,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarButton: HapticTab,

        // 🔥 PRODUCTION FIX
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
          paddingBottom: insets.bottom, // 👈 dynamic
          height: 60 + insets.bottom,   // 👈 dynamic height
        },
      }}
    >
      <Tabs.Screen
        name="index"
        listeners={{
          tabPress: () => handleTabPress('index', 'RESET_HOME_VIEW'),
        }}
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="house.fill" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        listeners={{
          tabPress: () => handleTabPress('explore', 'RESET_EXPLORE_VIEW'),
        }}
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="paperplane.fill" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="InventoryReport"
        listeners={{
          tabPress: () =>
            handleTabPress('InventoryReport', 'RESET_INVENTORY_VIEW'),
        }}
        options={{
          title: 'Audit',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="shippingbox.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}