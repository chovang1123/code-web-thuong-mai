import { useEffect, type ReactElement } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import ProductsScreen from '../src/app/(tabs)/index';
import CartScreen from '../src/app/(tabs)/cart';
import OrdersScreen from '../src/app/(tabs)/orders';
import LoginScreen from '../src/app/login';
import ProductScreen from '../src/app/product/[id]';
import CheckoutScreen from '../src/app/checkout';
import { createApi } from '../src/lib/api';
import { api, ShopProvider } from '../src/state/shop';
import { ShopStore } from '../src/state/shop-store';
import type { Cart, Order, Product, Session } from '../src/types';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ id: 'p1' }),
  useFocusEffect: (effect: Parameters<typeof useEffect>[0]) => {
    const React = require('react');
    React.useEffect(effect, [effect]);
  },
}));

const product: Product = { _id: 'p1', name: 'Tai nghe Bluetooth', price: 150000, stock: 5, images: [], category: 'Điện tử', description: 'Âm thanh rõ nét.' };
const session: Session = { token: 'token', user: { id: 'u1', name: 'Nguyễn An', email: 'an@example.com', role: 'customer' } };

function harness(authenticated = true, initialQuantity = 1) {
  let cart: Cart = { items: initialQuantity ? [{ product, quantity: initialQuantity }] : [] };
  const orders: Order[] = [];
  const storage = { read: jest.fn(async () => authenticated ? session : null), write: jest.fn(async () => {}), clear: jest.fn(async () => {}) };
  const fetcher = jest.fn<Promise<Response>, [string, RequestInit?]>(async (url, options) => {
    const body = options?.body ? JSON.parse(options.body as string) : null;
    let data: unknown;
    let status = 200;
    if (url.endsWith('/auth/login')) {
      status = body.password === 'password123' ? 200 : 401;
      data = status === 200 ? session : { message: 'Wrong password' };
    } else if (url.endsWith('/cart/web')) {
      if (options?.method === 'PUT') cart = { items: body.items.map((item: { quantity: number }) => ({ product, quantity: item.quantity })) };
      data = { cart };
    } else if (url.endsWith('/orders/web') && options?.method === 'POST') {
      const order: Order = { _id: 'order0001', status: 'pending', createdAt: new Date().toISOString(), totalPrice: 150000, shippingAddress: body.shippingAddress,
        orderItems: [{ name: product.name, price: product.price, quantity: 1 }] };
      orders.push(order); cart = { items: [] }; status = 201; data = { order };
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
  return { mount, store, testApi, storage, fetcher, orders };
}

afterEach(() => jest.restoreAllMocks());

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
  await fireEvent.press(screen.getByRole('button', { name: 'Xác nhận đặt hàng' }));
  expect(await screen.findByText('Vui lòng nhập đủ họ tên, địa chỉ và tỉnh/thành phố.')).toBeOnTheScreen();
  expect(test.orders).toHaveLength(0);
  await fireEvent.changeText(screen.getByLabelText('Số điện thoại *'), '0901234567');
  await fireEvent.changeText(screen.getByLabelText('Địa chỉ nhận hàng *'), '12 Nguyễn Trãi');
  await fireEvent.changeText(screen.getByLabelText('Tỉnh / Thành phố *'), 'TP.HCM');
  await fireEvent.press(screen.getByRole('button', { name: 'Xác nhận đặt hàng' }));
  expect(await screen.findByText('ĐẶT HÀNG THÀNH CÔNG')).toBeOnTheScreen();
  expect(test.orders).toHaveLength(1);
  expect(test.store.getSnapshot().cart).toEqual([]);
  await fireEvent.press(screen.getByRole('button', { name: 'Xem đơn hàng' }));
  expect(router.replace).toHaveBeenCalledWith('/(tabs)/orders');
  await view.rerender(<ShopProvider store={test.store}><OrdersScreen /></ShopProvider>);
  expect(await screen.findByText('Chờ xác nhận')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Xem chi tiết' }));
  expect(screen.getByText('12 Nguyễn Trãi, TP.HCM')).toBeOnTheScreen();
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
  await fireEvent.changeText(screen.getByLabelText('Số điện thoại *'), '0901234567');
  await fireEvent.changeText(screen.getByLabelText('Địa chỉ nhận hàng *'), '12 Nguyễn Trãi');
  await fireEvent.changeText(screen.getByLabelText('Tỉnh / Thành phố *'), 'TP.HCM');
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
