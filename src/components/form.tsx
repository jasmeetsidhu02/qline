import { Eye, EyeOff } from 'lucide-react-native';
import { ComponentProps, ReactNode, useState } from 'react';
import { Pressable, View } from 'react-native';

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

// Password input with an eye button to show / hide what was typed.
export function PasswordField({ label, className, ...inputProps }: Omit<FieldProps, 'secureTextEntry'>) {
  const [visible, setVisible] = useState(false);
  return (
    <View className="gap-2">
      <Text className="text-sm font-medium">{label}</Text>
      <View className="justify-center">
        <Input
          className={cn('h-14 rounded-xl pr-14 text-base', className)}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          {...inputProps}
        />
        <Pressable
          role="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          onPress={() => setVisible((v) => !v)}
          hitSlop={8}
          className="absolute right-2 h-10 w-10 items-center justify-center rounded-lg active:bg-accent">
          {visible ? <EyeOff size={20} color="#71717a" /> : <Eye size={20} color="#71717a" />}
        </Pressable>
      </View>
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
