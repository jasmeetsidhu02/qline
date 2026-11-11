import { ArrowRight } from 'lucide-react-native';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import type { QueueEntry } from '@/hooks/use-staff-queue';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type Props = {
  nextEntry: QueueEntry | undefined;
  hasServing: boolean;
  busy: boolean;
  onPress: () => void;
};

// The one big button. Tall on purpose: it gets tapped with busy hands.
export function NextButton({ nextEntry, hasServing, busy, onPress }: Props) {
  const { t } = useI18n();
  const nothingToDo = !nextEntry && !hasServing;
  const disabled = busy || nothingToDo;

  const hint = nextEntry
    ? `${t('nextUp')} · #${nextEntry.ticket_no} ${nextEntry.name}`
    : hasServing
      ? t('finishCurrent')
      : t('noOneWaiting');

  return (
    <Pressable
      role="button"
      accessibilityLabel={t('next')}
      disabled={disabled}
      onPress={onPress}
      className={cn(
        'h-24 flex-row items-center justify-between rounded-2xl bg-primary px-6 active:opacity-90',
        nothingToDo && 'opacity-40'
      )}>
      <View className="flex-1 gap-0.5">
        <Text className="text-3xl font-semibold leading-9 text-primary-foreground">{t('next')}</Text>
        <Text className="text-sm text-primary-foreground/75" numberOfLines={1}>
          {hint}
        </Text>
      </View>
      <View className="h-12 w-12 items-center justify-center rounded-full bg-white/15">
        {busy ? <ActivityIndicator color="#ffffff" /> : <ArrowRight size={24} color="#ffffff" />}
      </View>
    </Pressable>
  );
}
