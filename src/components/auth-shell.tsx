import { ReactNode } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LanguagePicker } from "@/components/language-picker";
import { Page } from "@/components/motion";
import { Numeral } from "@/components/numeral";
import { Text } from "@/components/ui/text";
import { StringKey, useI18n } from "@/lib/i18n";

// The sign-in screen is the first thing a shop owner sees after the landing
// page, so it carries the same dark panel rather than dropping them onto a
// bare form. On a phone the panel is a header the card sits up against; on a
// wide screen the two sit side by side.
export function AuthShell({
  children,
  headline = "authHeadline",
  sub = "authSub",
}: {
  children: ReactNode;
  headline?: StringKey;
  sub?: StringKey;
}) {
  const { width } = useWindowDimensions();
  const wide = width >= 900;

  if (wide) {
    return (
      <SafeAreaView className="flex-1 bg-ink">
        <Page className="flex-1 flex-row">
          <View className="flex-1 justify-between px-14 py-12">
            <Text className="font-num-b text-[22px] tracking-[-0.3px] text-background">
              QLine
            </Text>
            <Panel headline={headline} sub={sub} />
            <View />
          </View>
          <View className="flex-1 items-center justify-center bg-background px-10">
            <View className="w-full max-w-[420px] gap-7">
              <View className="flex-row justify-end">
                <LanguagePicker />
              </View>
              {children}
            </View>
          </View>
        </Page>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-ink" edges={["top"]}>
      <ScrollView
        contentContainerClassName="flex-grow"
        keyboardShouldPersistTaps="handled"
      >
        <Page className="w-full flex-grow">
          <View className="gap-9 px-6 pb-12 pt-4">
            <View className="flex-row items-center justify-between">
              <Text className="font-num-b text-[20px] tracking-[-0.3px] text-background">
                QLine
              </Text>
              <LanguagePicker onDark />
            </View>
            <Panel compact headline={headline} sub={sub} />
          </View>

          {/* The card lifts over the dark panel, so the page has a front and a back. */}
          <View className="-mt-5 flex-1 rounded-t-[32px] bg-background px-6 pb-12 pt-9">
            <View className="w-full max-w-md gap-7 self-center">
              {children}
            </View>
          </View>
        </Page>
      </ScrollView>
    </SafeAreaView>
  );
}

// A real piece of the product rather than an illustration: the number on the
// chair, and the two waiting behind it.
function Panel({
  compact,
  headline,
  sub,
}: {
  compact?: boolean;
  headline: StringKey;
  sub: StringKey;
}) {
  const { t } = useI18n();
  return (
    <View className={compact ? "gap-7" : "gap-10"}>
      <View className="gap-1.5">
        <Text className="font-ui-md text-[13px] text-brass-soft">
          {t("nowServing")}
        </Text>
        {/* The number on the chair, and the two behind it fading into the line. */}
        <View className="flex-row items-end gap-4">
          <Numeral size={compact ? "lg" : "xl"} className="text-background">
            {7}
          </Numeral>
          <View style={{ opacity: 0.32 }} className="pb-1">
            <Numeral size="md" className="text-background">
              {8}
            </Numeral>
          </View>
          <View style={{ opacity: 0.14 }} className="pb-1">
            <Numeral size="md" className="text-background">
              {9}
            </Numeral>
          </View>
        </View>
      </View>

      <View className="gap-3">
        <Text
          className={
            compact
              ? "font-ui-sb text-[27px] leading-[33px] tracking-[-0.8px] text-background"
              : "max-w-[460px] font-ui-sb text-[44px] leading-[50px] tracking-[-1.2px] text-background"
          }
        >
          {t(headline)}
        </Text>
        <Text
          className={
            compact
              ? "text-[15px] leading-[22px] text-background/60"
              : "max-w-[400px] text-[17px] leading-[26px] text-background/60"
          }
        >
          {t(sub)}
        </Text>
      </View>
    </View>
  );
}
