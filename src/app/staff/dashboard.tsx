import { router } from 'expo-router';
import { Check, Settings, UserPlus, UserX } from 'lucide-react-native';
import { View } from 'react-native';

import { Screen, SectionLabel } from '@/components/screen';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useI18n } from '@/lib/i18n';

const ICON = '#18181b';

// Barber dashboard. M3 wires every button to the database.
export default function Dashboard() {
  const { t } = useI18n();
  return (
    <Screen title={t('dashboard')}>
      <Card>
        <CardContent className="gap-1">
          <View className="flex-row items-center justify-between">
            <SectionLabel>{t('nowServing')}</SectionLabel>
            <Badge variant="secondary"><Text>0 waiting</Text></Badge>
          </View>
          <Text className="text-6xl font-semibold tracking-tighter">--</Text>
        </CardContent>
      </Card>

      <Button size="xl" className="h-20">
        <Text className="text-xl">{t('next')}</Text>
      </Button>

      <View className="flex-row gap-3">
        <Button variant="outline" size="xl" className="flex-1">
          <Check size={18} color={ICON} />
          <Text>{t('done')}</Text>
        </Button>
        <Button variant="outline" size="xl" className="flex-1">
          <UserX size={18} color={ICON} />
          <Text>{t('noShow')}</Text>
        </Button>
      </View>

      <Button variant="secondary" size="xl">
        <UserPlus size={18} color={ICON} />
        <Text>{t('addWalkIn')}</Text>
      </Button>

      <View className="gap-3">
        <SectionLabel>Queue</SectionLabel>
        <Card className="py-8">
          <CardContent className="items-center">
            <Text className="text-muted-foreground">{t('comingSoon')}</Text>
          </CardContent>
        </Card>
      </View>

      <Button variant="ghost" onPress={() => router.push('/staff/settings')}>
        <Settings size={16} color={ICON} />
        <Text>{t('settings')}</Text>
      </Button>
    </Screen>
  );
}
