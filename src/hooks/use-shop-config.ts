import { useCallback, useEffect, useState } from 'react';

import type { Lang } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';

export type Barber = { id: string; name: string; is_active: boolean; sort_order: number };
export type Service = {
  id: string;
  name_en: string;
  name_hi: string | null;
  name_pa: string | null;
  minutes: number;
  is_active: boolean;
  sort_order: number;
};

/** The service's name in the reader's language, falling back to English. */
export function serviceName(service: Service, lang: Lang) {
  const byLang = lang === 'hi' ? service.name_hi : lang === 'pa' ? service.name_pa : service.name_en;
  return byLang?.trim() || service.name_en;
}

type Err = { message?: string } | null;

/**
 * The shop's barbers and services. Staff write to these tables directly —
 * the row-security rules already limit writes to that shop's members, so no
 * database function is needed.
 */
export function useShopConfig(shopId: string | undefined) {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!supabase || !shopId) return;
    const [b, s] = await Promise.all([
      supabase.from('barbers').select('*').eq('shop_id', shopId).order('sort_order').order('created_at'),
      supabase.from('services').select('*').eq('shop_id', shopId).order('sort_order').order('created_at'),
    ]);
    setBarbers((b.data as Barber[]) ?? []);
    setServices((s.data as Service[]) ?? []);
    setLoading(false);
  }, [shopId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const addBarber = useCallback(
    async (name: string): Promise<Err> => {
      if (!supabase || !shopId) return { message: 'NOT_CONFIGURED' };
      const { error } = await supabase
        .from('barbers')
        .insert({ shop_id: shopId, name: name.trim(), sort_order: barbers.length });
      await refetch();
      return error;
    },
    [shopId, barbers.length, refetch]
  );

  const updateBarber = useCallback(
    async (id: string, patch: Partial<Barber>): Promise<Err> => {
      if (!supabase) return { message: 'NOT_CONFIGURED' };
      const { error } = await supabase.from('barbers').update(patch).eq('id', id);
      await refetch();
      return error;
    },
    [refetch]
  );

  const removeBarber = useCallback(
    async (id: string): Promise<Err> => {
      if (!supabase) return { message: 'NOT_CONFIGURED' };
      const { error } = await supabase.from('barbers').delete().eq('id', id);
      await refetch();
      return error;
    },
    [refetch]
  );

  const addService = useCallback(
    async (name: string, minutes: number): Promise<Err> => {
      if (!supabase || !shopId) return { message: 'NOT_CONFIGURED' };
      const trimmed = name.trim();
      // The same text goes in all three languages to start with; the shop can
      // refine each one later. Better than showing a blank name to a customer
      // reading in another language.
      const { error } = await supabase.from('services').insert({
        shop_id: shopId,
        name_en: trimmed,
        name_hi: trimmed,
        name_pa: trimmed,
        minutes,
        sort_order: services.length,
      });
      await refetch();
      return error;
    },
    [shopId, services.length, refetch]
  );

  const updateService = useCallback(
    async (id: string, patch: Partial<Service>): Promise<Err> => {
      if (!supabase) return { message: 'NOT_CONFIGURED' };
      const { error } = await supabase.from('services').update(patch).eq('id', id);
      await refetch();
      return error;
    },
    [refetch]
  );

  const removeService = useCallback(
    async (id: string): Promise<Err> => {
      if (!supabase) return { message: 'NOT_CONFIGURED' };
      const { error } = await supabase.from('services').delete().eq('id', id);
      await refetch();
      return error;
    },
    [refetch]
  );

  return {
    barbers,
    services,
    loading,
    refetch,
    addBarber,
    updateBarber,
    removeBarber,
    addService,
    updateService,
    removeService,
  };
}
