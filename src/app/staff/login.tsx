import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useI18n } from '@/lib/i18n';

export default function StaffLogin() {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return (
    <Screen title={t('staffLogin')}>
      <View className="gap-4">
        <View className="gap-2">
          <Text className="text-sm font-medium">Email</Text>
          <Input className="h-12 rounded-xl" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        </View>
        <View className="gap-2">
          <Text className="text-sm font-medium">Password</Text>
          <Input className="h-12 rounded-xl" secureTextEntry value={password} onChangeText={setPassword} />
        </View>
      </View>
      {/* M2: supabase.auth.signInWithPassword */}
      <Button size="xl" onPress={() => router.replace('/staff/dashboard')}>
        <Text>{t('staffLogin')}</Text>
      </Button>
    </Screen>
  );
}
