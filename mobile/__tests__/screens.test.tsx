import { useEffect, type ReactElement } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import PaymentResultScreen from '../src/app/payment-result';
import ProductsScreen from '../src/app/(tabs)/index';
import CartScreen from '../src/app/(tabs)/cart';
import OrdersScreen from '../src/app/(tabs)/orders';
import LoginScreen from '../src/app/login';
import ProductScreen from '../src/app/product/[id]';
import CheckoutScreen from '../src/app/checkout';
import AccountScreen from '../src/app/(tabs)/account';
import { createApi } from '../src/lib/api';
import { api, ShopProvider } from '../src/state/shop';
import { ShopStore } from '../src/state/shop-store';
import type { Cart, Order, Product, SavedAddress, Session } from '../src/types';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => mockRouteParams,
  useFocusEffect: (effect: Parameters<typeof useEffect>[0]) => {
    const React = require('react');
    React.useEffect(effect, [effect]);
  },
}));
let mockRouteParams: Record<string, string> = { id: 'p1' };
jest.mock('@expo/vector-icons/Ionicons', () => 'Icon');
jest.mock('expo-linking', () => ({ createURL: (path: string) => `exp://127.0.0.1:8082/--/${path}`, openURL: jest.fn(async () => {}), parse: (url: string) => ({ queryParams: Object.fromEntries(new URL(url).searchParams) }) }));
jest.mock('expo-web-browser', () => ({ openAuthSessionAsync: jest.fn(async () => ({ type: 'success', url: 'exp://127.0.0.1:8082/--/payment-result?orderId=order0001&result=pending' })) }));

const product: Product = { _id: 'p1', name: 'Tai nghe Bluetooth', price: 150000, stock: 5, images: [], category: 'Điện tử', description: 'Âm thanh rõ nét.' };
const session: Session = { token: 'token', user: { id: 'u1', name: 'Nguyễn An', email: 'an@example.com', role: 'customer' } };

function harness(authenticated = true, initialQuantity = 1) {
  let cart: Cart = { items: initialQuantity ? [{ product, quantity: initialQuantity }] : [] };
  const orders: Order[] = [];
  const addresses: SavedAddress[] = [];
  let paymentStatus = 'unpaid';
  const storage = { read: jest.fn(async () => authenticated ? session : null), write: jest.fn(async () => {}), clear: jest.fn(async () => {}) };
  const fetcher = jest.fn<Promise<Response>, [string, RequestInit?]>(async (url, options) => {
    const body = options?.body ? JSON.parse(options.body as string) : null;
    let data: unknown;
    let status = 200;
    if (url.endsWith('/auth/login')) {
      status = body.password === 'password123' ? 200 : 401;
      data = status === 200 ? session : { message: 'Wrong password' };
    } else if (url.includes('/auth/addresses')) {
      if (options?.method === 'POST' || options?.method === 'PUT') {
        const address = { ...body, _id: 'address-1' };
        addresses.splice(0, addresses.length, address); data = { address };
      } else data = { addresses };
    } else if (url.endsWith('/cart/web')) {
      if (options?.method === 'PUT') cart = { items: body.items.map((item: { quantity: number }) => ({ product, quantity: item.quantity })) };
      data = { cart };
    } else if (url.endsWith('/orders/web') && options?.method === 'POST') {
      const order: Order = { _id: 'order0001', status: 'pending', createdAt: new Date().toISOString(), totalPrice: 150000, shippingAddress: body.shippingAddress,
        orderItems: [{ name: product.name, price: product.price, quantity: 1 }] };
      if (body.paymentMethod) {
        order.paymentMethod = body.paymentMethod;
        order.paymentChannel = body.bankCode;
        order.orderStatus = "pending";
        order.expiresAt = new Date(Date.now() + 900000).toISOString();
        order.paymentResult = { status: 'pending' };
      }
      orders.push(order); cart = { items: [] }; status = 201; data = { order };
    } else if (/\/orders\/[^/]+\/status$/.test(url)) {
      data = { paymentStatus, orderStatus: paymentStatus === 'paid' ? 'confirmed' : 'pending' };
    } else if (url.endsWith('/vnpay/create')) {
      data = { url: 'https://gateway.example.test/pay' };
    } else if (url.endsWith('/orders/web')) data = { orders };
    else if (url.endsWith('/products/p1')) data = product;
    else data = [product];
    return { ok: status < 400, status, json: async () => structuredClone(data) } as Response;
  });
  const testApi = createApi('http://test/api', fetcher);
  const store = new ShopStore(testApi, storage);
  const mount = async (element: ReactElement) => {
    await store.initialize();
    return render(<ShopProvider store={store}>{element}</ShopProvider>);
  };
  return { mount, store, testApi, storage, fetcher, orders, addresses, setPaymentStatus: (value: string) => { paymentStatus = value; } };
}

