import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { colors } from '@/theme';

// TV/tablet screen for the shop wall (M7). Open in a browser, full screen.
export default function DisplayScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t } = useI18n();
  return (
    <View style={{ flex: 1, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <Text style={{ color: '#fff', fontSize: 32, fontWeight: '600' }}>{t('nowServing')}</Text>
      <Text style={{ color: '#fff', fontSize: 120, fontWeight: '800' }}>--</Text>
      <Text style={{ color: '#ffffffaa', fontSize: 18 }}>{slug}</Text>
    </View>
  );
}
