import { router, useLocalSearchParams } from "expo-router";
import { Clock, MapPinOff } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { ChipSelect } from "@/components/chip-select";
import { Field, FormMessage } from "@/components/form";
import { Appear, Page } from "@/components/motion";
import { ShopHeader, ShopSheet } from "@/components/shop-header";
import { StatusBlock } from "@/components/status-block";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { errorKey } from "@/lib/errors";
import { StringKey, useI18n } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { primeSound } from "@/lib/alert-sound";
import { loadTicket, saveTicket } from "@/lib/ticket-storage";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ShopInfo = {
  id: string;
  name: string;
  is_open: boolean;
  line_mode: "shared" | "pick_barber";
};
type PublicBarber = { id: string; name: string };
type PublicService = {
  id: string;
  name_en: string;
  name_hi: string | null;
  name_pa: string | null;
  minutes: number;
};

// The service's name in the reader's language, falling back to English.
function serviceLabel(service: PublicService, lang: "en" | "hi" | "pa") {
  const byLang =
    lang === "hi"
      ? service.name_hi
      : lang === "pa"
        ? service.name_pa
        : service.name_en;
  return byLang?.trim() || service.name_en;
}

// What the QR code opens: https://<domain>/s/<shop-slug>
export default function JoinQueue() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t, lang } = useI18n();
  const [shop, setShop] = useState<ShopInfo | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "notFound">(
    "loading",
  );
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [barbers, setBarbers] = useState<PublicBarber[]>([]);
  const [services, setServices] = useState<PublicService[]>([]);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [lineNow, setLineNow] = useState<{
    waiting: number;
    serving: number[];
  } | null>(null);
  const [barberId, setBarberId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase || !slug) return;
    const client = supabase;
    let alive = true;
    (async () => {
      // Already holding a live ticket here? Go straight to it.
      const token = await loadTicket(slug);
      if (token) {
        const { data } = await client.rpc("get_my_status", { p_token: token });
        if (data && (data.status === "waiting" || data.status === "serving")) {
          router.replace(`/s/${slug}/ticket`);
          return;
        }
      }
      // Public shop info. The shops table holds nothing private.
      const { data } = await client
        .from("shops")
        .select("id, name, is_open, line_mode")
        .eq("slug", slug)
        .maybeSingle();
      if (!alive) return;
      if (!data) {
        setState("notFound");
        return;
      }
      setShop(data as ShopInfo);
      setState("ready");

      // What this shop offers. Customers are allowed to read both tables.
      const [svc, brb] = await Promise.all([
        client
          .from("services")
          .select("id, name_en, name_hi, name_pa, minutes")
          .eq("shop_id", data.id)
          .eq("is_active", true)
          .order("sort_order"),
        client
          .from("barbers")
          .select("id, name")
          .eq("shop_id", data.id)
          .eq("is_active", true)
          .order("sort_order"),
      ]);
      if (!alive) return;
      setServices((svc.data as PublicService[]) ?? []);
      setBarbers((brb.data as PublicBarber[]) ?? []);

      // How busy it is right now. Nothing private: just counts and the
      // numbers being served.
      const { data: live } = await client.rpc("get_public_queue", {
        p_slug: slug,
      });
      if (!alive || !live) return;
      setLineNow({
        waiting: (live.waiting ?? []).length,
        serving: (live.serving ?? []).map(
          (e: { ticket_no: number }) => e.ticket_no,
        ),
      });
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  const canJoin = name.trim().length > 0 && /^\d{10}$/.test(phone) && !busy;

  async function join() {
    if (!supabase) return setError(t("errNotConfigured"));
    // A tap is the only moment a browser lets us open the audio channel.
    primeSound();
    setBusy(true);
    setError(null);
    const { data, error } = await supabase.rpc("join_queue", {
      p_slug: slug,
      p_name: name.trim(),
      p_phone: phone,
      p_service_id: serviceId,
      p_barber_id: barberId,
    });
    if (error) {
      const already = error.message?.match(/^ALREADY_IN_QUEUE:(\d+)/);
      setError(
        already
          ? t("alreadyInLine", { n: already[1] })
          : t(errorKey(error) as StringKey),
      );
      if (error.message?.startsWith("SHOP_CLOSED"))
        setShop((s) => (s ? { ...s, is_open: false } : s));
      setBusy(false);
      return;
    }
    await saveTicket(slug, data.customer_token);
    router.replace(`/s/${slug}/ticket`);
  }

  return (
    <SafeAreaView className="flex-1 bg-ink" edges={["top"]}>
      <ScrollView
        contentContainerClassName="flex-grow"
        keyboardShouldPersistTaps="handled"
      >
        <Page grow className="w-full flex-grow">
          {state === "loading" ? (
            <View className="flex-1 items-center justify-center bg-background py-24">
              <ActivityIndicator />
            </View>
          ) : state === "notFound" || !shop ? (
            <View className="flex-1 bg-background px-6 pt-10">
              <View className="w-full max-w-md self-center">
                <StatusBlock
                  icon={<MapPinOff size={26} color="#5E6761" />}
                  title={t("shopNotFound")}
                  hint={t("shopNotFoundHint")}
                />
              </View>
            </View>
          ) : (
            <>
              <ShopHeader shopName={shop.name} subtitle={t("joinSubtitle")}>
                {shop.is_open && lineNow ? (
                  <Appear delay={120}>
                    <View className="mt-1 flex-row items-center gap-3 self-start rounded-full border border-background/15 px-4 py-2">
                      <View className="h-1.5 w-1.5 rounded-full bg-brass" />
                      <Text className="text-[14px] text-background/75">
                        {lineNow.waiting === 0
                          ? t("nobodyWaiting")
                          : t("inLineNow", { n: lineNow.waiting })}
                      </Text>
                    </View>
                  </Appear>
                ) : null}
              </ShopHeader>

              <ShopSheet>
                {!shop.is_open ? (
                  <StatusBlock
                    icon={<Clock size={26} color="#5E6761" />}
                    title={t("shopClosedNow")}
                    hint={t("shopClosedNowHint")}
                  />
                ) : (
                  <>
                    <Appear>
                      <View className="gap-5">
                        {services.length > 0 ? (
                          <ChipSelect
                            label={t("chooseService")}
                            hint={t("optional")}
                            value={serviceId}
                            onChange={setServiceId}
                            choices={services.map((s) => ({
                              id: s.id,
                              label: serviceLabel(s, lang),
                              hint: `${s.minutes} ${t("min")}`,
                            }))}
                          />
                        ) : null}

                        {shop.line_mode === "pick_barber" &&
                        barbers.length > 1 ? (
                          <ChipSelect
                            label={t("chooseBarber")}
                            hint={t("optional")}
                            value={barberId}
                            onChange={setBarberId}
                            choices={[
                              { id: null, label: t("anyBarber") },
                              ...barbers.map((b) => ({
                                id: b.id,
                                label: b.name,
                              })),
                            ]}
                          />
                        ) : null}

                        <Field
                          label={t("yourName")}
                          value={name}
                          onChangeText={setName}
                          autoComplete="name"
                          maxLength={40}
                        />
                        <Field
                          label={t("phone")}
                          value={phone}
                          onChangeText={(v) =>
                            setPhone(v.replace(/\D/g, "").slice(0, 10))
                          }
                          keyboardType="phone-pad"
                          autoComplete="tel"
                          placeholder="98765 43210"
                          hint={t("joinHint")}
                          onSubmitEditing={() => canJoin && join()}
                        />
                      </View>
                    </Appear>

                    <FormMessage>{error}</FormMessage>

                    <Appear delay={90}>
                      <View className="gap-4">
                        <Button
                          size="xl"
                          disabled={!canJoin}
                          onPress={join}
                          className={
                            !canJoin ? "bg-secondary opacity-100" : undefined
                          }
                        >
                          {busy ? (
                            <ActivityIndicator color="#EFF1EE" />
                          ) : (
                            <Text
                              className={
                                !canJoin ? "text-muted-foreground" : undefined
                              }
                            >
                              {t("joinQueue")}
                            </Text>
                          )}
                        </Button>
                        <Text className="text-center text-[13px] leading-[19px] text-muted-foreground">
                          {t("joinFootnote")}
                        </Text>
                      </View>
                    </Appear>
                  </>
                )}
              </ShopSheet>
            </>
          )}
        </Page>
      </ScrollView>
    </SafeAreaView>
  );
}
