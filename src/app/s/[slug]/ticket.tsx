import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { useI18n } from '@/lib/i18n';

// Customer status page. M4 makes this live via Supabase Realtime.
export default function Ticket() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t } = useI18n();
  return (
    <Screen title={t('yourTicket')} subtitle={slug}>
      <Card>
        <CardContent className="items-center gap-6 py-4">
          <Text className="text-8xl font-semibold tracking-tighter text-primary">--</Text>
          <Separator />
          <View className="w-full flex-row">
            <Stat label={t('peopleAhead')} value="--" />
            <View className="w-px bg-border" />
            <Stat label={t('estWait')} value="--" />
          </View>
        </CardContent>
      </Card>
      <Button variant="outline" size="xl" onPress={() => router.replace(`/s/${slug}`)}>
        <Text className="text-destructive">{t('leaveQueue')}</Text>
      </Button>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 items-center gap-1">
      <Text className="text-3xl font-semibold">{value}</Text>
      <Text className="text-sm text-muted-foreground">{label}</Text>
    </View>
  );
}
