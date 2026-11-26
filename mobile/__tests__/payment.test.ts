import { Platform } from 'react-native';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { openMobilePayment } from '../src/lib/payment';
import type { ShopStore } from '../src/state/shop-store';

jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));
jest.mock('expo-linking', () => ({ createURL: () => 'netstore://payment-result', openURL: jest.fn(async () => {}), parse: (url: string) => ({ queryParams: Object.fromEntries(new URL(url).searchParams) }) }));
jest.mock('expo-web-browser', () => ({ openAuthSessionAsync: jest.fn() }));
const gateway = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?attempt=fixture';
const startPayment = jest.fn(async (_id: string, _returnUrl: string) => ({ url: gateway }));
const store = { startPayment } as unknown as ShopStore;
beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());

test('Android opens VNPay in the external browser and never navigates to results when opening resolves', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  await openMobilePayment(store, 'o1');
  expect(startPayment).toHaveBeenCalledWith('o1', 'netstore://payment-result');
  expect(Linking.openURL).toHaveBeenCalledWith(gateway);
  expect(WebBrowser.openAuthSessionAsync).not.toHaveBeenCalled();
  expect(router.replace).not.toHaveBeenCalled();
});

test.each(['cancel', 'dismiss', 'locked'] as const)('a %s browser result cannot open the payment result screen', async type => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  jest.mocked(WebBrowser.openAuthSessionAsync).mockResolvedValueOnce({ type: type as WebBrowser.WebBrowserResultType });
  await openMobilePayment(store, 'o1');
  expect(router.replace).not.toHaveBeenCalled();
});

test('only a matching callback for this order opens results; paid still needs the status API', async () => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  jest.mocked(WebBrowser.openAuthSessionAsync).mockResolvedValueOnce({ type: 'success', url: 'netstore://payment-result?orderId=o1&result=paid' });
  await openMobilePayment(store, 'o1');
  expect(router.replace).toHaveBeenCalledWith({ pathname: '/payment-result', params: { orderId: 'o1', result: 'paid' } });
});

test.each(['netstore://payment-result?orderId=another', 'https://other.test/payment-result?orderId=o1'])('unrelated callback %s cannot route to the order', async url => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  jest.mocked(WebBrowser.openAuthSessionAsync).mockResolvedValueOnce({ type: 'success', url });
  await openMobilePayment(store, 'o1');
  expect(router.replace).not.toHaveBeenCalled();
});

test('browser launch failure stays in checkout with a retryable error', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  jest.mocked(Linking.openURL).mockRejectedValueOnce(new Error('Browser unavailable'));
  await expect(openMobilePayment(store, 'o1')).rejects.toThrow('Browser unavailable');
  expect(router.replace).not.toHaveBeenCalled();
});
