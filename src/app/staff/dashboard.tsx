import { router } from 'expo-router';
import { LogOut, Settings } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { FormMessage } from '@/components/form';
import { NextButton } from '@/components/queue/next-button';
import { EmptyChair, ServingCard } from '@/components/queue/serving-card';
import { WaitingList } from '@/components/queue/waiting-list';
import { WalkInForm } from '@/components/queue/walk-in-form';
import { Screen, SectionLabel } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useNow } from '@/hooks/use-now';
import { useStaffQueue } from '@/hooks/use-staff-queue';
import { useAuth } from '@/lib/auth';
import { errorKey } from '@/lib/errors';
import { StringKey, useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const ICON = '#18181b';

// The barber's main screen: who is in the chair, who is next, one big button.
export default function Dashboard() {
  const { t } = useI18n();
  const { shop, refreshShop, signOut } = useAuth();
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
    // A normal table update. RLS policy "shops_members_update" only lets
    // members of this shop do it, so nobody else can close your shop.
    const { error } = await supabase.from('shops').update({ is_open: !shop.is_open }).eq('id', shop.id);
    if (error) setActionError(errorKey(error));
    else await refreshShop();
    setToggling(false);
  }

  const serving = queue?.serving ?? [];
  const waiting = queue?.waiting ?? [];
  const shownError = actionError ?? (loadError && !queue ? errorKey(loadError) : null);

  return (
    <Screen title={shop.name} subtitle={`/s/${shop.slug}`}>
      {/* Open / closed */}
      <View className="flex-row items-center justify-between gap-4 rounded-2xl bg-secondary px-4 py-3">
        <View className="flex-1 flex-row items-center gap-2.5">
          <View className={cn('h-2.5 w-2.5 rounded-full', shop.is_open ? 'bg-primary' : 'bg-muted-foreground/40')} />
          <View className="flex-1">
            <Text className="font-semibold">{t(shop.is_open ? 'shopOpen' : 'shopClosed')}</Text>
            <Text className="text-sm text-muted-foreground">
              {t(shop.is_open ? 'customersCanJoin' : 'customersCannotJoin')}
            </Text>
          </View>
        </View>
        <Button
          variant={shop.is_open ? 'outline' : 'default'}
          className="rounded-lg"
          onPress={toggleOpen}
          disabled={toggling}>
          {toggling ? (
            <ActivityIndicator color={shop.is_open ? ICON : '#ffffff'} />
          ) : (
            <Text>{t(shop.is_open ? 'closeShop' : 'openShop')}</Text>
          )}
        </Button>
      </View>

      <FormMessage>{shownError ? t(shownError) : null}</FormMessage>

      {!queue ? (
        <View className="items-center py-16">
          {loadError ? null : <ActivityIndicator />}
        </View>
      ) : (
        <>
          {/* In the chair */}
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

          {/* Today at a glance */}
          <View className="flex-row rounded-2xl border border-border py-4">
            <Stat value={waiting.length} label={t('waitingList')} />
            <View className="w-px bg-border" />
            <Stat value={queue.done_today} label={t('doneToday')} />
            <View className="w-px bg-border" />
            <Stat value={queue.no_show_today} label={t('noShows')} />
          </View>

          {/* The line */}
          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <SectionLabel>
                {t('waitingList')} · {waiting.length}
              </SectionLabel>
              <View className="flex-row items-center gap-1.5">
                <View className={cn('h-1.5 w-1.5 rounded-full', live ? 'bg-primary' : 'bg-amber-500')} />
                <Text className="text-xs text-muted-foreground">{t(live ? 'live' : 'reconnecting')}</Text>
              </View>
            </View>
            <WaitingList
              entries={waiting}
              nowMs={nowMs}
              busy={busy}
              shopOpen={shop.is_open}
              onCall={(id) => run(() => callNext(id))}
              onNoShow={(id) => run(() => finish(id, 'no_show'))}
            />
          </View>

          <WalkInForm onAdd={addWalkIn} />
        </>
      )}

      <View className="flex-row justify-center gap-2">
        <FooterLink label={t('settings')} onPress={() => router.push('/staff/settings')}>
          <Settings size={16} color="#71717a" />
        </FooterLink>
        <FooterLink label={t('signOut')} onPress={signOut}>
          <LogOut size={16} color="#71717a" />
        </FooterLink>
      </View>
    </Screen>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View className="flex-1 items-center gap-0.5">
      <Text className="text-2xl font-semibold">{value}</Text>
      <Text className="text-xs text-muted-foreground">{label}</Text>
    </View>
  );
}

function FooterLink({ label, onPress, children }: { label: string; onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable
      role="button"
      onPress={onPress}
      className="flex-row items-center gap-2 rounded-lg px-3 py-2.5 active:bg-accent">
      {children}
      <Text className="text-sm text-muted-foreground">{label}</Text>
    </Pressable>
  );
}
