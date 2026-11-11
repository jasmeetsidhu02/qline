import { router, useLocalSearchParams } from 'expo-router';
import { Clock, MapPinOff, Scissors } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Field, FormMessage } from '@/components/form';
import { Screen } from '@/components/screen';
import { StatusBlock } from '@/components/status-block';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { errorKey } from '@/lib/errors';
import { StringKey, useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { loadTicket, saveTicket } from '@/lib/ticket-storage';

type ShopInfo = { id: string; name: string; is_open: boolean };

// Customer join page. The shop's QR code points here: https://<domain>/s/<shop-slug>
export default function JoinQueue() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t } = useI18n();
  const [shop, setShop] = useState<ShopInfo | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'notFound'>('loading');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase || !slug) return;
    const client = supabase;
    let alive = true;
    (async () => {
      // 1) Already holding a live ticket for this shop? Go straight to it.
      const token = await loadTicket(slug);
      if (token) {
        const { data } = await client.rpc('get_my_status', { p_token: token });
        if (data && (data.status === 'waiting' || data.status === 'serving')) {
          router.replace(`/s/${slug}/ticket`);
          return;
        }
      }
      // 2) Load the shop's public info. RLS policy "shops_read_all" allows this
      //    for anyone, and the shops table holds nothing private.
      const { data } = await client.from('shops').select('id, name, is_open').eq('slug', slug).maybeSingle();
      if (!alive) return;
      if (!data) setState('notFound');
      else {
        setShop(data as ShopInfo);
        setState('ready');
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  const canJoin = name.trim().length > 0 && /^\d{10}$/.test(phone) && !busy;

  async function join() {
    if (!supabase) return setError(t('errNotConfigured'));
    setBusy(true);
    setError(null);
    const { data, error } = await supabase.rpc('join_queue', { p_slug: slug, p_name: name.trim(), p_phone: phone });
    if (error) {
      // 'ALREADY_IN_QUEUE:7' → tell them their number.
      const already = error.message?.match(/^ALREADY_IN_QUEUE:(\d+)/);
      setError(already ? t('alreadyInLine', { n: already[1] }) : t(errorKey(error) as StringKey));
      if (error.message?.startsWith('SHOP_CLOSED')) setShop((s) => (s ? { ...s, is_open: false } : s));
      setBusy(false);
      return;
    }
    await saveTicket(slug, data.customer_token);
    router.replace(`/s/${slug}/ticket`);
  }

  if (state === 'loading') {
    return (
      <Screen>
        <View className="items-center py-24">
          <ActivityIndicator />
        </View>
      </Screen>
    );
  }

  if (state === 'notFound' || !shop) {
    return (
      <Screen>
        <StatusBlock icon={<MapPinOff size={26} color="#71717a" />} title={t('shopNotFound')} hint={t('shopNotFoundHint')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View className="gap-4 pt-4">
        <View className="h-14 w-14 items-center justify-center rounded-2xl bg-primary">
          <Scissors size={26} color="#ffffff" />
        </View>
        <View className="gap-1">
          <Text className="text-sm font-medium uppercase tracking-wider text-muted-foreground">{t('welcomeTo')}</Text>
          <Text className="text-3xl font-semibold tracking-tight">{shop.name}</Text>
        </View>
        <Text className="text-base text-muted-foreground">{t('joinSubtitle')}</Text>
      </View>

      {!shop.is_open ? (
        <StatusBlock icon={<Clock size={26} color="#71717a" />} title={t('shopClosedNow')} hint={t('shopClosedNowHint')} />
      ) : (
        <>
          <View className="gap-4">
            <Field label={t('yourName')} value={name} onChangeText={setName} autoComplete="name" maxLength={40} />
            <Field
              label={t('phone')}
              value={phone}
              onChangeText={(v) => setPhone(v.replace(/\D/g, '').slice(0, 10))}
              keyboardType="phone-pad"
              autoComplete="tel"
              placeholder="98765 43210"
              hint={t('joinHint')}
              onSubmitEditing={() => canJoin && join()}
            />
          </View>

          <FormMessage>{error}</FormMessage>

          <Button size="xl" disabled={!canJoin} onPress={join}>
            {busy ? <ActivityIndicator color="#ffffff" /> : <Text>{t('joinQueue')}</Text>}
          </Button>
        </>
      )}
    </Screen>
  );
}
