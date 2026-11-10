import { router } from 'expo-router';
import { Text } from 'react-native';

import { Button, Card, Muted, Screen } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { isSupabaseConfigured } from '@/lib/supabase';

// Landing screen. In the installed app this is where the barber starts.
// Customers never see it: their QR code opens /s/<shop-slug> directly.
export default function Home() {
  const { t } = useI18n();
  return (
    <Screen title={t('appName')}>
      <Text style={{ fontSize: 18 }}>{t('tagline')}</Text>
      <Button label={t('staffLogin')} onPress={() => router.push('/staff/login')} />
      <Card>
        <Muted>Dev links (remove later)</Muted>
        <Button variant="secondary" label="Customer page: /s/demo" onPress={() => router.push('/s/demo')} />
        <Button variant="secondary" label="Display screen: /display/demo" onPress={() => router.push('/display/demo')} />
        <Muted>Supabase configured: {isSupabaseConfigured ? 'yes' : 'no (add .env)'}</Muted>
      </Card>
    </Screen>
  );
}
