import { router } from 'expo-router';
import { View } from 'react-native';

import { Button, Card, Muted, Screen } from '@/components/ui';
import { useI18n } from '@/lib/i18n';

// Barber dashboard. M3 wires every button to the database.
export default function Dashboard() {
  const { t } = useI18n();
  return (
    <Screen title={t('dashboard')}>
      <Button label={t('next')} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}><Button variant="secondary" label={t('done')} /></View>
        <View style={{ flex: 1 }}><Button variant="secondary" label={t('noShow')} /></View>
      </View>
      <Button variant="secondary" label={t('addWalkIn')} />
      <Card>
        <Muted>{t('comingSoon')}: live queue list</Muted>
      </Card>
      <Button variant="secondary" label={t('settings')} onPress={() => router.push('/staff/settings')} />
    </Screen>
  );
}
