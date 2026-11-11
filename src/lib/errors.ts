import type { StringKey } from '@/lib/i18n';

// Turns any error from Supabase (auth or our database functions) into a
// translated message key. Our SQL functions raise short codes like
// 'SLUG_TAKEN'; Supabase Auth returns error codes like 'invalid_credentials'.
const CODE_TO_KEY: Record<string, StringKey> = {
  // Our database functions (supabase/migrations/001_init.sql)
  SLUG_TAKEN: 'errSlugTaken',
  INVALID_SLUG: 'errInvalidSlug',
  INVALID_NAME: 'errInvalidName',
  NOT_LOGGED_IN: 'errInvalidLogin',
  // Supabase Auth
  invalid_credentials: 'errInvalidLogin',
  user_already_exists: 'errEmailTaken',
  email_exists: 'errEmailTaken',
  weak_password: 'errWeakPassword',
  email_address_invalid: 'errInvalidEmail',
  validation_failed: 'errInvalidEmail',
  email_not_confirmed: 'errEmailNotConfirmed',
  over_request_rate_limit: 'errTooMany',
  over_email_send_rate_limit: 'errTooMany',
};

type MaybeError = { code?: string; message?: string; name?: string } | null | undefined;

export function errorKey(error: MaybeError): StringKey {
  if (!error) return 'errGeneric';
  if (error.code && CODE_TO_KEY[error.code]) return CODE_TO_KEY[error.code];

  const msg = error.message ?? '';
  // SQL "raise exception 'SLUG_TAKEN'" arrives as message 'SLUG_TAKEN'
  // (or 'ALREADY_IN_QUEUE:3' with extra data after a colon).
  const sqlCode = msg.split(':')[0].trim();
  if (CODE_TO_KEY[sqlCode]) return CODE_TO_KEY[sqlCode];

  // Backup: match Supabase Auth's English messages if no code came through.
  if (/invalid login credentials/i.test(msg)) return 'errInvalidLogin';
  if (/already registered/i.test(msg)) return 'errEmailTaken';
  if (/email not confirmed/i.test(msg)) return 'errEmailNotConfirmed';
  if (/password should be at least/i.test(msg)) return 'errWeakPassword';

  if (/fetch|network/i.test(msg) || error.name === 'AuthRetryableFetchError') return 'errNetwork';
  return 'errGeneric';
}
