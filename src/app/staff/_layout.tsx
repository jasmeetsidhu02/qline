import { Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@/lib/auth';

// Decides which staff screens exist right now:
//   logged out            → only /staff/login
//   logged in, no shop    → only /staff/create-shop
//   logged in, has shop   → dashboard + settings
// If you open a screen you're not allowed on, Expo Router sends you to
// that group's redirectTo. (This is a UI convenience only; the real
// security is the RLS rules in the database.)
export default function StaffLayout() {
  const { session, shop, loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }

  const loggedIn = Boolean(session);
  const hasShop = Boolean(shop);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#ffffff' } }}>
      <Stack.Protected guard={!loggedIn} redirectTo={hasShop ? '/staff/dashboard' : '/staff/create-shop'}>
        <Stack.Screen name="login" />
      </Stack.Protected>

      <Stack.Protected guard={loggedIn && !hasShop} redirectTo={loggedIn ? '/staff/dashboard' : '/staff/login'}>
        <Stack.Screen name="create-shop" />
      </Stack.Protected>

      <Stack.Protected guard={loggedIn && hasShop} redirectTo={loggedIn ? '/staff/create-shop' : '/staff/login'}>
        <Stack.Screen name="dashboard" />
        <Stack.Screen name="settings" />
      </Stack.Protected>
    </Stack>
  );
}
