import { Plus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Switch, View } from 'react-native';

import { Field, FormMessage } from '@/components/form';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useShopConfig, type Barber } from '@/hooks/use-shop-config';
import { useAuth } from '@/lib/auth';
import { StringKey, useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export default function Barbers() {
  const { t } = useI18n();
  const { shop } = useAuth();
  const { barbers, loading, addBarber, updateBarber, removeBarber } = useShopConfig(shop?.id);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<StringKey | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function run(action: () => Promise<{ message?: string } | null>) {
    setBusy(true);
    setError(null);
    const err = await action();
    if (err) setError('errSaveFailed');
    setBusy(false);
  }

  return (
    <Screen title={t('settingsBarbers')} subtitle={t('barbersHint')} back>
      <FormMessage>{error ? t(error) : null}</FormMessage>

      {loading ? (
        <View className="items-center py-10">
          <ActivityIndicator />
        </View>
      ) : barbers.length === 0 ? (
        <View className="rounded-2xl bg-card px-5 py-8">
          <Text className="text-center text-[15px] text-muted-foreground">{t('noBarbers')}</Text>
        </View>
      ) : (
        <View className="overflow-hidden rounded-2xl bg-card">
          {barbers.map((barber, i) => (
            <BarberRow
              key={barber.id}
              barber={barber}
              first={i === 0}
              busy={busy}
              confirming={confirmId === barber.id}
              onToggle={(value) => run(() => updateBarber(barber.id, { is_active: value }))}
              onAskRemove={() => setConfirmId(barber.id)}
              onCancelRemove={() => setConfirmId(null)}
              onRemove={() => {
                setConfirmId(null);
                run(() => removeBarber(barber.id));
              }}
            />
          ))}
        </View>
      )}

      <View className="gap-3 rounded-2xl bg-card p-5">
        <Field label={t('barberName')} value={name} onChangeText={setName} maxLength={40} />
        <Button
          className="rounded-xl"
          disabled={!name.trim() || busy}
          onPress={() =>
            run(async () => {
              const err = await addBarber(name);
              if (!err) setName('');
              return err;
            })
          }>
          <Plus size={16} color="#EFF1EE" />
          <Text>{t('addBarber')}</Text>
        </Button>
      </View>
    </Screen>
  );
}

function BarberRow({
  barber,
  first,
  busy,
  confirming,
  onToggle,
  onAskRemove,
  onCancelRemove,
  onRemove,
}: {
  barber: Barber;
  first: boolean;
  busy: boolean;
  confirming: boolean;
  onToggle: (value: boolean) => void;
  onAskRemove: () => void;
  onCancelRemove: () => void;
  onRemove: () => void;
}) {
  const { t } = useI18n();

  if (confirming) {
    return (
      <View className={cn('gap-3 px-5 py-4', !first && 'border-t border-border')}>
        <Text className="text-[15px]">{t('removeConfirm', { name: barber.name })}</Text>
        <View className="flex-row gap-3">
          <Button variant="outline" size="sm" className="flex-1 rounded-lg" onPress={onCancelRemove}>
            <Text>{t('cancel')}</Text>
          </Button>
          <Button variant="destructive" size="sm" className="flex-1 rounded-lg" onPress={onRemove}>
            <Text>{t('remove')}</Text>
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View className={cn('flex-row items-center gap-3 px-5 py-4', !first && 'border-t border-border')}>
      <View className="flex-1">
        <Text className="text-[17px]">{barber.name}</Text>
        <Text className="text-[13px] text-muted-foreground">{t(barber.is_active ? 'working' : 'awayToday')}</Text>
      </View>
      <Switch
        value={barber.is_active}
        onValueChange={onToggle}
        disabled={busy}
        accessibilityLabel={`${barber.name} ${t('working')}`}
        trackColor={{ true: '#8F6424', false: '#D4D8D3' }}
      />
      <Pressable
        role="button"
        accessibilityLabel={`${t('remove')} ${barber.name}`}
        onPress={onAskRemove}
        hitSlop={8}
        className="h-9 w-9 items-center justify-center rounded-full active:bg-accent">
        <Trash2 size={16} color="#8B3328" />
      </Pressable>
    </View>
  );
}
