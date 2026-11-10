import { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useI18n } from '@/lib/i18n';
import { colors, space } from '@/theme';

export function Screen({ title, children }: { title?: string; children: ReactNode }) {
  const { t, toggle } = useI18n();
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          {title ? <Text style={styles.title}>{title}</Text> : <View />}
          <Pressable onPress={toggle} hitSlop={12} accessibilityRole="button">
            <Text style={styles.lang}>{t('switchLang')}</Text>
          </Pressable>
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
};

// Big touch targets on purpose: the barber may tap with busy or wet hands.
export function Button({ label, onPress, variant = 'primary', disabled }: ButtonProps) {
  const isPrimary = variant === 'primary';
  const bg = variant === 'danger' ? colors.danger : isPrimary ? colors.primary : colors.card;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        !isPrimary && variant !== 'danger' && styles.buttonOutline,
      ]}>
      <Text style={[styles.buttonText, { color: variant === 'secondary' ? colors.primary : colors.primaryText }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function Muted({ children }: { children: ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.md, gap: space.md, maxWidth: 560, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  lang: { fontSize: 16, color: colors.primary, fontWeight: '600' },
  button: { minHeight: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.md },
  buttonOutline: { borderWidth: 2, borderColor: colors.primary },
  buttonText: { fontSize: 18, fontWeight: '700' },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: space.md, gap: space.sm, borderWidth: 1, borderColor: colors.border },
  muted: { fontSize: 15, color: colors.muted },
});
