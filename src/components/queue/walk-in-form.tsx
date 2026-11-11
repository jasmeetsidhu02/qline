import { Plus } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Field, FormMessage } from '@/components/form';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { errorKey } from '@/lib/errors';
import { StringKey, useI18n } from '@/lib/i18n';

type Props = {
  onAdd: (name: string, phone: string) => Promise<{ code?: string; message?: string } | null>;
};

// For customers who walk in without scanning. Opens in place rather than in
// a popup, so it behaves the same on every phone and in the browser.
export function WalkInForm({ onAdd }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<StringKey | null>(null);

  const phoneOk = phone.length === 0 || phone.length === 10;
  const canAdd = name.trim().length > 0 && phoneOk && !busy;

  function close() {
    setOpen(false);
    setName('');
    setPhone('');
    setError(null);
  }

  async function submit() {
    setBusy(true);
    setError(null);
    const err = await onAdd(name.trim(), phone);
    setBusy(false);
    if (err) setError(errorKey(err));
    else close();
  }

  if (!open) {
    return (
      <Pressable
        role="button"
        onPress={() => setOpen(true)}
        className="flex-row items-center gap-3 rounded-2xl border border-dashed border-input px-5 py-4 active:bg-accent">
        <Plus size={18} color="#5E6761" />
        <Text className="font-ui-md text-[16px] text-muted-foreground">{t('addSomeone')}</Text>
      </Pressable>
    );
  }

  return (
    <View className="gap-4 rounded-2xl bg-card p-5">
      <Text className="font-ui-sb text-[17px]">{t('addSomeone')}</Text>
      <Field label={t('customerName')} value={name} onChangeText={setName} autoFocus />
      <Field
        label={t('phoneOptional')}
        value={phone}
        onChangeText={(v) => setPhone(v.replace(/\D/g, '').slice(0, 10))}
        keyboardType="phone-pad"
        onSubmitEditing={() => canAdd && submit()}
      />
      <FormMessage>{error ? t(error) : null}</FormMessage>
      <View className="flex-row gap-3">
        <Button variant="outline" size="lg" className="flex-1 rounded-xl" onPress={close} disabled={busy}>
          <Text>{t('cancel')}</Text>
        </Button>
        <Button size="lg" className="flex-1 rounded-xl" onPress={submit} disabled={!canAdd}>
          {busy ? <ActivityIndicator color="#EFF1EE" /> : <Text>{t('addToQueue')}</Text>}
        </Button>
      </View>
    </View>
  );
}
