import { Check, Languages } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Sheet } from '@/components/sheet';
import { Text } from '@/components/ui/text';
import { LANGUAGES, useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/** The pill in a screen header. Tapping it opens the list of languages. */
export function LanguagePicker({ onDark }: { onDark?: boolean }) {
  const { lang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  return (
    <>
      <Pressable
        role="button"
        accessibilityLabel={t('language')}
        onPress={() => setOpen(true)}
        hitSlop={10}
        className={cn(
          'flex-row items-center gap-1.5 rounded-full border px-3 py-1.5 active:opacity-70',
          onDark ? 'border-ink-line' : 'border-border'
        )}>
        <Languages size={14} color={onDark ? '#C09A62' : '#5E6761'} />
        <Text className={cn('font-ui-md text-[13px]', onDark ? 'text-brass-soft' : 'text-muted-foreground')}>
          {current.short}
        </Text>
      </Pressable>
      <LanguageSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function LanguageSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang, setLang, t } = useI18n();
  return (
    <Sheet visible={open} onClose={onClose} title={t('language')}>
      <View className="gap-1">
        {LANGUAGES.map((option) => (
          <Pressable
            key={option.code}
            role="button"
            onPress={() => {
              setLang(option.code);
              onClose();
            }}
            className="flex-row items-center gap-3 rounded-xl px-3 py-4 active:bg-accent">
            <Text className="flex-1 text-[17px]">{option.label}</Text>
            {option.code === lang ? <Check size={18} color="#8F6424" /> : null}
          </Pressable>
        ))}
      </View>
    </Sheet>
  );
}
