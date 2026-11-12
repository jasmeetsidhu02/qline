import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Field, FormMessage } from '@/components/form';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useShopConfig } from '@/hooks/use-shop-config';
import { useAuth } from '@/lib/auth';
import { StringKey, useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

type Mode = 'shared' | 'pick_barber';

export default function LineSettings() {
  const { t } = useI18n();
  const { shop, refreshShop } = useAuth();
  const { barbers } = useShopConfig(shop?.id);
  const [minutes, setMinutes] = useState(String(shop?.default_service_minutes ?? 20));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<StringKey | null>(null);
  const [saved, setSaved] = useState(false);

  // Letting customers pick a barber makes no sense with only one chair.
  const activeBarbers = barbers.filter((b) => b.is_active).length;
  const canPick = activeBarbers >= 2;
  const mins = Number(minutes);

  async function save(patch: Record<string, unknown>) {
    if (!supabase || !shop) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.from('shops').update(patch).eq('id', shop.id);
    if (error) setError('errSaveFailed');
    else {
      await refreshShop();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setBusy(false);
  }

  return (
    <Screen title={t('settingsLine')} subtitle={t('lineHint')} back>
      <FormMessage>{error ? t(error) : null}</FormMessage>

      <View className="overflow-hidden rounded-2xl bg-card">
        <ModeRow
          selected={shop?.line_mode === 'shared'}
          title={t('lineShared')}
          hint={t('lineSharedHint')}
          disabled={busy}
          onPress={() => save({ line_mode: 'shared' })}
        />
        <ModeRow
          selected={shop?.line_mode === 'pick_barber'}
          title={t('linePick')}
          hint={canPick ? t('linePickHint') : t('linePickNeedsBarbers')}
          disabled={busy || !canPick}
          onPress={() => canPick && save({ line_mode: 'pick_barber' })}
          border
        />
      </View>

      <View className="gap-3 rounded-2xl bg-card p-5">
        <Field
          label={t('defaultMinutes')}
          value={minutes}
          onChangeText={(v) => setMinutes(v.replace(/\D/g, '').slice(0, 3))}
          keyboardType="number-pad"
          hint={t('defaultMinutesHint')}
        />
        <Button
          className="rounded-xl"
          disabled={busy || mins < 5 || mins > 180 || mins === shop?.default_service_minutes}
          onPress={() => save({ default_service_minutes: mins })}>
          {busy ? <ActivityIndicator color="#EFF1EE" /> : <Text>{saved ? t('saved') : t('save')}</Text>}
        </Button>
      </View>
    </Screen>
  );
}

function ModeRow({
  selected,
  title,
  hint,
  disabled,
  onPress,
  border,
}: {
  selected: boolean;
  title: string;
  hint: string;
  disabled?: boolean;
  onPress: () => void;
  border?: boolean;
}) {
  return (
    <Pressable
      role="radio"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={title}
      onPress={onPress}
      disabled={disabled}
      className={cn('flex-row items-center gap-3 px-5 py-4 active:bg-accent', border && 'border-t border-border', disabled && !selected && 'opacity-50')}>
      <View className="flex-1 gap-0.5">
        <Text className="text-[17px]">{title}</Text>
        <Text className="text-[13px] leading-[19px] text-muted-foreground">{hint}</Text>
      </View>
      {selected ? <Check size={18} color="#8F6424" /> : null}
    </Pressable>
  );
}
