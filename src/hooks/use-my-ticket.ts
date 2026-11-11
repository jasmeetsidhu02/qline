import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { supabase } from '@/lib/supabase';

export type TicketStatus = {
  ticket_no: number;
  status: 'waiting' | 'serving' | 'done' | 'no_show' | 'left';
  people_ahead: number;
  est_wait_min: number;
  shop_name: string;
  shop_slug: string;
  shop_id: string;
  shop_is_open: boolean;
  now_serving: number[];
};

// Keeps one customer's ticket up to date. Same idea as the staff dashboard,
// but customers can't see the queue table (it has phone numbers), so:
//   1. Realtime on queue_signals: a tiny public counter that goes up whenever
//      this shop's queue changes. When it ticks, we re-ask get_my_status.
//   2. Refetch when the tab/app comes back to the front (people switch to
//      WhatsApp while waiting, and phones freeze background tabs).
//   3. Refetch every 15 seconds as a safety net on weak 4G.
export function useMyTicket(token: string | null) {
  const [ticket, setTicket] = useState<TicketStatus | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [offline, setOffline] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const latest = useRef(0);

  const refetch = useCallback(async () => {
    if (!supabase || !token) return;
    const mine = ++latest.current;
    const { data, error } = await supabase.rpc('get_my_status', { p_token: token });
    if (mine !== latest.current) return;
    if (error) {
      setOffline(true); // keep showing the last good status
      return;
    }
    setOffline(false);
    setUpdatedAt(Date.now());
    if (!data) setNotFound(true);
    else {
      setNotFound(false);
      setTicket(data as TicketStatus);
    }
  }, [token]);

  // Initial load + safety-net timer + refetch on focus.
  useEffect(() => {
    if (!token) return;
    refetch();
    const timer = setInterval(refetch, 15_000);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refetch();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [token, refetch]);

  // Realtime, once we know which shop this ticket belongs to.
  const shopId = ticket?.shop_id;
  const finished = ticket ? !['waiting', 'serving'].includes(ticket.status) : false;
  useEffect(() => {
    if (!supabase || !shopId || finished) return;
    const client = supabase;
    const channel = client
      .channel(`ticket-${shopId}-${token}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queue_signals', filter: `shop_id=eq.${shopId}` },
        () => refetch()
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') refetch();
      });
    return () => {
      client.removeChannel(channel);
    };
  }, [shopId, finished, token, refetch]);

  return { ticket, notFound, offline, updatedAt, refetch };
}
