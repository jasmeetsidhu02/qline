import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export type Choice = { id: string | null; label: string; hint?: string };

/** A row of tappable options. Used for services and for picking a barber. */
export function ChipSelect({
  label,
  hint,
  choices,
  value,
  onChange,
  big,
}: {
  label?: string;
  hint?: string;
  choices: Choice[];
  value: string | null;
  onChange: (id: string | null) => void;
  /** Bigger targets, for the barber's screen rather than a form. */
  big?: boolean;
}) {
  return (
    <View className="gap-2">
      {label ? (
        <View className="flex-row items-baseline justify-between gap-3">
          <Text className={cn('font-ui-md text-muted-foreground', big ? 'text-[15px]' : 'text-[14px]')}>{label}</Text>
          {hint ? <Text className="text-[13px] text-muted-foreground/70">{hint}</Text> : null}
        </View>
      ) : null}
      <View className="flex-row flex-wrap gap-2">
        {choices.map((choice) => {
          const selected = choice.id === value;
          return (
            <Pressable
              key={choice.id ?? 'any'}
              role="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={choice.label}
              onPress={() => onChange(choice.id)}
              className={cn(
                'rounded-full border active:opacity-80',
                big ? 'px-5 py-3' : 'px-4 py-2.5',
                selected ? 'border-ink bg-ink' : 'border-input bg-card'
              )}>
              <Text
                className={cn(
                  big ? 'text-[17px]' : 'text-[15px]',
                  selected ? 'font-ui-sb text-background' : 'text-foreground'
                )}>
                {choice.label}
              </Text>
              {choice.hint ? (
                <Text className={cn('text-[12px]', selected ? 'text-background/70' : 'text-muted-foreground')}>
                  {choice.hint}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
