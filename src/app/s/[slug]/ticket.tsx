import { router, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';

import { Button, Card, Muted, Screen } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { colors } from '@/theme';

// Customer status page. M4 makes this live via Supabase Realtime.
export default function Ticket() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t } = useI18n();
  return (
    <Screen title={t('yourTicket')}>
      <Card>
        <Text style={{ fontSize: 72, fontWeight: '800', color: colors.primary, textAlign: 'center' }}>--</Text>
        <Muted>{t('peopleAhead')}: --</Muted>
        <Muted>{t('estWait')}: --</Muted>
      </Card>
      <Button variant="danger" label={t('leaveQueue')} onPress={() => router.replace(`/s/${slug}`)} />
    </Screen>
  );
}
