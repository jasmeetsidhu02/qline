import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

export type Lang = 'pa' | 'en';

const strings = {
  en: {
    appName: 'QLine',
    tagline: 'Skip the wait. Join the line from your phone.',
    staffLogin: 'Staff login',
    joinQueue: 'Join the queue',
    yourName: 'Your name',
    phone: 'Phone number',
    join: 'Join',
    yourTicket: 'Your ticket',
    peopleAhead: 'People ahead of you',
    estWait: 'Estimated wait',
    leaveQueue: 'Leave the queue',
    dashboard: 'Dashboard',
    next: 'Next',
    done: 'Done',
    noShow: 'No-show',
    addWalkIn: 'Add walk-in',
    openShop: 'Open shop',
    closeShop: 'Close shop',
    settings: 'Settings',
    nowServing: 'Now serving',
    comingSoon: 'Coming in a later milestone',
    switchLang: 'ਪੰਜਾਬੀ',
    email: 'Email',
    password: 'Password',
    signIn: 'Sign in',
    signUp: 'Create account',
    noAccount: "New here? Create an account",
    haveAccount: 'Already have an account? Sign in',
    signInSubtitle: 'For shop owners and staff',
    signUpSubtitle: 'Set up QLine for your shop in 2 minutes',
    signOut: 'Sign out',
    checkEmail: 'Check your email to confirm your account, then sign in.',
    createShop: 'Create your shop',
    createShopSubtitle: 'Customers will see this name when they scan your QR code.',
    shopName: 'Shop name',
    shopLink: 'Shop link',
    shopLinkHint: 'Small letters, numbers and dashes only.',
    loading: 'Loading…',
    shopOpen: 'Open',
    shopClosed: 'Closed',
    customersCanJoin: 'Customers can join the line',
    customersCannotJoin: 'Customers cannot join right now',
    errGeneric: 'Something went wrong. Please try again.',
    errNetwork: 'No internet connection. Please try again.',
    errNotConfigured: 'App is not connected to the database (.env missing).',
    errInvalidLogin: 'Wrong email or password.',
    errEmailTaken: 'An account with this email already exists. Sign in instead.',
    errWeakPassword: 'Password must be at least 6 characters.',
    errInvalidEmail: 'Please enter a valid email.',
    errEmailNotConfirmed: 'Please confirm your email first (check your inbox).',
    errTooMany: 'Too many attempts. Wait a minute and try again.',
    errSlugTaken: 'This link is already taken. Try another.',
    errInvalidSlug: 'Link must be 3–40 small letters, numbers or dashes.',
    errInvalidName: 'Please enter a name.',
  },
  pa: {
    appName: 'QLine',
    tagline: 'ਉਡੀਕ ਛੱਡੋ। ਆਪਣੇ ਫ਼ੋਨ ਤੋਂ ਲਾਈਨ ਵਿੱਚ ਲੱਗੋ।',
    staffLogin: 'ਸਟਾਫ਼ ਲੌਗਇਨ',
    joinQueue: 'ਲਾਈਨ ਵਿੱਚ ਲੱਗੋ',
    yourName: 'ਤੁਹਾਡਾ ਨਾਮ',
    phone: 'ਫ਼ੋਨ ਨੰਬਰ',
    join: 'ਲੱਗੋ',
    yourTicket: 'ਤੁਹਾਡਾ ਨੰਬਰ',
    peopleAhead: 'ਤੁਹਾਡੇ ਤੋਂ ਅੱਗੇ',
    estWait: 'ਅੰਦਾਜ਼ਨ ਉਡੀਕ',
    leaveQueue: 'ਲਾਈਨ ਛੱਡੋ',
    dashboard: 'ਡੈਸ਼ਬੋਰਡ',
    next: 'ਅਗਲਾ',
    done: 'ਹੋ ਗਿਆ',
    noShow: 'ਨਹੀਂ ਆਇਆ',
    addWalkIn: 'ਗਾਹਕ ਜੋੜੋ',
    openShop: 'ਦੁਕਾਨ ਖੋਲ੍ਹੋ',
    closeShop: 'ਦੁਕਾਨ ਬੰਦ ਕਰੋ',
    settings: 'ਸੈਟਿੰਗਾਂ',
    nowServing: 'ਹੁਣ ਵਾਰੀ',
    comingSoon: 'ਅਗਲੇ ਪੜਾਅ ਵਿੱਚ ਆਵੇਗਾ',
    switchLang: 'English',
    email: 'ਈਮੇਲ',
    password: 'ਪਾਸਵਰਡ',
    signIn: 'ਲੌਗਇਨ ਕਰੋ',
    signUp: 'ਖਾਤਾ ਬਣਾਓ',
    noAccount: 'ਨਵੇਂ ਹੋ? ਖਾਤਾ ਬਣਾਓ',
    haveAccount: 'ਪਹਿਲਾਂ ਤੋਂ ਖਾਤਾ ਹੈ? ਲੌਗਇਨ ਕਰੋ',
    signInSubtitle: 'ਦੁਕਾਨ ਮਾਲਕਾਂ ਅਤੇ ਸਟਾਫ਼ ਲਈ',
    signUpSubtitle: '2 ਮਿੰਟ ਵਿੱਚ ਆਪਣੀ ਦੁਕਾਨ ਲਈ QLine ਸ਼ੁਰੂ ਕਰੋ',
    signOut: 'ਲੌਗਆਊਟ',
    checkEmail: 'ਖਾਤਾ ਪੱਕਾ ਕਰਨ ਲਈ ਆਪਣੀ ਈਮੇਲ ਦੇਖੋ, ਫਿਰ ਲੌਗਇਨ ਕਰੋ।',
    createShop: 'ਆਪਣੀ ਦੁਕਾਨ ਬਣਾਓ',
    createShopSubtitle: 'QR ਕੋਡ ਸਕੈਨ ਕਰਨ ਵਾਲੇ ਗਾਹਕ ਇਹ ਨਾਮ ਦੇਖਣਗੇ।',
    shopName: 'ਦੁਕਾਨ ਦਾ ਨਾਮ',
    shopLink: 'ਦੁਕਾਨ ਦਾ ਲਿੰਕ',
    shopLinkHint: 'ਸਿਰਫ਼ ਛੋਟੇ ਅੰਗਰੇਜ਼ੀ ਅੱਖਰ, ਅੰਕ ਅਤੇ ਡੈਸ਼ (-)।',
    loading: 'ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ…',
    shopOpen: 'ਖੁੱਲ੍ਹੀ',
    shopClosed: 'ਬੰਦ',
    customersCanJoin: 'ਗਾਹਕ ਲਾਈਨ ਵਿੱਚ ਲੱਗ ਸਕਦੇ ਹਨ',
    customersCannotJoin: 'ਹੁਣ ਗਾਹਕ ਲਾਈਨ ਵਿੱਚ ਨਹੀਂ ਲੱਗ ਸਕਦੇ',
    errGeneric: 'ਕੁਝ ਗਲਤ ਹੋ ਗਿਆ। ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
    errNetwork: 'ਇੰਟਰਨੈੱਟ ਨਹੀਂ ਹੈ। ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
    errNotConfigured: 'ਐਪ ਡਾਟਾਬੇਸ ਨਾਲ ਜੁੜੀ ਨਹੀਂ ਹੈ (.env ਨਹੀਂ ਹੈ)।',
    errInvalidLogin: 'ਈਮੇਲ ਜਾਂ ਪਾਸਵਰਡ ਗਲਤ ਹੈ।',
    errEmailTaken: 'ਇਸ ਈਮੇਲ ਨਾਲ ਖਾਤਾ ਪਹਿਲਾਂ ਹੀ ਹੈ। ਲੌਗਇਨ ਕਰੋ।',
    errWeakPassword: 'ਪਾਸਵਰਡ ਘੱਟੋ-ਘੱਟ 6 ਅੱਖਰਾਂ ਦਾ ਹੋਵੇ।',
    errInvalidEmail: 'ਸਹੀ ਈਮੇਲ ਲਿਖੋ।',
    errEmailNotConfirmed: 'ਪਹਿਲਾਂ ਆਪਣੀ ਈਮੇਲ ਪੱਕੀ ਕਰੋ (ਇਨਬਾਕਸ ਦੇਖੋ)।',
    errTooMany: 'ਬਹੁਤ ਵਾਰ ਕੋਸ਼ਿਸ਼ ਹੋਈ। ਇੱਕ ਮਿੰਟ ਰੁਕ ਕੇ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
    errSlugTaken: 'ਇਹ ਲਿੰਕ ਪਹਿਲਾਂ ਹੀ ਲਿਆ ਹੋਇਆ ਹੈ। ਹੋਰ ਲਿਖੋ।',
    errInvalidSlug: 'ਲਿੰਕ 3–40 ਛੋਟੇ ਅੱਖਰ, ਅੰਕ ਜਾਂ ਡੈਸ਼ ਦਾ ਹੋਵੇ।',
    errInvalidName: 'ਨਾਮ ਲਿਖੋ।',
  },
} as const;

export type StringKey = keyof typeof strings.en;

type I18nValue = { lang: Lang; t: (key: StringKey) => string; toggle: () => void };

const I18nContext = createContext<I18nValue | null>(null);
const STORAGE_KEY = 'qline.lang';

export function I18nProvider({ children }: { children: ReactNode }) {
  // Punjabi first, as agreed for the pilot.
  const [lang, setLang] = useState<Lang>('pa');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === 'pa' || saved === 'en') setLang(saved);
      })
      .catch(() => {});
  }, []);

  const toggle = () => {
    const nextLang: Lang = lang === 'pa' ? 'en' : 'pa';
    setLang(nextLang);
    AsyncStorage.setItem(STORAGE_KEY, nextLang).catch(() => {});
  };

  const t = (key: StringKey) => strings[lang][key];

  return <I18nContext.Provider value={{ lang, t, toggle }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
