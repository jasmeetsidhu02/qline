import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { Button, Card, Muted, Screen } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { colors } from '@/theme';

// Customer join page. The shop's QR code points here: https://<domain>/s/<shop-slug>
export default function JoinQueue() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const canJoin = name.trim().length > 0 && /^\d{10}$/.test(phone);

  return (
    <Screen title={t('joinQueue')}>
      <Muted>Shop: {slug}</Muted>
      <Card>
        <TextInput style={styles.input} placeholder={t('yourName')} value={name} onChangeText={setName} />
        <TextInput
          style={styles.input}
          placeholder={t('phone')}
          value={phone}
          onChangeText={(v) => setPhone(v.replace(/\D/g, '').slice(0, 10))}
          keyboardType="phone-pad"
        />
        {/* M4: call the join_queue RPC here and store the returned token */}
        <Button label={t('join')} disabled={!canJoin} onPress={() => router.push(`/s/${slug}/ticket`)} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: { minHeight: 52, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, fontSize: 18 },
});
