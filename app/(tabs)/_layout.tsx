  import { Tabs, usePathname, useRouter } from 'expo-router';
import React, { useRef } from 'react';
import { DeviceEventEmitter, useColorScheme } from 'react-native';

  import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/Styles';

  export default function TabLayout() {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const pathname = usePathname();
    const router = useRouter(); // <--- Add this
    
    const lastTap = useRef<{ [key: string]: number }>({});

    const handleTabPress = (name: string, eventName: string) => {
      const now = Date.now();
      const DOUBLE_PRESS_DELAY = 300;
      
      // 1. Force Redirect: Ensure clicking always hits the main route
      // This handles the "redirect us to its respected main page" requirement
      router.push(name === 'index' ? '/' : `/${name}`);

      // 2. Double Click Logic: Handle state resets (optional but useful)
      const isAlreadyOnTab = pathname === (name === 'index' ? '/' : `/${name}`);
      
      if (isAlreadyOnTab) {
        if (lastTap.current[name] && (now - lastTap.current[name]) < DOUBLE_PRESS_DELAY) {
          DeviceEventEmitter.emit(eventName);
        }
      }
      lastTap.current[name] = now;
    };

    return (
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: theme.tint,
          tabBarInactiveTintColor: theme.textMuted,
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarStyle: {
            backgroundColor: theme.background,
            borderTopColor: theme.border,
            height: 60,
            paddingBottom: 8,
          },
        }}>
        
        <Tabs.Screen
          name="index"
          listeners={{
            tabPress: (e) => {
              // Prevent default if you want full control, otherwise leave it
              handleTabPress('index', 'RESET_HOME_VIEW');
            },
          }}
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <IconSymbol size={24} name="house.fill" color={color} />,
          }}
        />

        <Tabs.Screen
          name="explore"
          listeners={{
            tabPress: () => handleTabPress('explore', 'RESET_EXPLORE_VIEW'),
          }}
          options={{
            title: 'Explore',
            tabBarIcon: ({ color }) => <IconSymbol size={24} name="paperplane.fill" color={color} />,
          }}
        />

        <Tabs.Screen
          // Ensure this matches your file: inventoryReport.tsx or InventoryReport.tsx
          name="InventoryReport" 
          listeners={{
            tabPress: () => handleTabPress('InventoryReport', 'RESET_INVENTORY_VIEW'),
          }}
          options={{
            title: 'Audit',
            tabBarIcon: ({ color }) => <IconSymbol size={24} name="shippingbox.fill" color={color} />,
          }}
        />
      </Tabs>
    );
  }