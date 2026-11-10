import { Stack } from 'expo-router';

// M2 adds an auth guard here: no session -> redirect to /staff/login.
export default function StaffLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
