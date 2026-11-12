import { router, useLocalSearchParams } from 'expo-router';
import { CalendarX, CheckCircle2, LogOut, Ticket as TicketIcon, UserX } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { NotifyCard } from '@/components/notify-card';
import { Numeral } from '@/components/numeral';
import { Screen } from '@/components/screen';
import { StatusBlock } from '@/components/status-block';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { TicketStatus, useMyTicket } from '@/hooks/use-my-ticket';
import { useNow } from '@/hooks/use-now';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { alertNow } from '@/lib/alert-sound';
import { resaveSubscription } from '@/lib/push';
import { clearTicket, loadTicket } from '@/lib/ticket-storage';

// What the customer watches while they wait.
export default function TicketScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t, lang } = useI18n();
  const [token, setToken] = useState<string | null | undefined>(undefined); // undefined = reading storage
  const { ticket, notFound, offline, updatedAt, refetch } = useMyTicket(token ?? null);

  useEffect(() => {
    if (slug) loadTicket(slug).then(setToken);
  }, [slug]);

  // Already allowed notifications on an earlier visit? Point them at this ticket.
  useEffect(() => {
    if (token) resaveSubscription(token, lang);
  }, [token, lang]);

  // Buzz when the turn arrives, or when nobody is left ahead.
  // (M6 adds notifications for when this page is not open.)
  const lastMoment = useRef<string | null>(null);
  useEffect(() => {
    if (!ticket) return;
    const moment =
      ticket.status === 'serving' ? 'serving' : ticket.status === 'waiting' && ticket.people_ahead === 0 ? 'next' : 'other';
    if (lastMoment.current !== null && lastMoment.current !== moment && moment !== 'other') {
      alertNow(moment === 'serving' ? 'turn' : 'next');
    }
    lastMoment.current = moment;
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
        <StatusBlock icon={<TicketIcon size={26} color="#5E6761" />} title={t('ticketNotFound')} hint={t('ticketNotFoundHint')}>
          <Button size="xl" className="mt-2 self-stretch" onPress={joinAgain}>
            <Text>{t('joinQueue')}</Text>
          </Button>
        </StatusBlock>
      </Screen>
    );
  }

  const active = ticket.status === 'waiting' || ticket.status === 'serving';

  return (
    <Screen title={ticket.shop_name}>
      {ticket.status === 'serving' ? <YourTurn ticket={ticket} /> : null}
      {ticket.status === 'waiting' ? <Waiting ticket={ticket} /> : null}
      {!active ? <Finished ticket={ticket} onJoinAgain={joinAgain} /> : null}

      {ticket.status === 'waiting' && !ticket.shop_is_open ? (
        <Text className="text-center text-[14px] leading-[20px] text-brass">{t('shopClosedWhileWaiting')}</Text>
      ) : null}

      {ticket.status === 'waiting' && token ? <NotifyCard token={token} /> : null}

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

  return (
    <View className="gap-6">
      <View className="min-h-[248px] items-center justify-center gap-2 rounded-[28px] bg-ink px-6 py-10">
        {ahead === 0 ? (
          <>
            <Text className="font-ui-sb text-[32px] leading-[38px] text-brass-soft">{t('youAreNext')}</Text>
            <Text className="text-center text-[15px] text-background/60">{t('youAreNextHint')}</Text>
          </>
        ) : (
          <>
            <Numeral size="xl" className="text-background">
              {ahead}
            </Numeral>
            <Text className="text-[17px] text-background/60">
              {t(ahead === 1 ? 'aheadLabelOne' : 'aheadLabelMany')}
            </Text>
          </>
        )}
      </View>

      <View className="items-center gap-1">
        <Text className="text-[17px]">{t('yourNumberIs', { n: ticket.ticket_no })}</Text>
        <Text className="text-[15px] text-muted-foreground">
          {ticket.est_wait_min < 1 ? t('lessThanMin') : t('aboutMin', { n: ticket.est_wait_min })}
        </Text>
      </View>
    </View>
  );
}

function YourTurn({ ticket }: { ticket: TicketStatus }) {
  const { t } = useI18n();
  return (
    <View className="min-h-[248px] items-center justify-center gap-3 rounded-[28px] bg-brass px-6 py-10">
      <Numeral size="xl" className="text-background">
        {ticket.ticket_no}
      </Numeral>
      <Text className="font-ui-sb text-[26px] leading-[32px] text-background">{t('yourTurn')}</Text>
      <Text className="text-center text-[15px] text-background/80">{t('yourTurnHint')}</Text>
    </View>
  );
}

function Finished({ ticket, onJoinAgain }: { ticket: TicketStatus; onJoinAgain: () => void }) {
  const { t } = useI18n();
  const content = {
    done: { icon: <CheckCircle2 size={26} color="#8F6424" />, title: t('statusDone'), hint: t('statusDoneHint') },
    no_show: { icon: <UserX size={26} color="#5E6761" />, title: t('statusNoShow'), hint: t('statusNoShowHint') },
    left: { icon: <LogOut size={26} color="#5E6761" />, title: t('statusLeft'), hint: t('statusLeftHint') },
    // The shop's day ended while this ticket was still open.
    expired: { icon: <CalendarX size={26} color="#5E6761" />, title: t('statusExpired'), hint: t('statusExpiredHint') },
  }[ticket.status as 'done' | 'no_show' | 'left' | 'expired'];

  return (
    <StatusBlock icon={content.icon} title={content.title} hint={content.hint}>
      <Button size="xl" className="mt-2 self-stretch" onPress={onJoinAgain}>
        <Text>{t('joinAgain')}</Text>
      </Button>
    </StatusBlock>
  );
}

// Two steps to leave, so a stray tap cannot throw away someone's place.
function LeaveButton({ onLeave }: { onLeave: () => Promise<void> }) {
  const { t } = useI18n();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!confirming) {
    return (
      <Pressable role="button" onPress={() => setConfirming(true)} hitSlop={10} className="items-center py-2 active:opacity-60">
        <Text className="text-[15px] text-muted-foreground underline">{t('leaveQueue')}</Text>
      </Pressable>
    );
  }
  return (
    <View className="gap-3 rounded-2xl bg-card p-5">
      <Text className="text-center text-[15px]">{t('leaveConfirm')}</Text>
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

// Proof the screen is current, so nobody refreshes it out of doubt.
function Freshness({ offline, updatedAt }: { offline: boolean; updatedAt: number | null }) {
  const { t } = useI18n();
  const now = useNow(5_000);
  if (offline) return <Text className="text-center text-[13px] text-brass">{t('offline')}</Text>;
  const secs = updatedAt ? Math.max(0, Math.round((now - updatedAt) / 1000)) : 0;
  return <Text className="text-center text-[13px] text-muted-foreground">{t('updatedAgo', { n: secs })}</Text>;
}
