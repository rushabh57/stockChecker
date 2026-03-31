import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DeviceEventEmitter } from 'react-native';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            // When user taps Home icon
            DeviceEventEmitter.emit('RESET_HOME_VIEW');
          },
        })}
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            // Emit a specific event for the Purchase Note screen
            DeviceEventEmitter.emit('RESET_EXPLORE_VIEW');
          },
        })}
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="note.text" color={color} />,
        }}
      />
    </Tabs>
  );
}
