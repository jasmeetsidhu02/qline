import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useI18n } from '@/lib/i18n';

// TV/tablet screen for the shop wall (M7). Open in a browser, full screen.
export default function DisplayScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t } = useI18n();
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-foreground">
      <Text className="text-2xl font-medium uppercase tracking-widest text-background/60">{t('nowServing')}</Text>
      <Text className="text-9xl font-semibold tracking-tighter text-background">--</Text>
      <Text className="text-lg text-background/50">{slug}</Text>
    </View>
  );
}
