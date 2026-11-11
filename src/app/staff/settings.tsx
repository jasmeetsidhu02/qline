import { View } from 'react-native';

import { Screen } from '@/components/screen';
import { Text } from '@/components/ui/text';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

// Barbers, line mode, services and the printable QR poster land here in M7.
export default function Settings() {
  const { t } = useI18n();
  const items = ['Barbers', 'Services and times', 'How the line works', 'Printable QR poster'];

  return (
    <Screen title={t('settings')}>
      <View className="overflow-hidden rounded-2xl bg-card">
        {items.map((item, i) => (
          <View key={item} className={cn('gap-1 px-5 py-4', i > 0 && 'border-t border-border')}>
            <Text className="font-ui-md text-[17px]">{item}</Text>
            <Text className="text-[14px] text-muted-foreground">{t('comingSoon')}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}
