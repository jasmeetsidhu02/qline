import { router } from 'expo-router';
import { Languages, LogOut, Menu, Settings } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { LanguageSheet } from '@/components/language-picker';
import { Sheet, SheetItem } from '@/components/sheet';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/lib/auth';
import { LANGUAGES, useI18n } from '@/lib/i18n';

const ICON = '#16211C';

/**
 * The barber's menu, in the header rather than buried at the bottom of the
 * page: settings, language and signing out are all rare actions that should
 * be in the same, always-reachable place.
 */
export function StaffMenu() {
  const { t, lang } = useI18n();
  const { session, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [languages, setLanguages] = useState(false);

  const current = LANGUAGES.find((l) => l.code === lang)?.label ?? '';

  function close() {
    setOpen(false);
    setConfirming(false);
  }

  return (
    <>
      <Pressable
        role="button"
        accessibilityLabel={t('menu')}
        onPress={() => setOpen(true)}
        hitSlop={8}
        className="h-9 w-9 items-center justify-center rounded-full border border-border active:bg-accent">
        <Menu size={18} color={ICON} />
      </Pressable>

      <Sheet visible={open} onClose={close} title={confirming ? undefined : t('menu')}>
        {confirming ? (
          // Signing out is easy to tap by mistake and annoying to undo on a
          // phone, so it asks first.
          <View className="gap-4 px-1 pb-2">
            <View className="gap-1">
              <Text className="font-ui-sb text-[19px]">{t('signOutConfirm')}</Text>
              <Text className="text-[15px] leading-[22px] text-muted-foreground">{t('signOutConfirmBody')}</Text>
            </View>
            <View className="flex-row gap-3">
              <Button variant="outline" size="lg" className="flex-1 rounded-xl" onPress={close}>
                <Text>{t('cancel')}</Text>
              </Button>
              <Button
                variant="destructive"
                size="lg"
                className="flex-1 rounded-xl"
                onPress={() => {
                  close();
                  signOut();
                }}>
                <Text>{t('signOut')}</Text>
              </Button>
            </View>
          </View>
        ) : (
          <View className="gap-1">
            {session?.user.email ? (
              <Text className="px-3 pb-2 text-[13px] text-muted-foreground">
                {t('signedInAs', { email: session.user.email })}
              </Text>
            ) : null}
            <SheetItem
              label={t('settings')}
              icon={<Settings size={18} color={ICON} />}
              onPress={() => {
                close();
                router.push('/staff/settings');
              }}
            />
            <SheetItem
              label={t('language')}
              detail={current}
              icon={<Languages size={18} color={ICON} />}
              onPress={() => {
                setOpen(false);
                setLanguages(true);
              }}
            />
            <View className="my-1 h-px bg-border" />
            <SheetItem
              label={t('signOut')}
              tone="danger"
              icon={<LogOut size={18} color="#8B3328" />}
              onPress={() => setConfirming(true)}
            />
          </View>
        )}
      </Sheet>

      <LanguageSheet open={languages} onClose={() => setLanguages(false)} />
    </>
  );
}
