import { ActivityIndicator, Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

// Open or closed, as a card the barber can hit without looking.
// This is the one control that decides whether customers can join at all,
// so it says what it means in words rather than relying on a small dot.
export function ShopSwitch({ open, busy, onToggle }: { open: boolean; busy: boolean; onToggle: () => void }) {
  const { t } = useI18n();
  return (
    <Pressable
      role="switch"
      accessibilityState={{ checked: open }}
      accessibilityLabel={t(open ? 'closeShop' : 'openShop')}
      onPress={onToggle}
      disabled={busy}
      className={cn(
        'flex-row items-center gap-4 rounded-[22px] border px-5 py-4 active:opacity-80',
        open ? 'border-brass/35 bg-brass/10' : 'border-border bg-card'
      )}>
      <View className="flex-1 gap-1">
        <Text className={cn('font-ui-sb text-[19px]', open ? 'text-brass' : 'text-muted-foreground')}>
          {t(open ? 'shopIsOpen' : 'shopIsClosed')}
        </Text>
        <Text className="text-[14px] leading-[19px] text-muted-foreground">
          {t(open ? 'shopOpenHint' : 'shopClosedHint')}
        </Text>
      </View>

      {busy ? (
        <ActivityIndicator />
      ) : (
        <View className="items-end gap-1.5">
          {/* A real-looking switch: the shape people already know. */}
          <View className={cn('h-8 w-14 justify-center rounded-full px-1', open ? 'bg-brass' : 'bg-muted-foreground/30')}>
            <View className={cn('h-6 w-6 rounded-full bg-background', open && 'self-end')} />
          </View>
          <Text className="text-[12px] text-muted-foreground">{t(open ? 'tapToClose' : 'tapToOpen')}</Text>
        </View>
      )}
    </Pressable>
  );
}
