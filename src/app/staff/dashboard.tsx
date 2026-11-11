import { router } from 'expo-router';
import { Check, LogOut, Settings, UserPlus, UserX } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { FormMessage } from '@/components/form';
import { Screen, SectionLabel } from '@/components/screen';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/lib/auth';
import { errorKey } from '@/lib/errors';
import { StringKey, useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const ICON = '#18181b';

// Barber dashboard. M2: real shop + open/close. M3 wires the queue buttons.
export default function Dashboard() {
  const { t } = useI18n();
  const { shop, refreshShop, signOut } = useAuth();
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<StringKey | null>(null);

  if (!shop) return null; // the staff layout redirects before this happens

  async function toggleOpen() {
    if (!supabase || !shop) return;
    setToggling(true);
    setError(null);
    // A normal table update. RLS policy "shops_members_update" only lets
    // members of this shop do it, so nobody else can close your shop.
    const { error } = await supabase.from('shops').update({ is_open: !shop.is_open }).eq('id', shop.id);
    if (error) setError(errorKey(error));
    else await refreshShop();
    setToggling(false);
  }

  return (
    <Screen title={shop.name} subtitle={`/s/${shop.slug}`}>
      <Card>
        <CardContent className="flex-row items-center justify-between gap-4">
          <View className="flex-1 gap-1">
            <View className="flex-row items-center gap-2">
              <View className={cn('h-2.5 w-2.5 rounded-full', shop.is_open ? 'bg-primary' : 'bg-muted-foreground/40')} />
              <Text className="font-semibold">{t(shop.is_open ? 'shopOpen' : 'shopClosed')}</Text>
            </View>
            <Text className="text-sm text-muted-foreground">
              {t(shop.is_open ? 'customersCanJoin' : 'customersCannotJoin')}
            </Text>
          </View>
          <Button variant={shop.is_open ? 'outline' : 'default'} onPress={toggleOpen} disabled={toggling}>
            {toggling ? (
              <ActivityIndicator color={shop.is_open ? ICON : '#ffffff'} />
            ) : (
              <Text>{t(shop.is_open ? 'closeShop' : 'openShop')}</Text>
            )}
          </Button>
        </CardContent>
      </Card>
      <FormMessage>{error ? t(error) : null}</FormMessage>

      <Card>
        <CardContent className="gap-1">
          <View className="flex-row items-center justify-between">
            <SectionLabel>{t('nowServing')}</SectionLabel>
            <Badge variant="secondary">
              <Text>0 waiting</Text>
            </Badge>
          </View>
          <Text className="text-6xl font-semibold tracking-tighter">--</Text>
        </CardContent>
      </Card>

      {/* M3: these buttons get wired to the queue */}
      <Button size="xl" className="h-20" disabled>
        <Text className="text-xl">{t('next')}</Text>
      </Button>
      <View className="flex-row gap-3">
        <Button variant="outline" size="xl" className="flex-1" disabled>
          <Check size={18} color={ICON} />
          <Text>{t('done')}</Text>
        </Button>
        <Button variant="outline" size="xl" className="flex-1" disabled>
          <UserX size={18} color={ICON} />
          <Text>{t('noShow')}</Text>
        </Button>
      </View>
      <Button variant="secondary" size="xl" disabled>
        <UserPlus size={18} color={ICON} />
        <Text>{t('addWalkIn')}</Text>
      </Button>

      <View className="flex-row justify-center gap-2">
        <Button variant="ghost" onPress={() => router.push('/staff/settings')}>
          <Settings size={16} color={ICON} />
          <Text>{t('settings')}</Text>
        </Button>
        <Button variant="ghost" onPress={signOut}>
          <LogOut size={16} color={ICON} />
          <Text>{t('signOut')}</Text>
        </Button>
      </View>
    </Screen>
  );
}
