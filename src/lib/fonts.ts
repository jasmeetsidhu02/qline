import { Fraunces_600SemiBold, Fraunces_700Bold } from '@expo-google-fonts/fraunces';
import {
  SchibstedGrotesk_400Regular,
  SchibstedGrotesk_500Medium,
  SchibstedGrotesk_600SemiBold,
} from '@expo-google-fonts/schibsted-grotesk';
import { useFonts } from 'expo-font';

// Two families, each weight loaded as its own file (React Native cannot pick
// a weight out of one family the way a browser can).
//   Schibsted Grotesk — everything you read
//   Fraunces          — the numbers, which are what this app is about
// Gurmukhi has no font of its own on purpose: the phone's own Punjabi font
// is used instead, which keeps the download small on slow connections.
export function useAppFonts() {
  const [loaded, error] = useFonts({
    SchibstedGrotesk_400Regular,
    SchibstedGrotesk_500Medium,
    SchibstedGrotesk_600SemiBold,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
  });
  // If a font fails to load we still show the app in the system font.
  return loaded || Boolean(error);
}
