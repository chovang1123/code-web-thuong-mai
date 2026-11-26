import type { CartItem, ShippingAddress } from '../types';

export const money = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)} ₫`;
export const dateTime = (value: string) => new Date(value).toLocaleString('vi-VN');

export const orderStatuses: Record<string, string> = {
  pending: 'Chờ xác nhận', shipped: 'Đã gửi hàng', shipping: 'Đang vận chuyển',
  delivering: 'Đang giao hàng', delivered: 'Đã giao hàng', completed: 'Hoàn thành',
  cancelled: 'Đã hủy', returning: 'Đang trả hàng',
};

export function cartTotal(items: CartItem[]) {
  return items.reduce((sum, item) => sum + (item.product?.price ?? 0) * item.quantity, 0);
}

export function validateAddress(address: ShippingAddress): string | null {
  if (!address.fullName.trim() || !address.streetAddress.trim() || !address.city.trim()) {
    return 'Vui lòng nhập đủ họ tên, địa chỉ và tỉnh/thành phố.';
  }
  if (!/^(?:\+84|0)[0-9]{9,10}$/.test(address.phoneNumber.replace(/[\s.-]/g, ''))) {
    return 'Vui lòng nhập số điện thoại Việt Nam hợp lệ.';
  }
  return null;
}
