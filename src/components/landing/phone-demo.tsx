import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';

import { Numeral } from '@/components/numeral';
import { Text } from '@/components/ui/text';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { LANGUAGES, useI18n } from '@/lib/i18n';

// The customer's screen, playing out a whole visit: three people ahead,
// then two, then one, then their turn. It is the product demo and the only
// moving thing on the page.
const STEPS = [{ ahead: 3 }, { ahead: 2 }, { ahead: 1 }, { ahead: 0 }, { serving: true }] as const;
const HOLD_MS = 2000;

export function PhoneDemo() {
  const { t, lang } = useI18n();
  const reducedMotion = useReducedMotion();
  // Someone who asked for less motion gets the best single frame instead.
  const [index, setIndex] = useState(reducedMotion ? 3 : 0);
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reducedMotion) {
      setIndex(3);
      return;
    }
    const id = setInterval(() => {
      Animated.sequence([
        Animated.timing(fade, { toValue: 0, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 320, delay: 60, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start();
      setTimeout(() => setIndex((i) => (i + 1) % STEPS.length), 240);
    }, HOLD_MS);
    return () => clearInterval(id);
  }, [reducedMotion, fade]);

  const step = STEPS[index];
  const serving = 'serving' in step;
  const ahead = 'ahead' in step ? step.ahead : 0;

  return (
    <View
      // A phone, drawn rather than photographed, so it stays sharp and
      // always shows the real interface.
      className="w-[272px] rounded-[38px] border-[7px] border-ink-soft bg-background p-4 pb-6 shadow-2xl shadow-black/40"
      accessibilityLabel={t('demoAlt')}>
      <View className="mb-5 mt-1 h-1 w-14 self-center rounded-full bg-ink/15" />

      <View className="mb-4 flex-row items-center justify-between">
        <Text className="font-ui-sb text-[15px]">{t('demoShopName')}</Text>
        <View className="rounded-full border border-border px-2 py-0.5">
          <Text className="text-[10px] text-muted-foreground">
            {LANGUAGES.find((l) => l.code === lang)?.short}
          </Text>
        </View>
      </View>

      <Animated.View style={{ opacity: fade }}>
        <View
          className={`min-h-[176px] items-center justify-center gap-1 rounded-3xl px-4 py-6 ${
            serving ? 'bg-brass' : 'bg-ink'
          }`}>
          {serving ? (
            <>
              <Numeral className="text-[64px] leading-[68px] text-background">7</Numeral>
              <Text className="font-ui-sb text-[17px] text-background">{t('yourTurn')}</Text>
              <Text className="text-center text-[12px] text-background/80">{t('yourTurnHint')}</Text>
            </>
          ) : ahead === 0 ? (
            <>
              <Text className="font-ui-sb text-[22px] text-brass-soft">{t('youAreNext')}</Text>
              <Text className="text-center text-[12px] text-background/60">{t('youAreNextHint')}</Text>
            </>
          ) : (
            <>
              <Numeral className="text-[64px] leading-[68px] text-background">{ahead}</Numeral>
              <Text className="text-[13px] text-background/60">
                {t(ahead === 1 ? 'aheadLabelOne' : 'aheadLabelMany')}
              </Text>
            </>
          )}
        </View>

        <View className="mt-4 items-center gap-0.5">
          <Text className="text-[13px]">{t('yourNumberIs', { n: 7 })}</Text>
          <Text className="text-[12px] text-muted-foreground">
            {serving ? t('demoNow') : t('aboutMin', { n: ahead * 18 + 4 })}
          </Text>
        </View>

        <View className="mt-5 items-center gap-2 border-t border-border pt-4">
          <Text className="text-[11px] text-muted-foreground">{t('leaveQueue')}</Text>
          <Text className="text-[10px] text-muted-foreground/70">{t('updatedAgo', { n: 2 })}</Text>
        </View>
      </Animated.View>
    </View>
  );
}
