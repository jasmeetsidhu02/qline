import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { Button, Card, Muted, Screen } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

// Landing screen. In the installed app this is where the barber starts.
// Customers never see it: their QR code opens /s/<shop-slug> directly.
export default function Home() {
  const { t } = useI18n();
  const [dbStatus, setDbStatus] = useState('checking…');

  // M1 connection check: calls the get_public_queue function for the demo shop.
  useEffect(() => {
    if (!supabase) {
      setDbStatus('not configured (add .env)');
      return;
    }
    supabase.rpc('get_public_queue', { p_slug: 'demo' }).then(({ data, error }) => {
      if (error) setDbStatus(`error: ${error.message}`);
      else if (!data) setDbStatus('connected, but no "demo" shop yet');
      else setDbStatus(`connected ✓ ${data.shop_name}: ${data.waiting.length} waiting`);
    });
  }, []);

  return (
    <Screen title={t('appName')}>
      <Text style={{ fontSize: 18 }}>{t('tagline')}</Text>
      <Button label={t('staffLogin')} onPress={() => router.push('/staff/login')} />
      <Card>
        <Muted>Dev links (remove later)</Muted>
        <Button variant="secondary" label="Customer page: /s/demo" onPress={() => router.push('/s/demo')} />
        <Button variant="secondary" label="Display screen: /display/demo" onPress={() => router.push('/display/demo')} />
        <Muted>Database: {isSupabaseConfigured ? dbStatus : 'not configured (add .env)'}</Muted>
      </Card>
    </Screen>
  );
}
