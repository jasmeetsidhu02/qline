import { ChevronRight, Languages } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { LanguageSheet } from '@/components/language-picker';
import { Screen, SectionHeading } from '@/components/screen';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/lib/auth';
import { LANGUAGES, useI18n, type StringKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export default function Settings() {
  const { t, lang } = useI18n();
  const { shop, session } = useAuth();
  const [languages, setLanguages] = useState(false);
  const current = LANGUAGES.find((l) => l.code === lang)?.label ?? '';

  // Still to build, in M7.
  const shopItems: StringKey[] = ['settingsBarbers', 'settingsServices', 'settingsLine', 'settingsPoster'];

  return (
    <Screen title={t('settings')} subtitle={shop?.name}>
      <View className="gap-3">
        <SectionHeading>{t('appearanceSection')}</SectionHeading>
        <View className="overflow-hidden rounded-2xl bg-card">
          <Pressable
            role="button"
            onPress={() => setLanguages(true)}
            className="flex-row items-center gap-3 px-5 py-4 active:bg-accent">
            <Languages size={18} color="#16211C" />
            <Text className="flex-1 text-[17px]">{t('language')}</Text>
            <Text className="text-[15px] text-muted-foreground">{current}</Text>
            <ChevronRight size={18} color="#A6ADA7" />
          </Pressable>
        </View>
      </View>

      <View className="gap-3">
        <SectionHeading>{t('shopSection')}</SectionHeading>
        <View className="overflow-hidden rounded-2xl bg-card">
          {shopItems.map((key, i) => (
            <View key={key} className={cn('gap-0.5 px-5 py-4', i > 0 && 'border-t border-border')}>
              <Text className="text-[17px] text-muted-foreground">{t(key)}</Text>
              <Text className="text-[13px] text-muted-foreground/70">{t('comingSoon')}</Text>
            </View>
          ))}
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
