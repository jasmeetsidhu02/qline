import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Numeral } from '@/components/numeral';
import { Text } from '@/components/ui/text';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';

type PublicQueue = {
  shop_name: string;
  is_open: boolean;
  serving: { ticket_no: number; name: string }[];
  waiting: { ticket_no: number; name: string }[];
};

// For a tablet or TV on the shop wall. Open it full screen in a browser.
export default function DisplayScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t } = useI18n();
  const [queue, setQueue] = useState<PublicQueue | null>(null);

  useEffect(() => {
    if (!supabase || !slug) return;
    const client = supabase;
    const load = async () => {
      const { data } = await client.rpc('get_public_queue', { p_slug: slug });
      if (data) setQueue(data as PublicQueue);
    };
    load();
    const timer = setInterval(load, 10_000);
    return () => clearInterval(timer);
  }, [slug]);

  const serving = queue?.serving ?? [];
  const waiting = queue?.waiting ?? [];

  return (
    <View className="flex-1 items-center justify-center gap-10 bg-ink px-10 py-12 lg:gap-16">
      <Text className="font-ui-md text-[20px] text-background/50 lg:text-[30px]">{queue?.shop_name ?? ''}</Text>

      <View className="items-center gap-3">
        <Text className="font-ui-md text-[22px] text-brass-soft lg:text-[34px]">{t('nowServing')}</Text>
        <View className="flex-row flex-wrap items-center justify-center gap-10">
          {serving.length === 0 ? (
            <Text className="py-10 text-[28px] text-background/40 lg:py-20 lg:text-[44px]">{t('chairFree')}</Text>
          ) : (
            serving.map((e) => (
              <View key={e.ticket_no} className="items-center gap-1">
                <Numeral className="text-[140px] leading-[150px] text-background lg:text-[300px] lg:leading-[310px]">
                  {e.ticket_no}
                </Numeral>
                <Text className="text-[22px] text-background/60 lg:text-[36px]">{e.name}</Text>
              </View>
            ))
          )}
        </View>
      </View>

      {waiting.length > 0 ? (
        <View className="items-center gap-3">
          <Text className="font-ui-md text-[18px] text-background/40 lg:text-[26px]">{t('nextUp')}</Text>
          <View className="flex-row flex-wrap justify-center gap-6">
            {waiting.slice(0, 6).map((e) => (
              <Numeral key={e.ticket_no} size="md" className="text-background/70 lg:text-[64px] lg:leading-[70px]">
                {e.ticket_no}
              </Numeral>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}
