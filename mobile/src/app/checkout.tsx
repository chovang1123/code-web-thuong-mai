import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { SignInPrompt } from '../components/sign-in-prompt';
import { Button, Empty, ErrorCard, Field, FormScreen, ui } from '../components/ui';
import { ConnectionError, errorMessage } from '../lib/api';
import { cartTotal, money } from '../lib/format';
import { useShop } from '../state/shop';
import type { Order, ShippingAddress } from '../types';

export default function CheckoutScreen() {
  const { session, cart, cartLoaded, cartBusy, store } = useShop();
  const [address, setAddress] = useState<ShippingAddress>({
    fullName: session?.user.name ?? '', phoneNumber: session?.user.phone ?? '', streetAddress: '', city: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const submitting = useRef(false);
  const field = (name: keyof ShippingAddress) => (value: string) => setAddress((current) => ({ ...current, [name]: value }));

  async function submit() {
    if (submitting.current || uncertain) return;
    submitting.current = true;
    setBusy(true);
    setError('');
    try { setOrder(await store.checkout(address)); }
    catch (failure) {
      if (failure instanceof ConnectionError) {
        setUncertain(true);
        setError('Mất kết nối khi đặt hàng. Đơn có thể đã được tạo. Hãy kiểm tra danh sách đơn hàng trước khi thử đặt lại.');
      } else setError(errorMessage(failure));
    } finally { submitting.current = false; setBusy(false); }
  }

  if (!session) return <FormScreen><SignInPrompt /></FormScreen>;
  if (order) return <FormScreen><View style={ui.card}>
    <Text style={ui.label}>ĐẶT HÀNG THÀNH CÔNG</Text><Text style={ui.title}>Cảm ơn bạn, {session.user.name}!</Text>
    <Text selectable style={ui.text}>Mã đơn: {order._id}</Text><Text style={ui.price}>{money(order.totalPrice)}</Text>
    <Text style={ui.muted}>Đơn đã được lưu lên hệ thống và có thể xem trên website.</Text>
    <Button title="Xem đơn hàng" onPress={() => router.replace('/(tabs)/orders')} />
    <Button title="Tiếp tục mua sắm" variant="secondary" onPress={() => router.replace('/(tabs)')} />
  </View></FormScreen>;
  if (!cartLoaded || !cart.length) return <FormScreen><Empty title="Hãy kiểm tra giỏ hàng" message="Tải lại giỏ hàng trước khi đặt đơn."><Button title="Về giỏ hàng" onPress={() => router.replace('/(tabs)/cart')} /></Empty></FormScreen>;

  return <FormScreen>
    <Text style={ui.title}>Thông tin giao hàng</Text>
    <Text style={ui.muted}>Nhập địa chỉ nhận hàng cho đơn này. Dấu * là thông tin bắt buộc.</Text>
    <View style={ui.card}>
      <Field label="Họ và tên *" value={address.fullName} onChangeText={field('fullName')} editable={!busy} autoComplete="name" />
      <Field label="Số điện thoại *" value={address.phoneNumber} onChangeText={field('phoneNumber')} editable={!busy} keyboardType="phone-pad" autoComplete="tel" />
      <Field label="Địa chỉ nhận hàng *" value={address.streetAddress} onChangeText={field('streetAddress')} editable={!busy} placeholder="Số nhà, đường, phường/xã" multiline />
      <Field label="Tỉnh / Thành phố *" value={address.city} onChangeText={field('city')} editable={!busy} />
    </View>
    <View style={ui.card}>
      <Text style={ui.heading}>Đơn hàng</Text>
      {cart.map((item, index) => <View key={item.product?._id ?? index} style={ui.between}><Text style={[ui.text, { flex: 1 }]}>{item.product?.name ?? 'Sản phẩm không còn bán'} × {item.quantity}</Text><Text style={ui.text}>{money((item.product?.price ?? 0) * item.quantity)}</Text></View>)}
      <View style={ui.between}><Text style={ui.heading}>Tạm tính</Text><Text style={ui.price}>{money(cartTotal(cart))}</Text></View>
      <Text style={ui.muted}>Chưa thanh toán trực tuyến. Đơn được tạo theo quy trình hiện có của website; tổng tiền cuối cùng do máy chủ tính.</Text>
    </View>
    {error ? <ErrorCard message={error} /> : null}
    <Button title="Xác nhận đặt hàng" onPress={() => { void submit(); }} loading={busy} disabled={cartBusy || uncertain} />
    {uncertain ? <Button title="Kiểm tra đơn hàng" variant="secondary" onPress={() => router.replace('/(tabs)/orders')} /> : null}
  </FormScreen>;
}
