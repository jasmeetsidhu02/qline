import { Card, Muted, Screen } from '@/components/ui';
import { useI18n } from '@/lib/i18n';

// Admin settings (M7): barbers, line mode, services, open/close, QR poster.
export default function Settings() {
  const { t } = useI18n();
  return (
    <Screen title={t('settings')}>
      <Card>
        <Muted>{t('comingSoon')}: barbers, line mode, services, QR poster</Muted>
      </Card>
    </Screen>
  );
}
