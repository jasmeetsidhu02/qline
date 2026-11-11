import { ComponentProps, ReactNode } from 'react';
import { View } from 'react-native';

import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

type FieldProps = ComponentProps<typeof Input> & { label: string; hint?: ReactNode };

// Label + big input + optional hint line underneath.
export function Field({ label, hint, className, ...inputProps }: FieldProps) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-medium">{label}</Text>
      <Input className={cn('h-14 rounded-xl text-base', className)} {...inputProps} />
      {hint ? <Text className="text-sm text-muted-foreground">{hint}</Text> : null}
    </View>
  );
}

export function FormMessage({ children, tone = 'error' }: { children?: ReactNode; tone?: 'error' | 'info' }) {
  if (!children) return null;
  return (
    <View className={cn('rounded-xl px-4 py-3', tone === 'error' ? 'bg-destructive/10' : 'bg-primary/10')}>
      <Text className={cn('text-sm', tone === 'error' ? 'text-destructive' : 'text-primary')}>{children}</Text>
    </View>
  );
}
