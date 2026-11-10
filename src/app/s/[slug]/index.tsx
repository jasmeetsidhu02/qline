import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useI18n } from '@/lib/i18n';

// Customer join page. The shop's QR code points here: https://<domain>/s/<shop-slug>
export default function JoinQueue() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const canJoin = name.trim().length > 0 && /^\d{10}$/.test(phone);

  return (
    <Screen title={t('joinQueue')} subtitle={slug}>
      <View className="gap-4">
        <View className="gap-2">
          <Text className="text-sm font-medium">{t('yourName')}</Text>
          <Input className="h-14 rounded-xl text-lg" value={name} onChangeText={setName} autoComplete="name" />
        </View>
        <View className="gap-2">
          <Text className="text-sm font-medium">{t('phone')}</Text>
          <Input
            className="h-14 rounded-xl text-lg"
            value={phone}
            onChangeText={(v) => setPhone(v.replace(/\D/g, '').slice(0, 10))}
            keyboardType="phone-pad"
            autoComplete="tel"
            placeholder="98765 43210"
          />
        </View>
      </View>
      {/* M4: call the join_queue RPC here and store the returned token */}
      <Button size="xl" disabled={!canJoin} onPress={() => router.push(`/s/${slug}/ticket`)}>
        <Text>{t('join')}</Text>
      </Button>
    </Screen>
  );
}
