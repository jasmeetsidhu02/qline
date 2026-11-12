import { useLocalSearchParams } from 'expo-router';
import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { AuthShell } from '@/components/auth-shell';
import { Field, FormMessage, PasswordField } from '@/components/form';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { errorKey } from '@/lib/errors';
import { StringKey, useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

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
  const longEnough = password.length >= 6;
  const canSubmit = email.includes('@') && longEnough && !busy;

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

  function switchTo(next: 'signIn' | 'signUp') {
    setMode(next);
    setError(null);
  }

  return (
    <AuthShell>
      <View className="gap-2">
        <Text className="font-ui-sb text-[28px] leading-[34px] tracking-[-0.6px]">
          {t(isSignUp ? 'createYourAccount' : 'welcomeBack')}
        </Text>
        <Text className="text-[15px] leading-[22px] text-muted-foreground">
          {t(isSignUp ? 'signUpSubtitle' : 'signInSubtitle')}
        </Text>
      </View>

      {/* Both ways in, side by side, instead of a link hidden under the button */}
      <View className="flex-row rounded-full bg-secondary p-1">
        <Tab label={t('signIn')} selected={!isSignUp} onPress={() => switchTo('signIn')} />
        <Tab label={t('signUp')} selected={isSignUp} onPress={() => switchTo('signUp')} />
      </View>

      <View className="gap-4">
        <Field
          label={t('email')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          placeholder="you@example.com"
        />
        <PasswordField
          label={t('password')}
          value={password}
          onChangeText={setPassword}
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
          textContentType={isSignUp ? 'newPassword' : 'password'}
          onSubmitEditing={() => canSubmit && submit()}
          returnKeyType="go"
          hint={
            isSignUp ? (
              <View className="flex-row items-center gap-2">
                <View
                  className={cn(
                    'h-4 w-4 items-center justify-center rounded-full',
                    longEnough ? 'bg-brass' : 'bg-muted-foreground/20'
                  )}>
                  {longEnough ? <Check size={11} color="#EFF1EE" strokeWidth={3} /> : null}
                </View>
                <Text className={cn('text-[13px]', longEnough ? 'text-brass' : 'text-muted-foreground')}>
                  {t('passwordRule')}
                </Text>
              </View>
            ) : undefined
          }
        />
      </View>

      <FormMessage>{error ? t(error) : null}</FormMessage>
      <FormMessage tone="info">{info ? t(info) : null}</FormMessage>

      <View className="gap-4">
        <Button
          size="xl"
          disabled={!canSubmit}
          onPress={submit}
          // A faded dark slab reads as broken. Not-yet-ready is a quiet
          // block with legible text instead.
          className={cn(!canSubmit && 'bg-secondary opacity-100')}>
          {busy ? (
            <ActivityIndicator color="#EFF1EE" />
          ) : (
            <Text className={cn(!canSubmit && 'text-muted-foreground')}>
              {t(isSignUp ? 'createAccount' : 'signIn')}
            </Text>
          )}
        </Button>

        <Text className="text-center text-[13px] leading-[19px] text-muted-foreground">
          {t(isSignUp ? 'authFootnoteNew' : 'authFootnote')}
        </Text>
      </View>
    </AuthShell>
  );
}

function Tab({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      role="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      className={cn('flex-1 items-center rounded-full py-2.5', selected ? 'bg-ink' : 'active:bg-accent')}>
      <Text className={cn('text-[15px]', selected ? 'font-ui-sb text-background' : 'text-muted-foreground')}>
        {label}
      </Text>
    </Pressable>
  );
}
