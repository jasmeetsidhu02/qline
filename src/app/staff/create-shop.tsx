import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Field, FormMessage } from '@/components/form';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/lib/auth';
import { errorKey } from '@/lib/errors';
import { StringKey, useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';

// "Sharma Hair Salon" → "sharma-hair-salon"
function toSlug(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

const SLUG_RE = /^[a-z0-9-]{3,40}$/;

export default function CreateShop() {
  const { t } = useI18n();
  const { refreshShop, signOut } = useAuth();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<StringKey | null>(null);

  const canSubmit = name.trim().length > 0 && SLUG_RE.test(slug) && !busy;

  async function submit() {
    if (!supabase) return setError('errNotConfigured');
    setBusy(true);
    setError(null);
    // create_shop runs in the database: it checks the slug, inserts the
    // shop, and adds you to shop_members as the owner, all in one go.
    const { error } = await supabase.rpc('create_shop', { p_name: name.trim(), p_slug: slug });
    if (error) {
      setError(errorKey(error));
      setBusy(false);
      return;
    }
    // Now that we own a shop, the staff layout unlocks the dashboard.
    await refreshShop();
  }

  return (
    <Screen title={t('createShop')} subtitle={t('createShopSubtitle')}>
      <View className="gap-4">
        <Field
          label={t('shopName')}
          value={name}
          placeholder="Sharma Hair Salon"
          onChangeText={(v) => {
            setName(v);
            if (!slugEdited) setSlug(toSlug(v));
          }}
        />
        <Field
          label={t('shopLink')}
          value={slug}
          placeholder="sharma-hair-salon"
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={(v) => {
            setSlugEdited(true);
            setSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40));
          }}
          hint={
            <>
              qline…/s/<Text className="font-semibold text-foreground">{slug || '…'}</Text>
              {'\n'}
              {t('shopLinkHint')}
            </>
          }
        />
      </View>

      <FormMessage>{error ? t(error) : null}</FormMessage>

      <Button size="xl" disabled={!canSubmit} onPress={submit}>
        {busy ? <ActivityIndicator color="#ffffff" /> : <Text>{t('createShop')}</Text>}
      </Button>

      <Button variant="ghost" onPress={signOut}>
        <Text className="text-muted-foreground">{t('signOut')}</Text>
      </Button>
    </Screen>
  );
}
