import { Armchair, Check, UserX } from 'lucide-react-native';
import { View } from 'react-native';

import { SectionLabel } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import type { QueueEntry } from '@/hooks/use-staff-queue';
import { minutesSince } from '@/hooks/use-now';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type Props = {
  entry: QueueEntry;
  nowMs: number;
  compact?: boolean; // true when several chairs are busy at once
  busy: boolean;
  onDone: () => void;
  onNoShow: () => void;
};

// The customer currently in the chair: the most important thing on screen.
export function ServingCard({ entry, nowMs, compact, busy, onDone, onNoShow }: Props) {
  const { t } = useI18n();
  return (
    <View className="gap-4 rounded-2xl border border-border bg-card p-5">
      <View className="flex-row items-center justify-between">
        <SectionLabel>{t('nowServing')}</SectionLabel>
        <Text className="text-sm text-muted-foreground">
          {t('inChair')} · {minutesSince(entry.called_at, nowMs)} {t('min')}
        </Text>
      </View>

      <View className="flex-row items-center gap-4">
        <Text
          className={cn(
            'font-semibold tracking-tighter text-primary',
            compact ? 'text-5xl leading-[48px]' : 'text-7xl leading-[72px]'
          )}>
          {entry.ticket_no}
        </Text>
        <View className="flex-1 gap-0.5">
          <Text className="text-xl font-semibold" numberOfLines={1}>
            {entry.name}
          </Text>
          <Text className="text-sm text-muted-foreground" numberOfLines={1}>
            {entry.phone ?? t('walkIn')}
          </Text>
        </View>
      </View>

      <View className="flex-row gap-3">
        <Button variant="outline" size="lg" className="h-12 flex-1 rounded-xl" disabled={busy} onPress={onDone}>
          <Check size={18} color="#0f766e" />
          <Text className="font-semibold">{t('done')}</Text>
        </Button>
        <Button variant="outline" size="lg" className="h-12 flex-1 rounded-xl" disabled={busy} onPress={onNoShow}>
          <UserX size={18} color="#71717a" />
          <Text className="font-semibold text-muted-foreground">{t('noShow')}</Text>
        </Button>
      </View>
    </View>
  );
}

export function EmptyChair() {
  const { t } = useI18n();
  return (
    <View className="flex-row items-center gap-4 rounded-2xl border border-dashed border-border p-5">
      <View className="h-12 w-12 items-center justify-center rounded-full bg-secondary">
        <Armchair size={22} color="#71717a" />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="font-semibold">{t('chairFree')}</Text>
        <Text className="text-sm text-muted-foreground">{t('chairFreeHint')}</Text>
      </View>
    </View>
  );
}
