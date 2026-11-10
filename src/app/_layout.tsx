import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { I18nProvider } from '@/lib/i18n';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }} />
      </I18nProvider>
    </SafeAreaProvider>
  );
}
