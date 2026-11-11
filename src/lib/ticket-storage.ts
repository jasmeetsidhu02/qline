import AsyncStorage from '@react-native-async-storage/async-storage';

// The customer's secret ticket token, saved on their phone (localStorage in
// the browser), one per shop. Whoever holds the token owns the ticket, so
// closing the tab and scanning the QR again brings their number back.
const key = (slug: string) => `qline.ticket.${slug}`;

export async function saveTicket(slug: string, token: string) {
  try {
    await AsyncStorage.setItem(key(slug), token);
  } catch {
    // Private browsing can block storage. The ticket still works until the tab closes.
  }
}

export async function loadTicket(slug: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key(slug));
  } catch {
    return null;
  }
}

export async function clearTicket(slug: string) {
  try {
    await AsyncStorage.removeItem(key(slug));
  } catch {}
}
