import { Undo2 } from 'lucide-react-native';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useI18n } from '@/lib/i18n';

export type LastAction = { entryId: string; ticketNo: number; kind: 'done' | 'no_show' };

// A wrong tap on Done or No-show used to be final. This sits under the chair
// for a few seconds afterwards; the database allows the undo for 15 minutes,
// so a barber who notices late can still reload and fix it.
export function UndoBar({ action, busy, onUndo }: { action: LastAction; busy: boolean; onUndo: () => void }) {
  const { t } = useI18n();
  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-card px-5 py-3.5">
      <Text className="flex-1 text-[15px] text-muted-foreground" numberOfLines={1}>
        {t(action.kind === 'done' ? 'undoDone' : 'undoNoShow', { n: action.ticketNo })}
      </Text>
      <Pressable
        role="button"
        accessibilityLabel={t('undo')}
        onPress={onUndo}
        disabled={busy}
        hitSlop={12}
        className="flex-row items-center gap-2 rounded-full border border-ink/15 px-4 py-2 active:bg-accent">
        {busy ? <ActivityIndicator size="small" /> : <Undo2 size={15} color="#16211C" />}
        <Text className="font-ui-sb text-[15px]">{t('undo')}</Text>
      </Pressable>
    </View>
  );
}