async function fillDefaultAddress() {
  await screen.findByLabelText('Số điện thoại *');
  await fireEvent.changeText(screen.getByLabelText('Số điện thoại *'), '0901234567');
  await fireEvent.changeText(screen.getByLabelText('Địa chỉ nhận hàng *'), '12 Nguyễn Trãi');
  await fireEvent.changeText(screen.getByLabelText('Tỉnh / Thành phố *'), 'TP.HCM');
  await fireEvent.changeText(screen.getByLabelText('Quận / Huyện *'), 'Quận 1');
  await fireEvent.press(screen.getByRole('button', { name: 'Lưu địa chỉ mặc định' }));
  await screen.findByText('0901234567');
}

afterEach(() => { jest.restoreAllMocks(); mockRouteParams = { id: 'p1' }; });

test('catalog renders real product fields and filters by search text', async () => {
  const test = harness(false);
  jest.spyOn(api, 'products').mockImplementation(test.testApi.products);
  await test.mount(<ProductsScreen />);
  expect(await screen.findByText(product.name)).toBeOnTheScreen();
  await fireEvent.changeText(screen.getByLabelText('Tìm sản phẩm'), 'không tồn tại');
  expect(screen.getByText('Không có kết quả')).toBeOnTheScreen();
  await fireEvent.changeText(screen.getByLabelText('Tìm sản phẩm'), 'Bluetooth');
  await fireEvent.press(screen.getByRole('button', { name: `Xem ${product.name}` }));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/product/[id]', params: { id: 'p1' } });
});

test('catalog shows a connection error and the retry button reloads products', async () => {
  const test = harness(false);
  jest.spyOn(api, 'products').mockRejectedValueOnce(new Error('Không có kết nối')).mockResolvedValueOnce([product]);
  await test.mount(<ProductsScreen />);
  expect(await screen.findByText('Không có kết nối')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Thử lại' }));
  expect(await screen.findByText(product.name)).toBeOnTheScreen();
});

test('login form rejects wrong credentials, then persists a valid session and returns', async () => {
  const test = harness(false);
  await test.mount(<LoginScreen />);
  await fireEvent.changeText(screen.getByLabelText('Email'), 'an@example.com');
  await fireEvent.changeText(screen.getByLabelText('Mật khẩu'), 'wrong');
  await fireEvent.press(screen.getByRole('button', { name: 'Đăng nhập' }));
  expect(await screen.findByText('Email hoặc mật khẩu không đúng.')).toBeOnTheScreen();
  expect(test.storage.write).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText('Mật khẩu'), 'password123');
  await fireEvent.press(screen.getByRole('button', { name: 'Đăng nhập' }));
  await waitFor(() => expect(test.storage.write).toHaveBeenCalledWith(session));
  expect(router.back).toHaveBeenCalled();
});

test('product detail adds to the server cart; cart buttons update and remove items', async () => {
  const test = harness(true, 0);
  jest.spyOn(api, 'product').mockImplementation(test.testApi.product);
  const view = await test.mount(<ProductScreen />);
  await screen.findByText(product.description);
  await fireEvent.press(screen.getByRole('button', { name: 'Thêm vào giỏ hàng' }));
  expect(await screen.findByText('Đã thêm vào giỏ hàng.')).toBeOnTheScreen();
  await view.rerender(<ShopProvider store={test.store}><CartScreen /></ShopProvider>);
  await screen.findByText(product.name);
  await fireEvent.press(screen.getByRole('button', { name: `Tăng số lượng ${product.name}` }));
  expect(await screen.findByLabelText(`Số lượng ${product.name}: 2`)).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: `Xóa ${product.name}` }));
  expect(await screen.findByText('Giỏ hàng đang trống')).toBeOnTheScreen();
});

test('checkout validates fields, creates one order and shows it in order history', async () => {
  const test = harness();
  const view = await test.mount(<CheckoutScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: 'Lưu địa chỉ mặc định' }));
  expect(await screen.findByText('Vui lòng nhập đủ họ tên, địa chỉ và tỉnh/thành phố.')).toBeOnTheScreen();
  expect(test.orders).toHaveLength(0);
  await fillDefaultAddress();
  await fireEvent.press(screen.getByRole('button', { name: 'Xác nhận đặt hàng' }));
  expect(await screen.findByText('Đặt hàng thành công')).toBeOnTheScreen();
  expect(test.orders).toHaveLength(1);
  expect(test.store.getSnapshot().cart).toEqual([]);
  await fireEvent.press(screen.getByRole('button', { name: 'Xem đơn hàng' }));
  expect(router.replace).toHaveBeenCalledWith('/(tabs)/orders');
  await view.rerender(<ShopProvider store={test.store}><OrdersScreen /></ShopProvider>);
  expect((await screen.findAllByText('Chờ xác nhận')).length).toBeGreaterThan(1);
  await fireEvent.press(screen.getByRole('button', { name: 'Xem chi tiết' }));
  expect(screen.getByText('12 Nguyễn Trãi, Quận 1, TP.HCM')).toBeOnTheScreen();
});

