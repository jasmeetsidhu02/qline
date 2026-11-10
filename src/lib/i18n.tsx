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
