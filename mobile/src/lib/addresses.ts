import type { AddressInput, ShippingAddress, User } from '../types';
import { validateAddress } from './format';

export const emptyAddress = (user: User, useProfile = true): AddressInput => ({
  label: 'Nhà riêng', fullName: user.name, phoneNumber: user.phone || '',
  streetAddress: useProfile ? user.address || '' : '', city: '', state: '', zipCode: '', isDefault: true,
});
export const deliveryAddressText = (address: ShippingAddress) => [address.streetAddress, address.city, address.state, address.zipCode].filter(Boolean).join(', ');
export function deliveryAddressError(address: ShippingAddress | null): string | null {
  if (!address) return 'Lưu địa chỉ mặc định hoặc nhập địa chỉ khác cho đơn này';
  return validateAddress(address) || (!address.state?.trim() ? 'Vui lòng nhập tỉnh/thành phố' : null);
}
