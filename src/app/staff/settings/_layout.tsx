import { Stack } from 'expo-router';

// Settings and its sub-screens. Kept in their own stack so the parent only
// has to know about "settings".
export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#EFF1EE' },
        // Going into a setting and back out is a push, so it slides.
        animation: 'slide_from_right',
        animationDuration: 260,
      }}
    />
  );
}
