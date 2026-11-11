import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Platform, Pressable, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { SectionLabel } from '@/components/screen';
import { Text } from '@/components/ui/text';
import { useI18n } from '@/lib/i18n';

// Works out the address a customer's phone must open: http(s)://<host>/s/<slug>
//   1. EXPO_PUBLIC_APP_URL in .env (your Vercel address, once deployed)
//   2. In the browser: whatever address this dashboard is open on
//   3. In Expo Go: your Mac's address on the Wi-Fi (the dev server)
function customerUrl(slug: string) {
  const path = `/s/${slug}`;
  const fixed = process.env.EXPO_PUBLIC_APP_URL;
  if (fixed) return fixed.replace(/\/$/, '') + path;
  if (Platform.OS === 'web' && typeof window !== 'undefined') return window.location.origin + path;
  const host = Constants.expoConfig?.hostUri; // e.g. "192.168.1.5:8081"
  return host ? `http://${host}${path}` : path;
}

// The shop's QR code. Scan it with any phone camera to open the join page.
// M7 turns this into a printable poster for the shop wall.
export function CustomerLinkCard({ slug }: { slug: string }) {
  const { t } = useI18n();
  const url = customerUrl(slug);
  const isLocalhost = /\/\/(localhost|127\.0\.0\.1)/.test(url);

  return (
    <View className="gap-4 rounded-2xl border border-border bg-card p-5">
      <View className="gap-1">
        <SectionLabel>{t('customerQr')}</SectionLabel>
        <Text className="text-sm text-muted-foreground">{t('customerQrHint')}</Text>
      </View>

      {/* Tapping the QR also opens the customer page, handy when testing on one device. */}
      <Pressable
        role="button"
        accessibilityLabel={t('customerQr')}
        onPress={() => (Platform.OS === 'web' ? window.open(`/s/${slug}`, '_blank') : router.push(`/s/${slug}`))}
        className="items-center self-center rounded-2xl border border-border bg-white p-4 active:opacity-80">
        <QRCode value={url} size={200} color="#18181b" backgroundColor="#ffffff" ecl="M" />
      </Pressable>

      <Text className="text-center text-sm text-muted-foreground" selectable>
        {url}
      </Text>

      {isLocalhost ? (
        <View className="rounded-xl bg-amber-500/10 px-4 py-3">
          <Text className="text-sm text-amber-700">{t('qrLocalhostWarning')}</Text>
        </View>
      ) : null}
    </View>
  );
}
