import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Field, FormMessage, PasswordField } from '@/components/form';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { errorKey } from '@/lib/errors';
import { StringKey, useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';

// One screen for both "sign in" and "create account". After a successful
// sign-in, AuthProvider notices the new session and the staff layout moves
// the user on automatically (to create-shop or dashboard). No router.push needed.
export default function StaffLogin() {
  const { t } = useI18n();
  // The landing page sends new owners here with ?new=1
  const { new: isNew } = useLocalSearchParams<{ new?: string }>();
  const [mode, setMode] = useState<'signIn' | 'signUp'>(isNew ? 'signUp' : 'signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<StringKey | null>(null);
  const [info, setInfo] = useState<StringKey | null>(null);

  const isSignUp = mode === 'signUp';
  const canSubmit = email.includes('@') && password.length >= 6 && !busy;

  async function submit() {
    if (!supabase) return setError('errNotConfigured');
    setBusy(true);
    setError(null);
    setInfo(null);
    const creds = { email: email.trim().toLowerCase(), password };

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp(creds);
      if (error) setError(errorKey(error));
      // With "Confirm email" ON, Supabase returns no session yet.
      else if (!data.session) {
        setInfo('checkEmail');
        setMode('signIn');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword(creds);
      if (error) setError(errorKey(error));
    }
    setBusy(false);
  }

  return (
    <Screen title={t(isSignUp ? 'signUp' : 'signIn')} subtitle={t(isSignUp ? 'signUpSubtitle' : 'signInSubtitle')}>
      <View className="gap-4">
        <Field
          label={t('email')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <PasswordField
          label={t('password')}
          value={password}
          onChangeText={setPassword}
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
          textContentType={isSignUp ? 'newPassword' : 'password'}
          onSubmitEditing={() => canSubmit && submit()}
          returnKeyType="go"
        />
      </View>

      <FormMessage>{error ? t(error) : null}</FormMessage>
      <FormMessage tone="info">{info ? t(info) : null}</FormMessage>

      <Button size="xl" disabled={!canSubmit} onPress={submit}>
        {busy ? <ActivityIndicator color="#ffffff" /> : <Text>{t(isSignUp ? 'signUp' : 'signIn')}</Text>}
      </Button>

      <Button
        variant="link"
        onPress={() => {
          setMode(isSignUp ? 'signIn' : 'signUp');
          setError(null);
        }}>
        <Text>{t(isSignUp ? 'haveAccount' : 'noAccount')}</Text>
      </Button>
    </Screen>
  );
}
