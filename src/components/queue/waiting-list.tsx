import { ChevronDown, ChevronUp, Phone, Users } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import type { QueueEntry } from '@/hooks/use-staff-queue';
import { minutesSince } from '@/hooks/use-now';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type Props = {
  entries: QueueEntry[];
  nowMs: number;
  busy: boolean;
  shopOpen: boolean;
  onCall: (id: string) => void;
  onNoShow: (id: string) => void;
};

// Everyone still waiting, in order. Tap a row to see its actions, so a
// stray thumb can never remove someone with a single tap.
export function WaitingList({ entries, nowMs, busy, shopOpen, onCall, onNoShow }: Props) {
  const { t } = useI18n();
  const [openId, setOpenId] = useState<string | null>(null);

  if (entries.length === 0) {
    return (
      <View className="items-center gap-2 rounded-2xl border border-dashed border-border px-6 py-10">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-secondary">
          <Users size={22} color="#71717a" />
        </View>
        <Text className="font-semibold">{t('emptyQueue')}</Text>
        <Text className="text-center text-sm text-muted-foreground">
          {t(shopOpen ? 'emptyQueueHint' : 'closedHint')}
        </Text>
      </View>
    );
  }

  return (
    <View className="overflow-hidden rounded-2xl border border-border bg-card">
      {entries.map((entry, index) => {
        const open = openId === entry.id;
        return (
          <View key={entry.id} className={cn(index > 0 && 'border-t border-border')}>
            <Pressable
              role="button"
              onPress={() => setOpenId(open ? null : entry.id)}
              className="flex-row items-center gap-3 px-4 py-3.5 active:bg-accent">
              <View
                className={cn(
                  'h-11 w-11 items-center justify-center rounded-full',
                  index === 0 ? 'bg-primary/10' : 'bg-secondary'
                )}>
                <Text className={cn('text-base font-semibold', index === 0 && 'text-primary')}>{entry.ticket_no}</Text>
              </View>
              <View className="flex-1 gap-0.5">
                <Text className="text-base font-medium" numberOfLines={1}>
                  {entry.name}
                </Text>
                <Text className="text-sm text-muted-foreground" numberOfLines={1}>
                  {t('waited')} {minutesSince(entry.joined_at, nowMs)} {t('min')}
                  {entry.source === 'walk_in' ? ` · ${t('walkIn')}` : ''}
                </Text>
              </View>
              {open ? <ChevronUp size={18} color="#a1a1aa" /> : <ChevronDown size={18} color="#a1a1aa" />}
            </Pressable>

            {open ? (
              <View className="flex-row flex-wrap gap-2 px-4 pb-4 pl-[72px]">
                <Button size="sm" className="rounded-lg" disabled={busy} onPress={() => onCall(entry.id)}>
                  <Text>{t('callNow')}</Text>
                </Button>
                {entry.phone ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-lg"
                    onPress={() => Linking.openURL(`tel:+91${entry.phone}`)}>
                    <Phone size={14} color="#18181b" />
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
                    onNoShow(entry.id);
                  }}>
                  <Text className="text-destructive">{t('noShow')}</Text>
                </Button>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
