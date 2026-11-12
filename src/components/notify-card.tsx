import { BellRing, Share } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useI18n } from '@/lib/i18n';
import { enablePush, pushState, type PushState } from '@/lib/push';
import { primeSound } from '@/lib/alert-sound';

// Lets a waiting customer close the page and still hear about their turn.
export function NotifyCard({ token }: { token: string }) {
  const { t, lang } = useI18n();
  const [state, setState] = useState<PushState>('unsupported');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => setState(pushState()), []);

  async function turnOn() {
    setBusy(true);
    setFailed(false);
    primeSound(); // this tap is also our chance to unlock sound
    try {
      setState(await enablePush(token, lang));
    } catch {
      setFailed(true);
    }
    setBusy(false);
  }

  if (state === 'unsupported') {
    return <Text className="text-center text-[13px] text-muted-foreground">{t('notifyKeepOpen')}</Text>;
  }

  if (state === 'on') {
    return (
      <View className="flex-row items-center justify-center gap-2">
        <BellRing size={15} color="#8F6424" />
        <Text className="text-[13px] text-brass">{t('notifyOn')}</Text>
      </View>
    );
  }

  if (state === 'needs-install') {
    return (
      <View className="gap-2 rounded-2xl bg-card p-5">
        <View className="flex-row items-center gap-2">
          <Share size={16} color="#16211C" />
          <Text className="font-ui-sb text-[15px]">{t('notifyIosHint')}</Text>
        </View>
        <Text className="text-[14px] leading-[21px] text-muted-foreground">{t('notifyIosSteps')}</Text>
      </View>
    );
  }

  if (state === 'blocked') {
    return <Text className="text-center text-[13px] text-muted-foreground">{t('notifyBlocked')}</Text>;
  }

  return (
    <View className="gap-3 rounded-2xl bg-card p-5">
      <View className="gap-1">
        <Text className="font-ui-sb text-[16px]">{t('notifyHeading')}</Text>
        <Text className="text-[14px] leading-[21px] text-muted-foreground">{t('notifyBody')}</Text>
      </View>
      {failed ? <Text className="text-[13px] text-destructive">{t('notifyError')}</Text> : null}
      <Button className="rounded-xl" onPress={turnOn} disabled={busy}>
        {busy ? (
          <ActivityIndicator color="#EFF1EE" />
        ) : (
          <>
            <BellRing size={16} color="#EFF1EE" />
            <Text>{t('notifyEnable')}</Text>
          </>
        )}
      </Button>
    </View>
  );
}
