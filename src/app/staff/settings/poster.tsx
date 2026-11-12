import { Printer } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { customerUrl } from '@/lib/app-url';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';

// Every language at once: the poster goes on a wall, where one customer
// reads Punjabi and the next reads Hindi.
const SCAN_LINES = [
  { text: 'ਲਾਈਨ ਵਿੱਚ ਲੱਗਣ ਲਈ ਸਕੈਨ ਕਰੋ', sub: 'ਆਪਣੀ ਵਾਰੀ ਫ਼ੋਨ ਤੇ ਦੇਖੋ' },
  { text: 'लाइन में लगने के लिए स्कैन करें', sub: 'अपनी बारी फ़ोन पर देखें' },
  { text: 'Scan to join the line', sub: 'See your turn on your phone' },
];

export default function Poster() {
  const { t } = useI18n();
  const { shop } = useAuth();
  const qrRef = useRef<{ toDataURL?: (cb: (data: string) => void) => void } | null>(null);
  const [busy, setBusy] = useState(false);

  if (!shop) return null;
  const url = customerUrl(shop.slug);

  function print() {
    if (Platform.OS !== 'web') return;
    setBusy(true);
    const ref = qrRef.current;
    if (!ref?.toDataURL) {
      setBusy(false);
      return;
    }
    ref.toDataURL((base64) => {
      // A separate window, so the poster prints on its own rather than
      // taking the whole app's styling with it.
      const win = window.open('', '_blank', 'width=820,height=1000');
      setBusy(false);
      if (!win) return;
      win.document.write(posterHtml(shop!.name, url, base64));
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 400);
    });
  }

  return (
    <Screen title={t('settingsPoster')} subtitle={t('posterHint')} back>
      {/* What will be printed, roughly to scale. */}
      <View className="items-center gap-6 rounded-2xl bg-white px-6 py-10">
        <Text className="text-center font-ui-sb text-[26px] tracking-[-0.5px] text-ink">{shop.name}</Text>
        <View className="rounded-2xl border border-border p-4">
          <QRCode value={url} size={190} color="#16211C" backgroundColor="#ffffff" ecl="M" />
        </View>
        <View className="gap-3">
          {SCAN_LINES.map((line) => (
            <View key={line.text} className="items-center">
              <Text className="text-center text-[16px] font-ui-sb text-ink">{line.text}</Text>
              <Text className="text-center text-[13px] text-muted-foreground">{line.sub}</Text>
            </View>
          ))}
        </View>
        <Text className="text-center text-[12px] text-muted-foreground" selectable>
          {url}
        </Text>
      </View>

      {Platform.OS === 'web' ? (
        <Button size="xl" onPress={print} disabled={busy}>
          {busy ? (
            <ActivityIndicator color="#EFF1EE" />
          ) : (
            <>
              <Printer size={18} color="#EFF1EE" />
              <Text>{t('printPoster')}</Text>
            </>
          )}
        </Button>
      ) : (
        <Text className="text-center text-[14px] text-muted-foreground">
          {t('printPoster')}: {url}
        </Text>
      )}

      {/* Off screen, print resolution. The small code above would be fuzzy on paper. */}
      <View pointerEvents="none" style={{ position: 'absolute', left: -10000, top: 0, opacity: 0 }}>
        <QRCode
          value={url}
          size={900}
          quietZone={48}
          color="#16211C"
          backgroundColor="#ffffff"
          ecl="M"
          getRef={(c) => (qrRef.current = c)}
        />
      </View>
    </Screen>
  );
}

function posterHtml(shopName: string, url: string, qrBase64: string) {
  const escape = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
  const lines = SCAN_LINES.map(
    (l) => `<div class="line"><div class="big">${escape(l.text)}</div><div class="small">${escape(l.sub)}</div></div>`
  ).join('');

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<title>${escape(shopName)} — QLine</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
         color: #16211C; display: flex; align-items: center; justify-content: center;
         min-height: 100vh; }
  .poster { width: 100%; max-width: 170mm; text-align: center; border: 2px solid #16211C;
            border-radius: 10mm; padding: 14mm 10mm; }
  h1 { font-size: 34pt; margin: 0 0 8mm; letter-spacing: -0.5pt; }
  img { width: 95mm; height: 95mm; display: block; margin: 0 auto 8mm; }
  .line { margin-bottom: 5mm; }
  .big { font-size: 15pt; font-weight: 600; }
  .small { font-size: 11pt; color: #5E6761; }
  .url { margin-top: 7mm; font-size: 9pt; color: #5E6761; word-break: break-all; }
  @media print { body { min-height: auto; } .poster { border-color: #16211C; } }
</style></head>
<body><div class="poster">
  <h1>${escape(shopName)}</h1>
  <img src="data:image/png;base64,${qrBase64}" alt="QR code" />
  ${lines}
  <div class="url">${escape(url)}</div>
</div></body></html>`;
}
