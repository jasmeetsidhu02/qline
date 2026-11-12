import { ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

/**
 * A panel that slides up from the bottom of the screen. Used for the staff
 * menu and the language picker. Built on React Native's own Modal so it
 * behaves the same on a phone and in a browser.
 */
export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      {/* Tapping anywhere outside closes it. */}
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose} accessibilityLabel="Close">
        <Pressable
          // Swallows taps so they do not reach the backdrop behind.
          onPress={(e) => e.stopPropagation()}
          className="w-full max-w-md self-center rounded-t-3xl bg-background px-5 pb-10 pt-4">
          <View className="mb-4 h-1 w-12 self-center rounded-full bg-muted-foreground/25" />
          {title ? <Text className="mb-3 font-ui-sb text-[19px] tracking-[-0.3px]">{title}</Text> : null}
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function SheetItem({
  label,
  detail,
  icon,
  onPress,
  tone = 'default',
}: {
  label: string;
  detail?: string;
  icon?: ReactNode;
  onPress: () => void;
  tone?: 'default' | 'danger';
}) {
  return (
    <Pressable
      role="button"
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-xl px-3 py-4 active:bg-accent">
      {icon}
      <Text className={cn('flex-1 text-[17px]', tone === 'danger' ? 'text-destructive' : 'text-foreground')}>
        {label}
      </Text>
      {detail ? <Text className="text-[15px] text-muted-foreground">{detail}</Text> : null}
    </Pressable>
  );
}
