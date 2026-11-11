import { UserPlus } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Field, FormMessage } from '@/components/form';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { errorKey } from '@/lib/errors';
import { StringKey, useI18n } from '@/lib/i18n';

type Props = {
  onAdd: (name: string, phone: string) => Promise<{ code?: string; message?: string } | null>;
};

// Collapsed: one button. Expanded: name + optional phone, right in the page
// (no popup, so it behaves the same on every phone and in the browser).
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
      <Button variant="secondary" size="xl" onPress={() => setOpen(true)}>
        <UserPlus size={18} color="#18181b" />
        <Text>{t('addWalkIn')}</Text>
      </Button>
    );
  }

  return (
    <View className="gap-4 rounded-2xl border border-border bg-card p-5">
      <Text className="text-lg font-semibold">{t('addWalkIn')}</Text>
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
        <Button variant="outline" size="xl" className="flex-1" onPress={close} disabled={busy}>
          <Text>{t('cancel')}</Text>
        </Button>
        <Button size="xl" className="flex-1" onPress={submit} disabled={!canAdd}>
          {busy ? <ActivityIndicator color="#ffffff" /> : <Text>{t('addToQueue')}</Text>}
        </Button>
      </View>
    </View>
  );
}
