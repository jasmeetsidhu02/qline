// What a push notification says. Kept separate from the sending code so it
// can be tested on its own.
export type Kind = 'next' | 'turn';
export type Lang = 'en' | 'hi' | 'pa';

export type DueRow = {
  entry_id: string;
  kind: Kind;
  ticket_no: number;
  name: string;
  shop_name: string;
  shop_slug: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  lang: Lang;
};

const TEXT = {
  en: {
    next: (n: number) => ({ title: "You're next", body: `Number ${n}. Please come back to the shop now.` }),
    turn: (n: number) => ({ title: "It's your turn", body: `Number ${n}. Go to the chair.` }),
  },
  hi: {
    next: (n: number) => ({ title: 'अगली बारी आपकी', body: `नंबर ${n}। कृपया अब दुकान पर आ जाएँ।` }),
    turn: (n: number) => ({ title: 'आपकी बारी आ गई', body: `नंबर ${n}। कुर्सी पर आएँ।` }),
  },
  pa: {
    next: (n: number) => ({ title: 'ਅਗਲੀ ਵਾਰੀ ਤੁਹਾਡੀ', body: `ਨੰਬਰ ${n}। ਕਿਰਪਾ ਕਰਕੇ ਹੁਣ ਦੁਕਾਨ ਤੇ ਆ ਜਾਓ।` }),
    turn: (n: number) => ({ title: 'ਤੁਹਾਡੀ ਵਾਰੀ ਆ ਗਈ', body: `ਨੰਬਰ ${n}। ਕੁਰਸੀ ਤੇ ਆਓ।` }),
  },
} as const;

export function buildMessage(row: DueRow) {
  // Anything unexpected falls back to English, the default in the app.
  const lang: Lang = row.lang in TEXT ? row.lang : 'en';
  const { title, body } = TEXT[lang][row.kind](row.ticket_no);
  return {
    kind: row.kind,
    // The shop name goes in the title so a glance at the lock screen is enough.
    title: `${row.shop_name} — ${title}`,
    body,
    // One tag per visit: a "turn" message replaces the earlier "next" one
    // instead of stacking up on the lock screen.
    tag: `qline-${row.entry_id}`,
    url: `/s/${row.shop_slug}/ticket`,
  };
}

// "Your turn" is worth waking the phone for; "you're next" is a heads-up.
export const urgencyFor = (kind: Kind) => (kind === 'turn' ? 'high' : 'normal');
export const ttlFor = (kind: Kind) => (kind === 'turn' ? 600 : 900);
