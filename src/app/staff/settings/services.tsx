import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Field, FormMessage } from '@/components/form';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { serviceName, useShopConfig, type Service } from '@/hooks/use-shop-config';
import { useAuth } from '@/lib/auth';
import { StringKey, useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const onlyDigits = (v: string) => v.replace(/\D/g, '').slice(0, 3);

export default function Services() {
  const { t, lang } = useI18n();
  const { shop } = useAuth();
  const { services, loading, addService, updateService, removeService } = useShopConfig(shop?.id);
  const [name, setName] = useState('');
  const [minutes, setMinutes] = useState('20');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<StringKey | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const mins = Number(minutes);
  const canAdd = name.trim().length > 0 && mins >= 5 && mins <= 180 && !busy;

  async function run(action: () => Promise<{ message?: string } | null>) {
    setBusy(true);
    setError(null);
    const err = await action();
    if (err) setError('errSaveFailed');
    setBusy(false);
  }

  return (
    <Screen title={t('settingsServices')} subtitle={t('servicesHint')} back>
      <FormMessage>{error ? t(error) : null}</FormMessage>

      {loading ? (
        <View className="items-center py-10">
          <ActivityIndicator />
        </View>
      ) : services.length === 0 ? (
        <View className="rounded-2xl bg-card px-5 py-8">
          <Text className="text-center text-[15px] text-muted-foreground">{t('noServices')}</Text>
        </View>
      ) : (
        <View className="overflow-hidden rounded-2xl bg-card">
          {services.map((service, i) => (
            <View key={service.id} className={cn(i > 0 && 'border-t border-border')}>
              <Pressable
                role="button"
                onPress={() => setOpenId(openId === service.id ? null : service.id)}
                className="flex-row items-center gap-3 px-5 py-4 active:bg-accent">
                <View className="flex-1">
                  <Text className="text-[17px]">{serviceName(service, lang)}</Text>
                  <Text className="text-[13px] text-muted-foreground">
                    {service.minutes} {t('min')}
                  </Text>
                </View>
                {openId === service.id ? (
                  <ChevronUp size={18} color="#A6ADA7" />
                ) : (
                  <ChevronDown size={18} color="#A6ADA7" />
                )}
              </Pressable>
              {openId === service.id ? (
                <ServiceEditor
                  service={service}
                  busy={busy}
                  onSave={(patch) => run(() => updateService(service.id, patch))}
                  onRemove={() => {
                    setOpenId(null);
                    run(() => removeService(service.id));
                  }}
                />
              ) : null}
            </View>
          ))}
        </View>
      )}

      <View className="gap-3 rounded-2xl bg-card p-5">
        <Field label={t('serviceName')} value={name} onChangeText={setName} maxLength={40} />
        <Field label={t('minutes')} value={minutes} onChangeText={(v) => setMinutes(onlyDigits(v))} keyboardType="number-pad" />
        <Button
          className="rounded-xl"
          disabled={!canAdd}
          onPress={() =>
            run(async () => {
              const err = await addService(name, mins);
              if (!err) {
                setName('');
                setMinutes('20');
              }
              return err;
            })
          }>
          <Plus size={16} color="#EFF1EE" />
          <Text>{t('addService')}</Text>
        </Button>
      </View>
    </Screen>
  );
}

// Per-language names, so a customer reading Punjabi sees a Punjabi service.
function ServiceEditor({
  service,
  busy,
  onSave,
  onRemove,
}: {
  service: Service;
  busy: boolean;
  onSave: (patch: Partial<Service>) => void;
  onRemove: () => void;
}) {
  const { t } = useI18n();
  const [en, setEn] = useState(service.name_en);
  const [hi, setHi] = useState(service.name_hi ?? '');
  const [pa, setPa] = useState(service.name_pa ?? '');
  const [minutes, setMinutes] = useState(String(service.minutes));

  const mins = Number(minutes);
  const valid = en.trim().length > 0 && mins >= 5 && mins <= 180;

  return (
    <View className="gap-3 border-t border-border bg-background/40 px-5 py-4">
      <Field label={t('nameInEnglish')} value={en} onChangeText={setEn} maxLength={40} />
      <Field label={t('nameInHindi')} value={hi} onChangeText={setHi} maxLength={40} />
      <Field label={t('nameInPunjabi')} value={pa} onChangeText={setPa} maxLength={40} />
      <Field label={t('minutes')} value={minutes} onChangeText={(v) => setMinutes(onlyDigits(v))} keyboardType="number-pad" />
      <View className="flex-row gap-3">
        <Button variant="outline" size="sm" className="rounded-lg" onPress={onRemove} disabled={busy}>
          <Trash2 size={14} color="#8B3328" />
          <Text className="text-destructive">{t('remove')}</Text>
        </Button>
        <Button
          size="sm"
          className="flex-1 rounded-lg"
          disabled={!valid || busy}
          onPress={() =>
            onSave({
              name_en: en.trim(),
              name_hi: hi.trim() || null,
              name_pa: pa.trim() || null,
              minutes: mins,
            })
          }>
          <Text>{t('save')}</Text>
        </Button>
      </View>
    </View>
  );
}
