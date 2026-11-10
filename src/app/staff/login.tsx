import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { Button, Card, Screen } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { colors } from '@/theme';

export default function StaffLogin() {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return (
    <Screen title={t('staffLogin')}>
      <Card>
        <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
        {/* M2: supabase.auth.signInWithPassword */}
        <Button label={t('staffLogin')} onPress={() => router.replace('/staff/dashboard')} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: { minHeight: 52, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, fontSize: 18 },
});
