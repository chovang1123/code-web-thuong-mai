import { useEffect } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import SellerProducts from '../src/app/(seller)/products';
import { SellerProductForm } from '../src/components/seller-product-form';
import { OrderSummary } from '../src/components/order-summary';
import type { Order, Product } from '../src/types';

jest.mock('@expo/vector-icons/Ionicons', () => 'Icon');
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() }, useFocusEffect: (effect: Parameters<typeof useEffect>[0]) => { require('react').useEffect(effect, [effect]); } }));
jest.mock('../src/state/shop', () => ({ useShop: () => ({ session: { token: 'seller-token', user: { role: 'seller' } }, store: mockStore }) }));
const products: Product[] = Array.from({ length: 13 }, (_, i) => ({ _id: `p${i}`, name: `Máy tính ${i}`, description: 'Dùng học tập', category: 'Laptop', images: ['https://cdn.test/old.png'], price: 200000, stock: 8 }));
const mockStore = {
  sellerDashboard: jest.fn(async () => ({ shop: { name: 'Sao Mai' }, products })),
  saveSellerProduct: jest.fn(async () => ({})),
  uploadSellerImage: jest.fn(async () => ({ url: 'https://cdn.test/new.png', publicId: 'products/new' })),
};
beforeEach(() => jest.clearAllMocks());

test('seller products stop at ten rows, next page exposes the remainder, search resets page', async () => {
  await render(<SellerProducts />);
  await screen.findByText('Máy tính 0');
  expect(screen.queryByText('Máy tính 10')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Trang sau' }));
  expect(screen.getByText('Máy tính 10')).toBeOnTheScreen();
  expect(screen.queryByText('Máy tính 0')).toBeNull();
  await fireEvent.changeText(screen.getByLabelText('Tìm sản phẩm của shop'), 'Máy tính 0');
  expect(screen.getByText('Máy tính 0')).toBeOnTheScreen();
});

test('editing preserves images unless a local photo is picked; save uses backend upload reference', async () => {
  const onClose = jest.fn();
  await render(<SellerProductForm product={products[0]} onClose={onClose} onSaved={async () => {}} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Lưu thay đổi' }));
  expect(mockStore.uploadSellerImage).not.toHaveBeenCalled();
  expect(mockStore.saveSellerProduct).toHaveBeenCalledWith(expect.not.objectContaining({ image: expect.anything() }), 'p0');
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file:///phone/photo.png', fileName: 'photo.png', mimeType: 'image/png', fileSize: 1024, width: 10, height: 10 }] });
  await fireEvent.press(screen.getByRole('button', { name: 'Chọn ảnh khác' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Lưu thay đổi' }));
  expect(mockStore.uploadSellerImage).toHaveBeenCalledWith({ uri: 'file:///phone/photo.png', name: 'photo.png', type: 'image/png' });
  expect(mockStore.saveSellerProduct).toHaveBeenLastCalledWith(expect.objectContaining({ image: { url: 'https://cdn.test/new.png', publicId: 'products/new' } }), 'p0');
});

test('seller cannot ship an unpaid VNPay order but can ship after verified payment', async () => {
  const order: Order = { _id: 'order1234', status: 'pending', orderStatus: 'pending', paymentMethod: 'vnpay', paymentStatus: 'unpaid', totalPrice: 200000, sellerTotal: 200000, createdAt: new Date().toISOString(), shippingAddress: { fullName: 'An', phoneNumber: '0901234567', city: 'HCM', streetAddress: '12 ABC' }, orderItems: [{ name: 'Máy tính', price: 200000, quantity: 1, sellerStatus: 'pending' }] };
  const advance = jest.fn();
  const view = await render(<OrderSummary order={order} seller onAdvance={advance} />);
  expect(screen.queryByRole('button', { name: 'Xác nhận gửi hàng' })).toBeNull();
  await view.rerender(<OrderSummary order={{ ...order, paymentStatus: 'paid' }} seller onAdvance={advance} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Xác nhận gửi hàng' }));
  expect(advance).toHaveBeenCalledWith('shipped');
});
