import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

// Queue numbers are what this app is for, so they get their own face
// (Fraunces) and are never decorated with anything else.
export function Numeral({
  children,
  size = 'lg',
  className,
}: {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const sizes = {
    sm: 'text-[19px] leading-[24px]',
    md: 'text-[34px] leading-[38px]',
    lg: 'text-[64px] leading-[68px]',
    xl: 'text-[120px] leading-[124px]',
  }[size];
  return <Text className={cn('font-num-b tracking-[-2px]', sizes, className)}>{children}</Text>;
}
