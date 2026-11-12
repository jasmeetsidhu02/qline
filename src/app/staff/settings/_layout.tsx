import { Stack } from 'expo-router';

// Settings and its sub-screens. Kept in their own stack so the parent only
// has to know about "settings".
export default function SettingsLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#EFF1EE' } }} />;
}
