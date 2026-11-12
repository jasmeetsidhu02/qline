import { ReactNode } from 'react';
import { View } from 'react-native';

import { LanguagePicker } from '@/components/language-picker';
import { Text } from '@/components/ui/text';

// The dark plate a customer sees at the top of every page of their visit.
// It carries the shop's name, so a person who scanned a code on a wall can
// see straight away that they are in the right place.
export function ShopHeader({
  shopName,
  subtitle,
  children,
}: {
  shopName: string;
  subtitle?: string;
  /** A live detail, such as how many are in the line right now. */
  children?: ReactNode;
}) {
  return (
    <View className="gap-7 bg-ink px-6 pb-11 pt-4">
      <View className="w-full max-w-md flex-row items-center justify-between self-center">
        <Text className="font-num-b text-[19px] tracking-[-0.3px] text-background/70">QLine</Text>
        <LanguagePicker onDark />
      </View>

      <View className="w-full max-w-md gap-3 self-center">
        <Text className="font-ui-sb text-[32px] leading-[38px] tracking-[-0.9px] text-background" numberOfLines={3}>
          {shopName}
        </Text>
        {subtitle ? <Text className="text-[16px] leading-[23px] text-background/60">{subtitle}</Text> : null}
        {children}
      </View>
    </View>
  );
}

/** The card that lifts over the plate and holds the page's real content. */
export function ShopSheet({ children }: { children: ReactNode }) {
  return (
    <View className="-mt-5 flex-1 rounded-t-[32px] bg-background px-6 pb-14 pt-8">
      <View className="w-full max-w-md gap-7 self-center">{children}</View>
    </View>
  );
}
