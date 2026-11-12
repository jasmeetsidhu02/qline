import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { FormMessage } from '@/components/form';
import { CustomerLinkCard } from '@/components/queue/customer-link-card';
import { NextButton } from '@/components/queue/next-button';
import { EmptyChair, ServingCard } from '@/components/queue/serving-card';
import { WaitingList } from '@/components/queue/waiting-list';
import { WalkInForm } from '@/components/queue/walk-in-form';
import { Screen, SectionHeading } from '@/components/screen';
import { StaffMenu } from '@/components/staff-menu';
import { Text } from '@/components/ui/text';
import { useNow } from '@/hooks/use-now';
import { useStaffQueue } from '@/hooks/use-staff-queue';
import { useAuth } from '@/lib/auth';
import { errorKey } from '@/lib/errors';
import { StringKey, useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

// The barber's screen. One dark block for who is in the chair, one brass
// button to call the next person, and the line underneath.
export default function Dashboard() {
  const { t } = useI18n();
  const { shop, refreshShop } = useAuth();
  const { queue, error: loadError, live, clockOffsetMs, callNext, finish, addWalkIn } = useStaffQueue(shop?.id);
  const nowMs = useNow() + clockOffsetMs;

  const [busy, setBusy] = useState(false); // a queue action is in flight
  const [toggling, setToggling] = useState(false);
  const [actionError, setActionError] = useState<StringKey | null>(null);

  if (!shop) return null; // the staff layout redirects before this happens

  // Runs one queue action; blocks double-taps until it finishes.
  async function run(action: () => Promise<{ code?: string; message?: string } | null>) {
    if (busy) return;
    setBusy(true);
    setActionError(null);
    const err = await action();
    if (err) setActionError(errorKey(err));
    setBusy(false);
  }

  async function toggleOpen() {
    if (!supabase || !shop) return;
    setToggling(true);
    setActionError(null);
    // RLS policy "shops_members_update" means only this shop's staff can do it.
    const { error } = await supabase.from('shops').update({ is_open: !shop.is_open }).eq('id', shop.id);
    if (error) setActionError(errorKey(error));
    else await refreshShop();
    setToggling(false);
  }

  const serving = queue?.serving ?? [];
  const waiting = queue?.waiting ?? [];
  const shownError = actionError ?? (loadError && !queue ? errorKey(loadError) : null);

  return (
    <Screen title={shop.name} action={<StaffMenu />}>
      {/* Open or closed, and the switch for it */}
      <Pressable
        role="button"
        accessibilityLabel={t(shop.is_open ? 'closeShop' : 'openShop')}
        onPress={toggleOpen}
        disabled={toggling}
        className="-mt-3 flex-row items-center gap-3 active:opacity-60">
        <View className={cn('h-2 w-2 rounded-full', shop.is_open ? 'bg-brass' : 'bg-muted-foreground/40')} />
        <Text className="font-ui-md text-[15px]">{t(shop.is_open ? 'shopOpen' : 'shopClosed')}</Text>
        {toggling ? (
          <ActivityIndicator size="small" />
        ) : (
          <Text className="text-[15px] text-muted-foreground underline">
            {t(shop.is_open ? 'closeShop' : 'openShop')}
          </Text>
        )}
      </Pressable>

      <FormMessage>{shownError ? t(shownError) : null}</FormMessage>

      {!queue ? (
        <View className="items-center py-20">{loadError ? null : <ActivityIndicator />}</View>
      ) : (
        <>
          <View className="gap-3">
            {serving.length === 0 ? (
              <EmptyChair />
            ) : (
              serving.map((entry) => (
                <ServingCard
                  key={entry.id}
                  entry={entry}
                  nowMs={nowMs}
                  compact={serving.length > 1}
                  busy={busy}
                  onDone={() => run(() => finish(entry.id, 'done'))}
                  onNoShow={() => run(() => finish(entry.id, 'no_show'))}
                />
              ))
            )}
          </View>

          <NextButton
            nextEntry={waiting[0]}
            hasServing={serving.length > 0}
            busy={busy}
            onPress={() => run(() => callNext())}
          />

          <View className="gap-3">
            <SectionHeading
              note={
                waiting.length || !live ? (
                  <View className="flex-row items-center gap-2">
                    {!live ? <View className="h-1.5 w-1.5 rounded-full bg-brass" /> : null}
                    <Text className="text-[13px] text-muted-foreground">
                      {waiting.length ? t('waitingCount', { n: waiting.length }) : t('reconnecting')}
                    </Text>
                  </View>
                ) : undefined
              }>
              {t('waitingList')}
            </SectionHeading>
            <WaitingList
              entries={waiting}
              nowMs={nowMs}
              busy={busy}
              shopOpen={shop.is_open}
              onCall={(id) => run(() => callNext(id))}
              onNoShow={(id) => run(() => finish(id, 'no_show'))}
            />
            <WalkInForm onAdd={addWalkIn} />
          </View>

          <CustomerLinkCard slug={shop.slug} shopName={shop.name} />

          <Text className="text-center text-[14px] text-muted-foreground">
            {t('todaySummary', { done: queue.done_today, noShow: queue.no_show_today })}
          </Text>
        </>
      )}

    </Screen>
  );
}
