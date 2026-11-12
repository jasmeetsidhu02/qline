import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { supabase } from '@/lib/supabase';

export type QueueEntry = {
  id: string;
  ticket_no: number;
  name: string;
  phone: string | null;
  source: 'qr' | 'walk_in';
  joined_at: string;
  called_at: string | null;
  /** What they asked for, when the shop has services set up. */
  service: string | null;
  /** The barber they asked for, or the one serving them. */
  barber: string | null;
};

export type StaffQueue = {
  serving: QueueEntry[];
  waiting: QueueEntry[];
  done_today: number;
  no_show_today: number;
  server_now: string;
};

type RpcError = { code?: string; message?: string } | null;

// Loads the shop's queue and keeps it fresh three ways, because any one of
// them can fail on a cheap phone with a weak signal:
//   1. Realtime: Supabase pushes a message whenever a queue row changes.
//   2. On focus: refetch whenever the app/tab comes back to the front.
//   3. Safety net: refetch every 20 seconds no matter what.
// In all three cases we simply reload the whole (small) queue. That's far
// harder to get wrong than patching the list row by row.
export function useStaffQueue(shopId: string | undefined) {
  const [queue, setQueue] = useState<StaffQueue | null>(null);
  const [error, setError] = useState<RpcError>(null);
  const [live, setLive] = useState(false);
  // server time minus phone time, so durations are right on a wrong clock
  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const latest = useRef(0);

  const refetch = useCallback(async () => {
    if (!supabase || !shopId) return;
    const mine = ++latest.current;
    const { data, error } = await supabase.rpc('get_staff_queue', { p_shop_id: shopId });
    if (mine !== latest.current) return; // a newer request already answered
    if (error) {
      setError(error);
      return;
    }
    setError(null);
    setQueue(data as StaffQueue);
    setClockOffsetMs(new Date(data.server_now).getTime() - Date.now());
  }, [shopId]);

  useEffect(() => {
    if (!supabase || !shopId) return;
    const client = supabase;
    // Yesterday never gets a proper ending in a real shop: the last customer
    // is still "in the chair" when the barber locks up. Clear those off
    // before showing today, so the board starts honest every morning.
    client.rpc('close_old_days', { p_shop_id: shopId }).then(() => refetch());
    refetch();

    const channel = client
      .channel(`staff-queue-${shopId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queue_entries', filter: `shop_id=eq.${shopId}` },
        () => refetch()
      )
      .subscribe((status) => {
        setLive(status === 'SUBSCRIBED');
        if (status === 'SUBSCRIBED') refetch(); // catch anything missed while reconnecting
      });

    const appState = AppState.addEventListener('change', (s) => {
      if (s === 'active') refetch();
    });
    const timer = setInterval(refetch, 20_000);

    return () => {
      client.removeChannel(channel);
      appState.remove();
      clearInterval(timer);
    };
  }, [shopId, refetch]);

  // Each action calls its database function, then reloads the queue.
  // Returns the error (or null) so the screen can show a message.
  const act = useCallback(
    async (fn: string, args: Record<string, unknown>): Promise<RpcError> => {
      if (!supabase) return { message: 'NOT_CONFIGURED' };
      const { error } = await supabase.rpc(fn, args);
      await refetch();
      // Tell the sender to push whatever this action made due. Deliberately
      // not awaited: the barber's screen must never wait on a notification,
      // and anything missed is picked up by the next action.
      if (!error && shopId) {
        supabase.functions.invoke('notify', { body: { shop_id: shopId } }).catch(() => {});
      }
      return error;
    },
    [refetch, shopId]
  );

  // barberId says which chair is free, so shops where customers pick a
  // barber call that barber's own customers first.
  const callNext = useCallback(
    (entryId?: string | null, barberId?: string | null) =>
      act('call_next', { p_shop_id: shopId, p_entry_id: entryId ?? null, p_barber_id: barberId ?? null }),
    [act, shopId]
  );
  const finish = useCallback(
    (entryId: string, status: 'done' | 'no_show') => act('finish_entry', { p_entry_id: entryId, p_status: status }),
    [act]
  );
  // Take back a wrong Done or No-show. The database allows it for 15 minutes.
  const undo = useCallback((entryId: string) => act('undo_entry', { p_entry_id: entryId }), [act]);
  const addWalkIn = useCallback(
    (name: string, phone: string) => act('add_walk_in', { p_shop_id: shopId, p_name: name, p_phone: phone || null }),
    [act, shopId]
  );

  return { queue, error, live, clockOffsetMs, refetch, callNext, finish, undo, addWalkIn };
}
