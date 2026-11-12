import { Phone, Users } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';

import { Row as MotionRow } from '@/components/motion';
import { Numeral } from '@/components/numeral';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { minutesSince } from '@/hooks/use-now';
import type { QueueEntry } from '@/hooks/use-staff-queue';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type Props = {
  entries: QueueEntry[];
  nowMs: number;
  busy: boolean;
  shopOpen: boolean;
  onCall: (id: string) => void;
  onNoShow: (id: string, ticketNo: number) => void;
};

// The second line of a row: what they asked for, who they asked for, and
// whether they were added at the counter. Empty when there is nothing to say.
function detail(entry: QueueEntry, t: (k: 'walkIn' | 'forBarber', vars?: Record<string, string | number>) => string) {
  return [entry.service, entry.barber ? t('forBarber', { name: entry.barber }) : null,
    entry.source === 'walk_in' ? t('walkIn') : null].filter(Boolean).join('  ·  ');
}

// The line, as a list of plain rows. Tap a row to open its actions, so a
// stray thumb can never drop someone from the queue.
export function WaitingList({ entries, nowMs, busy, shopOpen, onCall, onNoShow }: Props) {
  const { t } = useI18n();
  const [openId, setOpenId] = useState<string | null>(null);

  if (entries.length === 0) {
    return (
      <View className="items-center gap-2 rounded-2xl bg-card px-6 py-10">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-secondary">
          <Users size={22} color="#5E6761" />
        </View>
        <Text className="font-ui-sb text-[17px]">{t('emptyQueue')}</Text>
        <Text className="max-w-[250px] text-center text-[14px] leading-[20px] text-muted-foreground">
          {t(shopOpen ? 'emptyQueueHint' : 'closedHint')}
        </Text>
      </View>
    );
  }

  return (
    <View className="overflow-hidden rounded-2xl bg-card">
      {entries.map((entry, index) => {
        const open = openId === entry.id;
        return (
          <MotionRow key={entry.id} className={cn(index > 0 && 'border-t border-border')}>
            <Pressable
              role="button"
              onPress={() => setOpenId(open ? null : entry.id)}
              className="flex-row items-center gap-4 px-5 py-4 active:bg-accent">
              <Numeral size="sm" className={cn('w-8', index === 0 ? 'text-brass' : 'text-muted-foreground')}>
                {entry.ticket_no}
              </Numeral>
              <View className="flex-1">
                <Text className="font-ui-md text-[17px]" numberOfLines={1}>
                  {entry.name}
                </Text>
                {detail(entry, t) ? (
                  <Text className="text-[13px] text-muted-foreground" numberOfLines={1}>
                    {detail(entry, t)}
                  </Text>
                ) : null}
              </View>
              <Text className="text-[14px] text-muted-foreground">
                {minutesSince(entry.joined_at, nowMs)} {t('min')}
              </Text>
            </Pressable>

            {open ? (
              <View className="flex-row flex-wrap gap-2 px-5 pb-4 pl-[68px]">
                <Button size="sm" className="rounded-lg" disabled={busy} onPress={() => onCall(entry.id)}>
                  <Text>{t('callNow')}</Text>
                </Button>
                {entry.phone ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-lg"
                    onPress={() => Linking.openURL(`tel:+91${entry.phone}`)}>
                    <Phone size={14} color="#16211C" />
                    <Text>{entry.phone}</Text>
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-lg"
                  disabled={busy}
                  onPress={() => {
                    setOpenId(null);
                    onNoShow(entry.id, entry.ticket_no);
                  }}>
                  <Text className="text-destructive">{t('noShow')}</Text>
                </Button>
              </View>
            ) : null}
          </MotionRow>
        );
      })}
    </View>
  );
}
