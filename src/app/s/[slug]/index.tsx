import { router, useLocalSearchParams } from 'expo-router';
import { Clock, MapPinOff } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { ChipSelect } from '@/components/chip-select';
import { Field, FormMessage } from '@/components/form';
import { LanguagePicker } from '@/components/language-picker';
import { StatusBlock } from '@/components/status-block';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { errorKey } from '@/lib/errors';
import { StringKey, useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { primeSound } from '@/lib/alert-sound';
import { loadTicket, saveTicket } from '@/lib/ticket-storage';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ShopInfo = { id: string; name: string; is_open: boolean; line_mode: 'shared' | 'pick_barber' };
type PublicBarber = { id: string; name: string };
type PublicService = { id: string; name_en: string; name_hi: string | null; name_pa: string | null; minutes: number };

// The service's name in the reader's language, falling back to English.
function serviceLabel(service: PublicService, lang: 'en' | 'hi' | 'pa') {
  const byLang = lang === 'hi' ? service.name_hi : lang === 'pa' ? service.name_pa : service.name_en;
  return byLang?.trim() || service.name_en;
}

// What the QR code opens: https://<domain>/s/<shop-slug>
export default function JoinQueue() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t, lang } = useI18n();
  const [shop, setShop] = useState<ShopInfo | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'notFound'>('loading');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [barbers, setBarbers] = useState<PublicBarber[]>([]);
  const [services, setServices] = useState<PublicService[]>([]);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [barberId, setBarberId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase || !slug) return;
    const client = supabase;
    let alive = true;
    (async () => {
      // Already holding a live ticket here? Go straight to it.
      const token = await loadTicket(slug);
      if (token) {
        const { data } = await client.rpc('get_my_status', { p_token: token });
        if (data && (data.status === 'waiting' || data.status === 'serving')) {
          router.replace(`/s/${slug}/ticket`);
          return;
        }
      }
      // Public shop info. The shops table holds nothing private.
      const { data } = await client.from('shops').select('id, name, is_open, line_mode').eq('slug', slug).maybeSingle();
      if (!alive) return;
      if (!data) {
        setState('notFound');
        return;
      }
      setShop(data as ShopInfo);
      setState('ready');

      // What this shop offers. Customers are allowed to read both tables.
      const [svc, brb] = await Promise.all([
        client.from('services').select('id, name_en, name_hi, name_pa, minutes')
          .eq('shop_id', data.id).eq('is_active', true).order('sort_order'),
        client.from('barbers').select('id, name')
          .eq('shop_id', data.id).eq('is_active', true).order('sort_order'),
      ]);
      if (!alive) return;
      setServices((svc.data as PublicService[]) ?? []);
      setBarbers((brb.data as PublicBarber[]) ?? []);
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  const canJoin = name.trim().length > 0 && /^\d{10}$/.test(phone) && !busy;

  async function join() {
    if (!supabase) return setError(t('errNotConfigured'));
    // A tap is the only moment a browser lets us open the audio channel.
    primeSound();
    setBusy(true);
    setError(null);
    const { data, error } = await supabase.rpc('join_queue', {
      p_slug: slug,
      p_name: name.trim(),
      p_phone: phone,
      p_service_id: serviceId,
      p_barber_id: barberId,
    });
    if (error) {
      const already = error.message?.match(/^ALREADY_IN_QUEUE:(\d+)/);
      setError(already ? t('alreadyInLine', { n: already[1] }) : t(errorKey(error) as StringKey));
      if (error.message?.startsWith('SHOP_CLOSED')) setShop((s) => (s ? { ...s, is_open: false } : s));
      setBusy(false);
      return;
    }
    await saveTicket(slug, data.customer_token);
    router.replace(`/s/${slug}/ticket`);
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentContainerClassName="w-full max-w-md self-center px-5 pb-14 pt-3 gap-7"
        keyboardShouldPersistTaps="handled">
        <View className="flex-row items-start justify-between gap-4">
          <Text className="font-num-b text-[19px] tracking-[-0.3px] text-muted-foreground">QLine</Text>
          <LanguagePicker />
        </View>

        {state === 'loading' ? (
          <View className="items-center py-24">
            <ActivityIndicator />
          </View>
        ) : state === 'notFound' || !shop ? (
          <StatusBlock icon={<MapPinOff size={26} color="#5E6761" />} title={t('shopNotFound')} hint={t('shopNotFoundHint')} />
        ) : (
          <>
            <View className="gap-3">
              <Text className="font-ui-sb text-[34px] leading-[40px] tracking-[-0.8px]">{shop.name}</Text>
              <Text className="max-w-[310px] text-[16px] leading-[24px] text-muted-foreground">{t('joinSubtitle')}</Text>
            </View>

            {!shop.is_open ? (
              <StatusBlock icon={<Clock size={26} color="#5E6761" />} title={t('shopClosedNow')} hint={t('shopClosedNowHint')} />
            ) : (
              <>
                <View className="gap-5">
                  {services.length > 0 ? (
                    <ChipSelect
                      label={t('chooseService')}
                      hint={t('optional')}
                      value={serviceId}
                      onChange={setServiceId}
                      choices={services.map((s) => ({
                        id: s.id,
                        label: serviceLabel(s, lang),
                        hint: `${s.minutes} ${t('min')}`,
                      }))}
                    />
                  ) : null}

                  {shop.line_mode === 'pick_barber' && barbers.length > 1 ? (
                    <ChipSelect
                      label={t('chooseBarber')}
                      hint={t('optional')}
                      value={barberId}
                      onChange={setBarberId}
                      choices={[{ id: null, label: t('anyBarber') }, ...barbers.map((b) => ({ id: b.id, label: b.name }))]}
                    />
                  ) : null}

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
                  {busy ? <ActivityIndicator color="#EFF1EE" /> : <Text>{t('joinQueue')}</Text>}
                </Button>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
