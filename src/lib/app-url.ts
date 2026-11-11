import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Where a customer's phone has to go to reach this app:
//   1. EXPO_PUBLIC_APP_URL from .env (your Vercel address, once deployed)
//   2. in a browser: whatever address this page is open on
//   3. in Expo Go: your computer's address on the Wi-Fi
export function appBaseUrl(): string {
  const fixed = process.env.EXPO_PUBLIC_APP_URL;
  if (fixed) return fixed.replace(/\/$/, '');
  if (Platform.OS === 'web' && typeof window !== 'undefined') return window.location.origin;
  const host = Constants.expoConfig?.hostUri; // e.g. "192.168.1.5:8081"
  return host ? `http://${host}` : '';
}

export function customerUrl(slug: string) {
  return `${appBaseUrl()}/s/${slug}`;
}

// Short form for showing in the interface: no scheme, no trailing slash.
export function prettyBaseUrl() {
  return appBaseUrl().replace(/^https?:\/\//, '') || 'qline';
}
