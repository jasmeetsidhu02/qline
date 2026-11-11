import * as Clipboard from 'expo-clipboard';
import { Copy, Share2 } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Platform, Share, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { SectionHeading } from '@/components/screen';
import { customerUrl } from '@/lib/app-url';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { StringKey, useI18n } from '@/lib/i18n';

export function CustomerLinkCard({ slug, shopName }: { slug: string; shopName: string }) {
  const { t } = useI18n();
  const url = customerUrl(slug);
  const isLocalhost = /\/\/(localhost|127\.0\.0\.1)/.test(url);
  // Two QR codes: the one on screen, and a bigger one kept off screen that
  // is what gets shared or printed. A shared code needs a white margin
  // around it (its "quiet zone") or scanners cannot read it.
  const exportRef = useRef<{ toDataURL?: (cb: (data: string) => void) => void } | null>(null);
  const [note, setNote] = useState<StringKey | null>(null);

  function flash(key: StringKey) {
    setNote(key);
    setTimeout(() => setNote(null), 2500);
  }

  // react-native-qrcode-svg hands back the QR as base64 PNG.
  function qrPngBase64() {
    return new Promise<string>((resolve, reject) => {
      const ref = exportRef.current;
      if (!ref?.toDataURL) return reject(new Error('QR not ready'));
      ref.toDataURL((data) => resolve(data));
    });
  }

  async function shareQr() {
    const message = `${shopName} — ${t('shareMessage')}\n${url}`;
    try {
      const base64 = await qrPngBase64();

      if (Platform.OS === 'web') {
        const blob = await (await fetch(`data:image/png;base64,${base64}`)).blob();
        const file = new File([blob], `${slug}-qr.png`, { type: 'image/png' });
        const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
        if (nav.share && nav.canShare?.({ files: [file] })) {
          await nav.share({ files: [file], text: message, title: shopName });
          return;
        }
        // No share sheet in this browser: download the image instead.
        const href = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = href;
        a.download = `${slug}-qr.png`;
        a.click();
        URL.revokeObjectURL(href);
        flash('qrDownloaded');
        return;
      }

      // Phone: save the PNG next to the app, then open the share sheet so it
      // can go to WhatsApp, Gmail, Photos, anywhere.
      const [FileSystem, Sharing] = await Promise.all([
        import('expo-file-system/legacy'),
        import('expo-sharing'),
      ]);
      const uri = `${FileSystem.cacheDirectory}${slug}-qr.png`;
      await FileSystem.writeAsStringAsync(uri, base64, { encoding: 'base64' });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: shopName, UTI: 'public.png' });
      } else {
        await Share.share({ message });
      }
    } catch {
      // Fall back to sharing just the link, which always works.
      if (Platform.OS === 'web') await copyLink();
      else await Share.share({ message }).catch(() => flash('shareFailed'));
    }
  }

  async function copyLink() {
    await Clipboard.setStringAsync(url);
    flash('linkCopied');
  }

  return (
    <View className="gap-5 rounded-2xl bg-card p-6">
      <View className="gap-1">
        <SectionHeading>{t('qrHeading')}</SectionHeading>
        <Text className="text-[14px] leading-[20px] text-muted-foreground">{t('qrHint')}</Text>
      </View>

      <View className="items-center gap-3">
        <View className="rounded-2xl bg-white p-4">
          <QRCode value={url} size={188} color="#16211C" backgroundColor="#ffffff" ecl="M" />
        </View>
        <Text className="text-center text-[13px] text-muted-foreground" selectable>
          {url}
        </Text>
      </View>

      <View className="flex-row gap-3">
        <Button className="flex-1 rounded-xl" onPress={shareQr}>
          <Share2 size={16} color="#EFF1EE" />
          <Text>{t('shareQr')}</Text>
        </Button>
        <Button variant="outline" className="flex-1 rounded-xl" onPress={copyLink}>
          <Copy size={16} color="#16211C" />
          <Text>{t('copyLink')}</Text>
        </Button>
      </View>

      {/* Off-screen, print-sized copy. Never visible; only used for sharing. */}
      <View pointerEvents="none" style={{ position: 'absolute', left: -10000, top: 0, opacity: 0 }}>
        <QRCode
          value={url}
          size={720}
          quietZone={48}
          color="#16211C"
          backgroundColor="#ffffff"
          ecl="M"
          getRef={(c) => (exportRef.current = c)}
        />
      </View>

      {note ? <Text className="text-center text-[13px] text-brass">{t(note)}</Text> : null}
      {isLocalhost ? (
        <View className="rounded-xl bg-brass/10 px-4 py-3">
          <Text className="text-[13px] leading-[19px] text-brass">{t('qrLocalhostWarning')}</Text>
        </View>
      ) : null}
    </View>
  );
}
