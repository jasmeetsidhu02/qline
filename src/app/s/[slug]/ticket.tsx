import { router, useLocalSearchParams } from 'expo-router';
import { CheckCircle2, LogOut, Ticket as TicketIcon, UserX, WifiOff } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Vibration, View } from 'react-native';

import { Screen } from '@/components/screen';
import { StatusBlock } from '@/components/status-block';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useNow } from '@/hooks/use-now';
import { TicketStatus, useMyTicket } from '@/hooks/use-my-ticket';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { clearTicket, loadTicket } from '@/lib/ticket-storage';
import { cn } from '@/lib/utils';

// Customer status page: their number, how many are ahead, and the wait.
export default function TicketScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t } = useI18n();
  const [token, setToken] = useState<string | null | undefined>(undefined); // undefined = still reading storage
  const { ticket, notFound, offline, updatedAt, refetch } = useMyTicket(token ?? null);

  useEffect(() => {
    if (slug) loadTicket(slug).then(setToken);
  }, [slug]);

  // Buzz the phone when it becomes their turn, or when they're next.
  // (M6 adds real notifications for when the page is in the background.)
  const lastStatus = useRef<string | null>(null);
  useEffect(() => {
    if (!ticket) return;
    const moment = ticket.status === 'serving' ? 'serving' : ticket.status === 'waiting' && ticket.people_ahead === 0 ? 'next' : null;
    if (moment && lastStatus.current !== null && lastStatus.current !== moment) {
      try {
        Vibration.vibrate(moment === 'serving' ? [0, 500, 200, 500, 200, 500] : [0, 300]);
      } catch {}
    }
    lastStatus.current = moment ?? 'other';
  }, [ticket]);

  async function joinAgain() {
    await clearTicket(slug);
    router.replace(`/s/${slug}`);
  }

  if (token === undefined || (token && !ticket && !notFound)) {
    return (
      <Screen>
        <View className="items-center py-24">
          <ActivityIndicator />
        </View>
      </Screen>
    );
  }

  if (!token || notFound || !ticket) {
    return (
      <Screen>
        <StatusBlock icon={<TicketIcon size={26} color="#71717a" />} title={t('ticketNotFound')} hint={t('ticketNotFoundHint')}>
          <Button size="xl" className="mt-2 self-stretch" onPress={joinAgain}>
            <Text>{t('joinQueue')}</Text>
          </Button>
        </StatusBlock>
      </Screen>
    );
  }

  const active = ticket.status === 'waiting' || ticket.status === 'serving';

  return (
    <Screen>
      <View className="gap-1 pt-2">
        <Text className="text-sm font-medium uppercase tracking-wider text-muted-foreground">{t('yourTicket')}</Text>
        <Text className="text-2xl font-semibold tracking-tight">{ticket.shop_name}</Text>
      </View>

      {ticket.status === 'serving' ? <YourTurn ticket={ticket} /> : null}
      {ticket.status === 'waiting' ? <Waiting ticket={ticket} /> : null}
      {!active ? <Finished ticket={ticket} onJoinAgain={joinAgain} /> : null}

      {ticket.status === 'waiting' && !ticket.shop_is_open ? (
        <View className="rounded-xl bg-amber-500/10 px-4 py-3">
          <Text className="text-sm text-amber-700">{t('shopClosedWhileWaiting')}</Text>
        </View>
      ) : null}

      {ticket.status === 'waiting' ? (
        <LeaveButton
          onLeave={async () => {
            if (!supabase) return;
            await supabase.rpc('leave_queue', { p_token: token });
            await refetch();
          }}
        />
      ) : null}

      {active ? <Freshness offline={offline} updatedAt={updatedAt} /> : null}
    </Screen>
  );
}

