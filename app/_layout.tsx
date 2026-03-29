import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const segments = useSegments();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // 1. Check if a session cookie exists
        const session = await SecureStore.getItemAsync('frappe_session');
        
        // 2. Check if the user is currently looking at the login page
        const inAuthGroup = segments[0] === 'login';

        if (!session && !inAuthGroup) {
          // No session found? Force them to login
          router.replace('/login');
        } else if (session && inAuthGroup) {
          // Already have a session but on login page? Skip to dashboard
          router.replace('/(tabs)');
        }
      } catch (e) {
        console.error("Auth check failed", e);
      } finally {
        setIsReady(true);
      }
    };

    checkAuth();
  }, [segments]); // Re-run when the route changes

  // Show a loading spinner while checking the session
  if (!isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Define your screens here */}
        <Stack.Screen name="login" /> 
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}