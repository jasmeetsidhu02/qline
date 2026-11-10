import { ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { useI18n } from '@/lib/i18n';

type ScreenProps = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
};

// Shared page shell: safe area, centered column, title + language toggle.
export function Screen({ title, subtitle, children }: ScreenProps) {
  const { t, toggle } = useI18n();
  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="w-full max-w-md self-center px-5 pb-10 pt-4 gap-6">
        <View className="flex-row items-start justify-between gap-4">
          <View className="flex-1 gap-1">
            {title ? <Text className="text-2xl font-semibold tracking-tight">{title}</Text> : null}
            {subtitle ? <Text className="text-muted-foreground">{subtitle}</Text> : null}
          </View>
          <Pressable
            onPress={toggle}
            hitSlop={12}
            accessibilityRole="button"
            className="rounded-full border border-border px-3 py-1.5 active:bg-accent">
            <Text className="text-sm font-medium">{t('switchLang')}</Text>
          </Pressable>
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

// Small uppercase label used above groups of content.
export function SectionLabel({ children }: { children: ReactNode }) {
  return <Text className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{children}</Text>;
}
