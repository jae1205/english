import {
  useFonts,
  Lexend_400Regular,
  Lexend_500Medium,
  Lexend_600SemiBold,
  Lexend_700Bold,
} from '@expo-google-fonts/lexend';
import { ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { AuthGate } from '@/components/auth';
import { AnkiDarkTheme, AnkiLightTheme } from '@/constants/navigation-theme';
import { useColorScheme } from '@/hooks';
import { DatabaseProvider } from '@/lib/db';

// Prevent splash screen from auto-hiding until fonts are loaded
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts({
    Lexend_400Regular,
    Lexend_500Medium,
    Lexend_600SemiBold,
    Lexend_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Show nothing while fonts are loading
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <AuthGate>
      <DatabaseProvider>
        <ThemeProvider value={colorScheme === 'dark' ? AnkiDarkTheme : AnkiLightTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="study" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: false }} />
          </Stack>
          <StatusBar style="light" />
        </ThemeProvider>
      </DatabaseProvider>
    </AuthGate>
  );
}
