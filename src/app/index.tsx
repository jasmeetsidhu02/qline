import { router } from 'expo-router';
import { ArrowRight, Scissors } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Screen, SectionLabel } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';

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
      else if (!data) setDbStatus('connected, no "demo" shop yet');
      else setDbStatus(`connected ✓ ${data.shop_name}: ${data.waiting.length} waiting`);
    });
  }, []);

  return (
    <Screen>
      <View className="gap-5 pt-8">
        <View className="h-14 w-14 items-center justify-center rounded-2xl bg-primary">
          <Scissors size={26} color="#ffffff" />
        </View>
        <View className="gap-2">
          <Text className="text-4xl font-semibold tracking-tight">{t('appName')}</Text>
          <Text className="text-lg text-muted-foreground">{t('tagline')}</Text>
        </View>
      </View>

      <Button size="xl" onPress={() => router.push('/staff/login')}>
        <Text>{t('staffLogin')}</Text>
        <ArrowRight size={18} color="#ffffff" />
      </Button>

      <Separator />

      <View className="gap-3">
        <SectionLabel>Dev links</SectionLabel>
        <Card className="py-2">
          <CardContent className="gap-1 px-2">
            <Button variant="ghost" className="justify-between" onPress={() => router.push('/s/demo')}>
              <Text>Customer page</Text>
              <Text className="text-muted-foreground">/s/demo</Text>
            </Button>
            <Button variant="ghost" className="justify-between" onPress={() => router.push('/display/demo')}>
              <Text>Display screen</Text>
              <Text className="text-muted-foreground">/display/demo</Text>
            </Button>
          </CardContent>
        </Card>
        <Text className="text-sm text-muted-foreground">Database: {dbStatus}</Text>
      </View>
    </Screen>
  );
}
