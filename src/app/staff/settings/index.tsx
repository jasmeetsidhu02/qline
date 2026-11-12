import { router } from 'expo-router';
import { ChevronRight, Clock, Languages, Printer, Scissors, Users } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { LanguageSheet } from '@/components/language-picker';
import { Screen, SectionHeading } from '@/components/screen';
import { Text } from '@/components/ui/text';
import { useShopConfig } from '@/hooks/use-shop-config';
import { useAuth } from '@/lib/auth';
import { LANGUAGES, useI18n, type StringKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const ICON = '#16211C';

export default function Settings() {
  const { t, lang } = useI18n();
  const { shop, session } = useAuth();
  const { barbers, services } = useShopConfig(shop?.id);
  const [languages, setLanguages] = useState(false);
  const current = LANGUAGES.find((l) => l.code === lang)?.label ?? '';

  const shopItems: { key: StringKey; href: string; icon: React.ReactNode; detail: string }[] = [
    {
      key: 'settingsBarbers',
      href: '/staff/settings/barbers',
      icon: <Users size={18} color={ICON} />,
      detail: String(barbers.length),
    },
    {
      key: 'settingsServices',
      href: '/staff/settings/services',
      icon: <Scissors size={18} color={ICON} />,
      detail: String(services.length),
    },
    {
      key: 'settingsLine',
      href: '/staff/settings/line',
      icon: <Clock size={18} color={ICON} />,
      detail: t(shop?.line_mode === 'pick_barber' ? 'linePick' : 'lineShared'),
    },
    {
      key: 'settingsPoster',
      href: '/staff/settings/poster',
      icon: <Printer size={18} color={ICON} />,
      detail: '',
    },
  ];

  return (
    <Screen title={t('settings')} subtitle={shop?.name} back>
      <View className="gap-3">
        <SectionHeading>{t('shopSection')}</SectionHeading>
        <View className="overflow-hidden rounded-2xl bg-card">
          {shopItems.map((item, i) => (
            <Row
              key={item.key}
              icon={item.icon}
              label={t(item.key)}
              detail={item.detail}
              border={i > 0}
              onPress={() => router.push(item.href)}
            />
          ))}
        </View>
      </View>

      <View className="gap-3">
        <SectionHeading>{t('appearanceSection')}</SectionHeading>
        <View className="overflow-hidden rounded-2xl bg-card">
          <Row
            icon={<Languages size={18} color={ICON} />}
            label={t('language')}
            detail={current}
            onPress={() => setLanguages(true)}
          />
        </View>
      </View>

      <LanguageSheet open={languages} onClose={() => setLanguages(false)} />

      {session?.user.email ? (
        <View className="gap-3">
          <SectionHeading>{t('accountSection')}</SectionHeading>
          <View className="rounded-2xl bg-card px-5 py-4">
            <Text className="text-[15px] text-muted-foreground">{session.user.email}</Text>
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

function Row({
  icon,
  label,
  detail,
  border,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  detail?: string;
  border?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      role="button"
      accessibilityLabel={label}
      onPress={onPress}
      className={cn('flex-row items-center gap-3 px-5 py-4 active:bg-accent', border && 'border-t border-border')}>
      {icon}
      <Text className="flex-1 text-[17px]">{label}</Text>
      {detail ? <Text className="text-[15px] text-muted-foreground">{detail}</Text> : null}
      <ChevronRight size={18} color="#A6ADA7" />
    </Pressable>
  );
}
