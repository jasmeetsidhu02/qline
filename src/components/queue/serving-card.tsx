import { Armchair } from 'lucide-react-native';
import { View } from 'react-native';

import { Numeral } from '@/components/numeral';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { minutesSince } from '@/hooks/use-now';
import type { QueueEntry } from '@/hooks/use-staff-queue';
import { useI18n } from '@/lib/i18n';

type Props = {
  entry: QueueEntry;
  nowMs: number;
  compact?: boolean; // true when several chairs are busy at once
  /** Minutes after which this cut has clearly run long. */
  nudgeAfterMin?: number;
  busy: boolean;
  onDone: () => void;
  onNoShow: () => void;
};

// The customer in the chair. The one dark block on the screen, so a glance
// from across the shop lands on it first.
export function ServingCard({ entry, nowMs, compact, nudgeAfterMin = 40, busy, onDone, onNoShow }: Props) {
  const { t } = useI18n();
  const mins = minutesSince(entry.called_at, nowMs);
  return (
    <View className="gap-5 rounded-[28px] bg-ink p-6">
      <View className="flex-row items-baseline justify-between">
        <Text className="font-ui-md text-[14px] text-brass-soft">{t('inChair')}</Text>
        <Text className="text-[14px] text-background/50">
          {mins} {t('min')}
        </Text>
      </View>

      <View className="flex-row items-center gap-5">
        <Numeral size={compact ? 'md' : 'lg'} className="text-background">
          {entry.ticket_no}
        </Numeral>
        <View className="flex-1 gap-1">
          <Text className="font-ui-sb text-[21px] leading-[26px] text-background" numberOfLines={1}>
            {entry.name}
          </Text>
          <Text className="text-[14px] text-background/50" numberOfLines={1}>
            {[entry.service, entry.barber, entry.phone ?? t('walkIn')].filter(Boolean).join('  ·  ')}
          </Text>
        </View>
      </View>

      {mins >= nudgeAfterMin ? (
        <Text className="-mt-2 text-[14px] leading-[19px] text-brass-soft">{t('stillInChair', { n: mins })}</Text>
      ) : null}

      <View className="flex-row gap-3">
        <Button
          size="lg"
          className="flex-1 rounded-xl border border-ink-line bg-transparent active:bg-white/10"
          disabled={busy}
          onPress={onDone}>
          <Text className="font-ui-sb text-background">{t('done')}</Text>
        </Button>
        <Button
          size="lg"
          className="flex-1 rounded-xl border border-ink-line bg-transparent active:bg-white/10"
          disabled={busy}
          onPress={onNoShow}>
          <Text className="font-ui-md text-background/60">{t('noShow')}</Text>
        </Button>
      </View>
    </View>
  );
}

export function EmptyChair() {
  const { t } = useI18n();
  return (
    <View className="flex-row items-center gap-4 rounded-[28px] bg-card px-6 py-7">
      <View className="h-12 w-12 items-center justify-center rounded-full bg-secondary">
        <Armchair size={22} color="#5E6761" />
      </View>
      <View className="flex-1 gap-1">
        <Text className="font-ui-sb text-[17px]">{t('chairFree')}</Text>
        <Text className="text-[14px] leading-[20px] text-muted-foreground">{t('chairFreeHint')}</Text>
      </View>
    </View>
  );
}
