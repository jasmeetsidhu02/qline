import { ActivityIndicator, Pressable, View } from 'react-native';

import { Numeral } from '@/components/numeral';
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

// Brass means "being called" everywhere in QLine: this button on the
// barber's phone, and the customer's screen when their turn arrives.
export function NextButton({ nextEntry, hasServing, busy, onPress }: Props) {
  const { t } = useI18n();
  const nothingToDo = !nextEntry && !hasServing;

  return (
    <Pressable
      role="button"
      accessibilityLabel={t('next')}
      disabled={busy || nothingToDo}
      onPress={onPress}
      className={cn(
        'h-[88px] flex-row items-center justify-between rounded-2xl bg-brass px-6 active:opacity-90',
        nothingToDo && 'bg-secondary'
      )}>
      <View className="flex-1 gap-0.5">
        <Text className={cn('font-ui-sb text-[26px] leading-[30px]', nothingToDo ? 'text-muted-foreground' : 'text-background')}>
          {t('next')}
        </Text>
        <Text className={cn('text-[14px]', nothingToDo ? 'text-muted-foreground' : 'text-background/70')} numberOfLines={1}>
          {nextEntry ? nextEntry.name : hasServing ? t('finishCurrent') : t('noOneWaiting')}
        </Text>
      </View>
      {busy ? (
        <ActivityIndicator color="#EFF1EE" />
      ) : nextEntry ? (
        <Numeral size="md" className="text-background/90">
          {nextEntry.ticket_no}
        </Numeral>
      ) : null}
    </Pressable>
  );
}
