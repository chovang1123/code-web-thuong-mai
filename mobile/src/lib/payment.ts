import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import type { ShopStore } from '../state/shop-store';

export async function openMobilePayment(store: ShopStore, id: string) {
  const appReturnUrl = Linking.createURL('payment-result');
  const { url } = await store.startPayment(id, appReturnUrl);
  if (Platform.OS === 'android') {
    // Android auth-session dismissal uses AppState, which is not a payment return.
    // Open the bank in the full browser; Expo Router handles the backend deep link.
    await Linking.openURL(url);
    return;
  }
  const result = await WebBrowser.openAuthSessionAsync(url, appReturnUrl);
  if (result.type !== 'success') return;
  const callback = new URL(result.url);
  const target = new URL(appReturnUrl);
  if (callback.protocol !== target.protocol || callback.host !== target.host || callback.pathname !== target.pathname || callback.searchParams.get('orderId') !== id) return;
  // Query values only select copy. The result screen reads paid status from the API.
  const returned = Linking.parse(result.url).queryParams?.result;
  router.replace({ pathname: '/payment-result', params: { orderId: id, ...(typeof returned === 'string' ? { result: returned } : {}) } });
}
