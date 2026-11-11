import { ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';

// Centered icon + title + hint, for empty / closed / finished states.
export function StatusBlock({ icon, title, hint, children }: { icon: ReactNode; title: string; hint: string; children?: ReactNode }) {
  return (
    <View className="items-center gap-3 rounded-2xl bg-card px-6 py-12">
      <View className="h-14 w-14 items-center justify-center rounded-full bg-secondary">{icon}</View>
      <Text className="text-center font-ui-sb text-[19px]">{title}</Text>
      <Text className="max-w-[260px] text-center text-[15px] leading-[22px] text-muted-foreground">{hint}</Text>
      {children}
    </View>
  );
}
