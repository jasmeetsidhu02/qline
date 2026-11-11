import { ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type ScreenProps = { title?: string; subtitle?: string; children: ReactNode };

// Page shell: safe area, one centred column, and the language switch.
export function Screen({ title, subtitle, children }: ScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentContainerClassName="w-full max-w-md self-center px-5 pb-14 pt-3 gap-7"
        keyboardShouldPersistTaps="handled">
        <View className="flex-row items-start justify-between gap-4">
          <View className="flex-1 gap-1">
            {title ? <Text className="font-ui-sb text-[26px] leading-[32px] tracking-[-0.5px]">{title}</Text> : null}
            {subtitle ? <Text className="text-[15px] text-muted-foreground">{subtitle}</Text> : null}
          </View>
          <LanguageSwitch />
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function LanguageSwitch({ onDark }: { onDark?: boolean }) {
  const { t, toggle } = useI18n();
  return (
    <Pressable
      onPress={toggle}
      hitSlop={10}
      accessibilityRole="button"
      className={cn(
        'rounded-full border px-3.5 py-1.5 active:opacity-70',
        onDark ? 'border-ink-line' : 'border-border'
      )}>
      <Text className={cn('font-ui-md text-[13px]', onDark ? 'text-brass-soft' : 'text-muted-foreground')}>
        {t('switchLang')}
      </Text>
    </Pressable>
  );
}

// Heading above a group. Sentence case, quiet, with an optional note on the right.
export function SectionHeading({ children, note }: { children: ReactNode; note?: ReactNode }) {
  return (
    <View className="flex-row items-baseline justify-between gap-3">
      <Text className="font-ui-sb text-[17px] tracking-[-0.2px]">{children}</Text>
      {typeof note === 'string' ? <Text className="text-[13px] text-muted-foreground">{note}</Text> : note}
    </View>
  );
}
