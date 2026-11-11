import { ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';

// Centered icon + title + hint, for empty / closed / finished states.
export function StatusBlock({ icon, title, hint, children }: { icon: ReactNode; title: string; hint: string; children?: ReactNode }) {
  return (
    <View className="items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-12">
      <View className="h-14 w-14 items-center justify-center rounded-full bg-secondary">{icon}</View>
      <Text className="text-center text-lg font-semibold">{title}</Text>
      <Text className="text-center text-muted-foreground">{hint}</Text>
      {children}
    </View>
  );
}
