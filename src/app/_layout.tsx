import '../global.css';

import { PortalHost } from '@rn-primitives/portal';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { TextClassContext } from '@/components/ui/text';
import { AuthProvider } from '@/lib/auth';
import { useAppFonts } from '@/lib/fonts';
import { I18nProvider } from '@/lib/i18n';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const fontsReady = useAppFonts();

  useEffect(() => {
    if (fontsReady) SplashScreen.hideAsync();
  }, [fontsReady]);

  if (!fontsReady) return null;

  return (
    <SafeAreaProvider>
      <I18nProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          {/* Default type for every Text in the app. */}
          <TextClassContext.Provider value="font-ui text-foreground">
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#EFF1EE' },
                // Moving between the three worlds (landing, staff, customer)
                // is a change of place, not a step forward, so they cross-fade.
                animation: 'fade',
                animationDuration: 260,
              }}
            />
          </TextClassContext.Provider>
          <PortalHost />
        </AuthProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