test.each([['VNPay - Thẻ ATM nội địa', 'VNBANK'], ['VNPay - Thẻ quốc tế', 'INTCARD']])('checkout opens %s for the saved order', async (label, method) => {
  const test = harness();
  const open = jest.mocked(WebBrowser.openAuthSessionAsync);
  await test.mount(<CheckoutScreen />);
  await fillDefaultAddress();
  await fireEvent.press(screen.getByRole('button', { name: label }));
  await fireEvent.press(screen.getByRole('button', { name: 'Xác nhận đặt hàng' }));
  await waitFor(() => expect(open).toHaveBeenCalledWith('https://gateway.example.test/pay', 'exp://127.0.0.1:8082/--/payment-result'));
  expect(screen.queryByText('Đặt hàng thành công')).toBeNull();
  expect(router.replace).toHaveBeenCalledWith({ pathname: '/payment-result', params: { orderId: 'order0001', result: 'pending' } });
  const start = test.fetcher.mock.calls.find(([url]) => url.endsWith('/vnpay/create'));
  expect(JSON.parse(start![1]!.body as string).appReturnUrl).toBe('exp://127.0.0.1:8082/--/payment-result');
  expect(test.orders.map(order => order.paymentChannel)).toEqual([method]);
});

test('Android checkout waits for the browser launch without showing order results, then leaves routing to the bank callback', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  const test = harness();
  let opened!: () => void;
  jest.mocked(Linking.openURL).mockImplementationOnce(() => new Promise(resolve => { opened = () => resolve(true); }));
  await test.mount(<CheckoutScreen />);
  await fillDefaultAddress();
  await fireEvent.press(screen.getByRole('button', { name: 'VNPay - Thẻ ATM nội địa' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Xác nhận đặt hàng' }));
  await waitFor(() => expect(Linking.openURL).toHaveBeenCalledWith('https://gateway.example.test/pay'));
  expect(screen.getByText('Đang mở VNPay…')).toBeOnTheScreen();
  expect(screen.queryByText('Đơn đang chờ thanh toán')).toBeNull();
  expect(screen.queryByText('Kết quả thanh toán')).toBeNull();
  expect(router.replace).not.toHaveBeenCalled();
  await act(async () => { opened(); });
  expect(router.replace).not.toHaveBeenCalled();
  expect(screen.queryByText('Đặt hàng thành công')).toBeNull();
  expect(test.orders).toHaveLength(1);
});

test('a paid query parameter cannot show checkout success before the authenticated status API confirms payment', async () => {
  const test = harness();
  mockRouteParams = { orderId: 'order0001', result: 'paid' };
  const view = await test.mount(<PaymentResultScreen />);
  await waitFor(() => expect(test.fetcher).toHaveBeenCalledWith('http://test/api/orders/order0001/status', expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer token' }) })));
  expect(screen.queryByText('Đặt hàng thành công')).toBeNull();
  await view.unmount();
  test.setPaymentStatus('paid');
  const paidView = await test.mount(<PaymentResultScreen />);
  expect(await screen.findByText('Đặt hàng thành công')).toBeOnTheScreen();
  // A second order must not inherit the previous order's successful status or error.
  mockRouteParams = { orderId: 'order0002', result: 'pending' };
  jest.spyOn(test.store, 'orderStatus').mockRejectedValueOnce(new Error('Không đọc được đơn mới'));
  await paidView.rerender(<ShopProvider store={test.store}><PaymentResultScreen /></ShopProvider>);
  expect(await screen.findByText('Không đọc được đơn mới')).toBeOnTheScreen();
  expect(screen.queryByText('Đặt hàng thành công')).toBeNull();
});

test('saving the default phone and address in Account survives a fresh app store and prefills checkout', async () => {
  const test = harness();
  const account = await test.mount(<AccountScreen />);
  await fillDefaultAddress();
  expect(test.addresses).toEqual([expect.objectContaining({ phoneNumber: '0901234567', streetAddress: '12 Nguyễn Trãi', state: 'TP.HCM', city: 'Quận 1', isDefault: true })]);
  await account.unmount();
  const reopened = new ShopStore(test.testApi, test.storage);
  await reopened.initialize();
  await render(<ShopProvider store={reopened}><CheckoutScreen /></ShopProvider>);
  expect(await screen.findByText('0901234567')).toBeOnTheScreen();
  expect(screen.getByText('12 Nguyễn Trãi, Quận 1, TP.HCM')).toBeOnTheScreen();
  expect(screen.queryByLabelText('Số điện thoại *')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Xác nhận đặt hàng' }));
  expect(await screen.findByText('Đặt hàng thành công')).toBeOnTheScreen();
  expect(test.orders[0].shippingAddress).toMatchObject({ phoneNumber: '0901234567', city: 'Quận 1', state: 'TP.HCM', streetAddress: '12 Nguyễn Trãi' });
});

test('checkout reads the web default and a temporary delivery phone/address does not replace it', async () => {
  const test = harness();
  test.addresses.push({ _id: 'home', label: 'Nhà riêng', fullName: 'An', phoneNumber: '0912345678', streetAddress: '12 Home', city: 'Quận 1', state: 'TP.HCM', isDefault: true });
  await test.mount(<CheckoutScreen />);
  await screen.findByText('0912345678');
  await fireEvent.press(screen.getByRole('button', { name: 'Giao đến địa chỉ khác' }));
  await fireEvent.changeText(screen.getByLabelText('Số điện thoại *'), '0987654321');
  await fireEvent.changeText(screen.getByLabelText('Địa chỉ nhận hàng *'), '34 Office');
  await fireEvent.changeText(screen.getByLabelText('Tỉnh / Thành phố *'), 'Hà Nội');
  await fireEvent.changeText(screen.getByLabelText('Quận / Huyện *'), 'Đống Đa');
  await fireEvent.press(screen.getByRole('button', { name: 'Xác nhận đặt hàng' }));
  await screen.findByText('Đặt hàng thành công');
  expect(test.orders[0].shippingAddress).toMatchObject({ phoneNumber: '0987654321', streetAddress: '34 Office', city: 'Đống Đa', state: 'Hà Nội' });
  expect(test.addresses[0]).toMatchObject({ phoneNumber: '0912345678', streetAddress: '12 Home' });
});

test('a failed save retains the address form and retries the existing default instead of adding another address', async () => {
  const test = harness();
  test.addresses.push({ _id: 'address-1', label: 'Nhà riêng', fullName: 'An', phoneNumber: '0912345678', streetAddress: '12 Home', city: 'Quận 1', state: 'TP.HCM', isDefault: true });
  const original = test.fetcher.getMockImplementation()!;
  let fail = true;
  test.fetcher.mockImplementation(async (url, options) => {
    if (url.endsWith('/auth/addresses/address-1') && options?.method === 'PUT' && fail) { fail = false; throw new Error('offline'); }
    return original(url, options);
  });
  await test.mount(<AccountScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: 'Sửa địa chỉ mặc định' }));
  await fireEvent.changeText(screen.getByLabelText('Số điện thoại *'), '0987654321');
  await fireEvent.press(screen.getByRole('button', { name: 'Lưu địa chỉ mặc định' }));
  expect(await screen.findByText(/Không kết nối được máy chủ/)).toBeOnTheScreen();
  expect(screen.getByLabelText('Số điện thoại *')).toHaveDisplayValue('0987654321');
  expect(test.addresses[0].phoneNumber).toBe('0912345678');
  await fireEvent.press(screen.getByRole('button', { name: 'Lưu địa chỉ mặc định' }));
  await screen.findByText('0987654321');
  expect(test.addresses).toHaveLength(1);
  expect(test.addresses[0].phoneNumber).toBe('0987654321');
});

test('checkout connection loss directs the customer to orders and blocks resubmission', async () => {
  const test = harness();
  // First allow restoring the cart; only fail when POSTing the order.
  const original = test.fetcher.getMockImplementation()!;
  test.fetcher.mockImplementation(async (url, options) => {
    if (url.endsWith('/orders/web') && options?.method === 'POST') throw new Error('Lost connection');
    return original(url, options);
  });
  await test.mount(<CheckoutScreen />);
  await fillDefaultAddress();
  await fireEvent.press(screen.getByRole('button', { name: 'Xác nhận đặt hàng' }));
  expect(await screen.findByRole('button', { name: 'Kiểm tra đơn hàng' })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Xác nhận đặt hàng' })).toBeDisabled();
  expect(test.orders).toHaveLength(0);
});

test('private screens prompt guests to log in instead of showing a cart', async () => {
  const test = harness(false);
  await test.mount(<CartScreen />);
  expect(screen.getByText('Đăng nhập để tiếp tục')).toBeOnTheScreen();
  expect(screen.queryByText(product.name)).toBeNull();
  expect(test.fetcher).not.toHaveBeenCalled();
});
