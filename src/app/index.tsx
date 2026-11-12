import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PhoneDemo } from '@/components/landing/phone-demo';
import { LanguagePicker } from '@/components/language-picker';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useI18n } from '@/lib/i18n';

// The page a shop owner lands on. Customers never see it: their QR code
// opens /s/<shop-slug> directly.
export default function Home() {
  const { t } = useI18n();

  return (
    <SafeAreaView className="flex-1 bg-ink">
      <ScrollView contentContainerClassName="pb-0">
        {/* Hero: dark, with the customer's screen playing out a whole visit */}
        <View className="bg-ink px-5 pb-16 pt-4">
          <View className="w-full max-w-5xl flex-row items-center justify-between self-center">
            <Text className="font-num-b text-[22px] tracking-[-0.3px] text-background">QLine</Text>
            <View className="flex-row items-center gap-2">
              <Pressable
                role="button"
                onPress={() => router.push('/staff/login')}
                hitSlop={8}
                className="px-2 py-1 active:opacity-60">
                <Text className="text-[14px] text-background/70">{t('ctaSignIn')}</Text>
              </Pressable>
              <LanguagePicker onDark />
            </View>
          </View>

          <View className="w-full max-w-5xl flex-col items-center gap-12 self-center pt-12 md:flex-row md:items-center md:gap-16 md:pt-20">
            <View className="w-full max-w-[460px] gap-6 md:flex-1">
              <Text className="font-ui-md text-[15px] text-brass-soft">{t('forShops')}</Text>
              <Text className="font-ui-sb text-[40px] leading-[46px] tracking-[-1.2px] text-background md:text-[52px] md:leading-[58px]">
                {t('heroTitle')}
              </Text>
              <Text className="text-[17px] leading-[26px] text-background/70">{t('heroSub')}</Text>
              <View className="flex-row flex-wrap items-center gap-4 pt-2">
                <Button
                  size="xl"
                  className="bg-brass px-7 active:bg-brass/90"
                  onPress={() => router.push('/staff/login?new=1')}>
                  <Text className="text-background">{t('ctaStart')}</Text>
                </Button>
                <Text className="text-[14px] text-background/50">{t('pricingLine')}</Text>
              </View>
            </View>

            <View className="items-center md:flex-1">
              <PhoneDemo />
            </View>
          </View>
        </View>

        {/* How it works */}
        <View className="rounded-t-[32px] bg-background px-5 pb-16 pt-14">
          <View className="w-full max-w-5xl gap-10 self-center">
            <Text className="font-ui-sb text-[28px] tracking-[-0.6px]">{t('howItWorks')}</Text>
            <View className="gap-10 md:flex-row md:gap-8">
              <Step n={1} title={t('step1Title')} body={t('step1Body')} />
              <Step n={2} title={t('step2Title')} body={t('step2Body')} />
              <Step n={3} title={t('step3Title')} body={t('step3Body')} />
            </View>
          </View>
        </View>

        {/* Closing */}
        <View className="bg-background px-5 pb-16">
          <View className="w-full max-w-5xl items-start gap-5 self-center rounded-3xl bg-card p-8 md:items-center md:p-12">
            <Text className="font-ui-sb text-[26px] tracking-[-0.5px] md:text-center">{t('closingTitle')}</Text>
            <Text className="max-w-[420px] text-[16px] leading-[24px] text-muted-foreground md:text-center">
              {t('closingBody')}
            </Text>
            <Button size="xl" className="px-7" onPress={() => router.push('/staff/login?new=1')}>
              <Text>{t('ctaStart')}</Text>
            </Button>
          </View>
          <Text className="w-full max-w-5xl self-center pt-10 text-[13px] text-muted-foreground md:text-center">
            {t('builtIn')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// The steps are a real sequence, so they are numbered.
function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <View className="gap-3 md:flex-1">
      <View className="h-9 w-9 items-center justify-center rounded-full bg-ink">
        <Text className="font-num-b text-[16px] text-background">{n}</Text>
      </View>
      <Text className="font-ui-sb text-[19px] tracking-[-0.2px]">{title}</Text>
      <Text className="max-w-[360px] text-[15px] leading-[23px] text-muted-foreground">{body}</Text>
    </View>
  );
}
