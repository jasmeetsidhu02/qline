import { Screen } from '@/components/screen';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useI18n } from '@/lib/i18n';

// Admin settings (M7): barbers, line mode, services, open/close, QR poster.
export default function Settings() {
  const { t } = useI18n();
  return (
    <Screen title={t('settings')}>
      {['Barbers', 'Line mode', 'Services', 'QR poster'].map((item) => (
        <Card key={item}>
          <CardHeader>
            <CardTitle>{item}</CardTitle>
            <CardDescription>{t('comingSoon')}</CardDescription>
          </CardHeader>
        </Card>
      ))}
      <Text className="text-center text-sm text-muted-foreground">M7</Text>
    </Screen>
  );
}
