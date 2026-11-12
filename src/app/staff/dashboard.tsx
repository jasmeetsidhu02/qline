import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { ChipSelect } from '@/components/chip-select';
import { FormMessage } from '@/components/form';
import { CustomerLinkCard } from '@/components/queue/customer-link-card';
import { NextButton } from '@/components/queue/next-button';
import { EmptyChair, ServingCard } from '@/components/queue/serving-card';
import { ShopSwitch } from '@/components/queue/shop-switch';
import { UndoBar, type LastAction } from '@/components/queue/undo-bar';
import { WaitingList } from '@/components/queue/waiting-list';
import { WalkInForm } from '@/components/queue/walk-in-form';
import { Screen, SectionHeading } from '@/components/screen';
import { StaffMenu } from '@/components/staff-menu';
import { Text } from '@/components/ui/text';
import { useNow } from '@/hooks/use-now';
import { useShopConfig } from '@/hooks/use-shop-config';
import { useStaffQueue } from '@/hooks/use-staff-queue';
import { useAuth } from '@/lib/auth';
import { errorKey } from '@/lib/errors';
import { StringKey, useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';

// The barber's screen. One dark block for who is in the chair, one brass
// button to call the next person, and the line underneath.
export default function Dashboard() {
  const { t } = useI18n();
  const { shop, refreshShop } = useAuth();
  const { queue, error: loadError, live, clockOffsetMs, callNext, finish, undo, addWalkIn } = useStaffQueue(shop?.id);
  const nowMs = useNow() + clockOffsetMs;
  const { barbers } = useShopConfig(shop?.id);
  // Who is standing at the chair. Only asked when customers pick a barber.
  const [callingAs, setCallingAs] = useState<string | null>(null);

  const [busy, setBusy] = useState(false); // a queue action is in flight
  const [toggling, setToggling] = useState(false);
  const [actionError, setActionError] = useState<StringKey | null>(null);
  // The last Done / No-show, so a wrong tap can be taken back.
  const [lastAction, setLastAction] = useState<LastAction | null>(null);

  if (!shop) return null; // the staff layout redirects before this happens

  // Runs one queue action; blocks double-taps until it finishes.
  async function run(action: () => Promise<{ code?: string; message?: string } | null>) {
    if (busy) return null;
    setBusy(true);
    setActionError(null);
    const err = await action();
    if (err) setActionError(errorKey(err));
    setBusy(false);
    return err ?? null;
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
  // Ends a customer and keeps the undo within reach.
  async function endWith(entryId: string, ticketNo: number, kind: 'done' | 'no_show') {
    const err = await run(() => finish(entryId, kind));
    // Only offer the undo for something that really happened.
    if (!err) setLastAction({ entryId, ticketNo, kind });
  }

  // A cut taking more than twice the usual time means the barber most
  // likely forgot to tap Done, so the chair quietly says so.
  const nudgeAfterMin = Math.max(30, shop.default_service_minutes * 2);

  const activeBarbers = barbers.filter((b) => b.is_active);
  const picksBarber = shop.line_mode === 'pick_barber' && activeBarbers.length > 1;

  // A preview of who "Next" will call: the chosen barber's own customers
  // first, then whoever is happy with anyone. The database decides for real.
  const callingName = activeBarbers.find((b) => b.id === callingAs)?.name ?? null;
  const nextUp = callingName
    ? (waiting.find((e) => e.barber === callingName) ?? waiting.find((e) => !e.barber))
    : waiting[0];

  const shownError = actionError ?? (loadError && !queue ? errorKey(loadError) : null);

  return (
    <Screen title={shop.name} action={<StaffMenu />}>
      {/* Open or closed: the control that decides whether anyone can join */}
      <ShopSwitch open={shop.is_open} busy={toggling} onToggle={toggleOpen} />

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
                  nudgeAfterMin={nudgeAfterMin}
                  onDone={() => endWith(entry.id, entry.ticket_no, 'done')}
                  onNoShow={() => endWith(entry.id, entry.ticket_no, 'no_show')}
                />
              ))
            )}
          </View>

          {picksBarber ? (
            <View className="gap-3 rounded-[22px] bg-card px-5 py-4">
              <ChipSelect
                big
                label={t('whoIsCalling')}
                value={callingAs}
                onChange={setCallingAs}
                choices={[{ id: null, label: t('anyBarber') }, ...activeBarbers.map((b) => ({ id: b.id, label: b.name }))]}
              />
            </View>
          ) : null}

          {lastAction ? (
            <UndoBar
              action={lastAction}
              busy={busy}
              onUndo={async () => {
                const err = await undo(lastAction.entryId);
                if (err) setActionError(errorKey(err));
                setLastAction(null);
              }}
            />
          ) : null}

          <NextButton
            nextEntry={nextUp}
            hasServing={serving.length > 0}
            busy={busy}
            onPress={() => run(() => callNext(null, callingAs))}
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
              onCall={(id) => run(() => callNext(id, callingAs))}
              onNoShow={(id, ticketNo) => endWith(id, ticketNo, 'no_show')}
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