function Waiting({ ticket }: { ticket: TicketStatus }) {
  const { t } = useI18n();
  const ahead = ticket.people_ahead;
  const isNext = ahead === 0;

  return (
    <View className="gap-4">
      {/* The one number a waiting customer cares about: how many are ahead of me. */}
      <View
        className={cn(
          'items-center gap-1 rounded-3xl border px-6 pb-8 pt-8',
          isNext ? 'border-primary bg-primary/5' : 'border-border bg-card'
        )}>
        {isNext ? (
          <View className="items-center gap-2 py-6">
            <Text className="text-4xl font-semibold tracking-tight text-primary">{t('youAreNext')}</Text>
            <Text className="text-center text-muted-foreground">{t('youAreNextHint')}</Text>
          </View>
        ) : (
          <>
            <Text className="text-[112px] font-semibold leading-[116px] tracking-tighter text-primary">{ahead}</Text>
            <Text className="text-lg font-medium">{t(ahead === 1 ? 'aheadLabelOne' : 'aheadLabelMany')}</Text>
          </>
        )}
      </View>

      <View className="flex-row rounded-2xl border border-border py-4">
        <View className="flex-1 items-center gap-0.5">
          <Text className="text-2xl font-semibold">#{ticket.ticket_no}</Text>
          <Text className="text-xs text-muted-foreground">{t('yourNumber')}</Text>
        </View>
        <View className="w-px bg-border" />
        <View className="flex-1 items-center gap-0.5">
          <Text className="text-2xl font-semibold">
            {ticket.est_wait_min < 1 ? t('lessThanMin') : t('aboutMin', { n: ticket.est_wait_min })}
          </Text>
          <Text className="text-xs text-muted-foreground">{t('estWait')}</Text>
        </View>
      </View>
    </View>
  );
}

function YourTurn({ ticket }: { ticket: TicketStatus }) {
  const { t } = useI18n();
  return (
    <View className="items-center gap-2 rounded-3xl bg-primary px-6 pb-8 pt-8">
      <Text className="text-[112px] font-semibold leading-[116px] tracking-tighter text-primary-foreground">
        {ticket.ticket_no}
      </Text>
      <Text className="text-2xl font-semibold text-primary-foreground">{t('yourTurn')}</Text>
      <Text className="text-primary-foreground/80">{t('yourTurnHint')}</Text>
    </View>
  );
}

function Finished({ ticket, onJoinAgain }: { ticket: TicketStatus; onJoinAgain: () => void }) {
  const { t } = useI18n();
  const content = {
    done: { icon: <CheckCircle2 size={26} color="#0f766e" />, title: t('statusDone'), hint: t('statusDoneHint') },
    no_show: { icon: <UserX size={26} color="#71717a" />, title: t('statusNoShow'), hint: t('statusNoShowHint') },
    left: { icon: <LogOut size={26} color="#71717a" />, title: t('statusLeft'), hint: t('statusLeftHint') },
  }[ticket.status as 'done' | 'no_show' | 'left'];

  return (
    <StatusBlock icon={content.icon} title={`#${ticket.ticket_no} · ${content.title}`} hint={content.hint}>
      <Button size="xl" className="mt-2 self-stretch" onPress={onJoinAgain}>
        <Text>{t('joinAgain')}</Text>
      </Button>
    </StatusBlock>
  );
}

// Two-step leave so a stray tap can't throw away someone's place.
function LeaveButton({ onLeave }: { onLeave: () => Promise<void> }) {
  const { t } = useI18n();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!confirming) {
    return (
      <Button variant="ghost" onPress={() => setConfirming(true)}>
        <Text className="text-muted-foreground">{t('leaveQueue')}</Text>
      </Button>
    );
  }
  return (
    <View className="gap-3 rounded-2xl border border-border p-4">
      <Text className="text-center font-medium">{t('leaveConfirm')}</Text>
      <View className="flex-row gap-3">
        <Button variant="outline" size="lg" className="flex-1 rounded-xl" onPress={() => setConfirming(false)} disabled={busy}>
          <Text>{t('stay')}</Text>
        </Button>
        <Button
          variant="destructive"
          size="lg"
          className="flex-1 rounded-xl"
          disabled={busy}
          onPress={async () => {
            setBusy(true);
            await onLeave();
            setBusy(false);
            setConfirming(false);
          }}>
          {busy ? <ActivityIndicator color="#ffffff" /> : <Text>{t('yesLeave')}</Text>}
        </Button>
      </View>
    </View>
  );
}

// "Updated 5s ago" so people can trust the screen, and a clear offline warning.
function Freshness({ offline, updatedAt }: { offline: boolean; updatedAt: number | null }) {
  const { t } = useI18n();
  const now = useNow(5_000);
  if (offline) {
    return (
      <View className="flex-row items-center justify-center gap-2">
        <WifiOff size={14} color="#b45309" />
        <Text className="text-sm text-amber-700">{t('offline')}</Text>
      </View>
    );
  }
  const secs = updatedAt ? Math.max(0, Math.round((now - updatedAt) / 1000)) : 0;
  return (
    <View className="items-center gap-1">
      <Text className="text-center text-sm text-muted-foreground">{t('keepOpen')}</Text>
      <Text className="text-center text-xs text-muted-foreground/70">{t('updatedAgo', { n: secs })}</Text>
    </View>
  );
}
