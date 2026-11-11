import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';

// Where the barber starts. Customers never see this: their QR code opens
// /s/<shop-slug> directly.
export default function Home() {
  const { t } = useI18n();
  const [dbStatus, setDbStatus] = useState('');

  useEffect(() => {
    if (!supabase) return setDbStatus('No database connection. Add .env and restart.');
    supabase.rpc('get_public_queue', { p_slug: 'demo' }).then(({ error }) => {
      if (error) setDbStatus(`Database error: ${error.message}`);
    });
  }, []);

  return (
    <Screen>
      <View className="gap-3 pt-10">
        <Text className="font-num-b text-[56px] leading-[60px] tracking-[-1.5px]">QLine</Text>
        <Text className="max-w-[300px] text-[17px] leading-[25px] text-muted-foreground">{t('tagline')}</Text>
      </View>

      <Button size="xl" onPress={() => router.push('/staff/login')}>
        <Text>{t('staffLogin')}</Text>
      </Button>

      {dbStatus ? <Text className="text-[13px] text-destructive">{dbStatus}</Text> : null}

      <Pressable onPress={() => router.push('/s/demo')} className="py-2 active:opacity-60">
        <Text className="text-[14px] text-muted-foreground underline">{t('seeCustomerView')}</Text>
      </Pressable>
    </Screen>
  );
}
