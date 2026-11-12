import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { ReactNode } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LanguagePicker } from "@/components/language-picker";
import { Page } from "@/components/motion";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n";

type ScreenProps = {
  title?: string;
  subtitle?: string;
  /** Extra control for the header, e.g. the staff menu button. */
  action?: ReactNode;
  /** Shows a back arrow above the title. For screens opened from another. */
  back?: boolean;
  children: ReactNode;
};

// Page shell: safe area, one centred column, and the language switch.
export function Screen({
  title,
  subtitle,
  action,
  back,
  children,
}: ScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <Page>
        <ScrollView
          contentContainerClassName="w-full max-w-md self-center px-5 pb-14 pt-3 gap-7"
          keyboardShouldPersistTaps="handled"
        >
          {back ? (
            <Pressable
              role="button"
              accessibilityLabel="Back"
              onPress={() =>
                router.canGoBack()
                  ? router.back()
                  : router.replace("/staff/dashboard")
              }
              hitSlop={10}
              className="-ml-2 -mb-2 h-9 w-9 items-center justify-center rounded-full active:bg-accent"
            >
              <ChevronLeft size={22} color="#16211C" />
            </Pressable>
          ) : null}
          <View className="flex-row items-start justify-between gap-4">
            <View className="flex-1 gap-1">
              {title ? (
                <Text className="font-ui-sb text-[26px] leading-[32px] tracking-[-0.5px]">
                  {title}
                </Text>
              ) : null}
              {subtitle ? (
                <Text className="text-[15px] text-muted-foreground">
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <View className="flex-row items-center gap-2">
              <LanguagePicker />
              {action}
            </View>
          </View>
          {children}
        </ScrollView>
      </Page>
    </SafeAreaView>
  );
}

// Heading above a group. Sentence case, quiet, with an optional note on the right.
export function SectionHeading({
  children,
  note,
}: {
  children: ReactNode;
  note?: ReactNode;
}) {
  return (
    <View className="flex-row items-baseline justify-between gap-3">
      <Text className="font-ui-sb text-[17px] tracking-[-0.2px]">
        {children}
      </Text>
      {typeof note === "string" ? (
        <Text className="text-[13px] text-muted-foreground">{note}</Text>
      ) : (
        note
      )}
    </View>
  );
}
