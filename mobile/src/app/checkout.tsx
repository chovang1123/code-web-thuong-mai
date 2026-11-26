import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { SignInPrompt } from '../components/sign-in-prompt';
import { Button, Empty, ErrorCard, FormScreen, Loading, ui } from '../components/ui';
import { DeliveryAddress } from '../components/delivery-address';
import { ConnectionError, errorMessage } from '../lib/api';
import { cartTotal, money } from '../lib/format';
import { useShop } from '../state/shop';
import { OrderPayment } from '../components/order-payment';
import type { Order, PaymentMethod, ShippingAddress } from '../types';
import { openMobilePayment } from '../lib/payment';
import { deliveryAddressError } from '../lib/addresses';

export default function CheckoutScreen() {
  const { session } = useShop();
  return session ? <CheckoutForm key={session.token} /> : <FormScreen><SignInPrompt /></FormScreen>;
}

function CheckoutForm() {
  const { session, cart, cartLoaded, cartBusy, store } = useShop();
  const [address, setAddress] = useState<ShippingAddress | null>(null);
  const [channel, setChannel] = useState("VNBANK");
  const [method, setMethod] = useState<PaymentMethod>('cod');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const submitting = useRef(false);

  async function submit() {
    if (submitting.current || uncertain) return;
    const validation = deliveryAddressError(address);
    if (validation || !address) { setError(validation || 'Vui lòng chọn địa chỉ nhận hàng'); return; }
    submitting.current = true;
    setBusy(true);
    setError('');
    let created: Order | undefined;
    try {
      created = await store.checkout(address, method, cartTotal(cart), channel);
      setOrder(created);
      if (method === 'vnpay') await openMobilePayment(store, created._id);
    }
    catch (failure) {
      if (created) {
        setError('Đơn đã được lưu nhưng chưa mở được cổng thanh toán. Hãy thử mở thanh toán lại cho đơn này.');
      } else if (failure instanceof ConnectionError) {
        setUncertain(true);
        setError('Mất kết nối khi đặt hàng. Đơn có thể đã được tạo. Hãy kiểm tra danh sách đơn hàng trước khi thử đặt lại.');
      } else setError(errorMessage(failure));
    } finally { submitting.current = false; setBusy(false); }
  }

  if (!session) return <FormScreen><SignInPrompt /></FormScreen>;
  if (busy && method === 'vnpay') return <FormScreen><Loading text="Đang mở VNPay…" /></FormScreen>;
  if (order) return <FormScreen><View style={ui.card}>
    <Text style={ui.label}>{order.paymentMethod === 'vnpay' ? 'Thanh toán VNPay' : 'Đặt hàng thành công'}</Text><Text style={ui.title}>{order.paymentMethod === 'vnpay' ? 'Đơn đang chờ thanh toán' : 'Đã nhận đơn hàng của bạn'}</Text>
    <Text selectable style={ui.text}>Mã đơn: {order._id}</Text><Text style={ui.price}>{money(order.totalPrice)}</Text>
    <Text style={ui.muted}>{order.paymentMethod === 'vnpay' ? 'Hoàn tất thanh toán để xác nhận đơn hàng' : 'Bạn có thể theo dõi đơn hàng trên app và website'}</Text>
    {error ? <ErrorCard message={error} /> : null}
    <OrderPayment order={order} />
    <Button title="Xem đơn hàng" onPress={() => router.replace('/(tabs)/orders')} />
    <Button title="Tiếp tục mua sắm" variant="secondary" onPress={() => router.replace('/(tabs)')} />
  </View></FormScreen>;
  if (!cartLoaded || !cart.length) return <FormScreen><Empty title="Hãy kiểm tra giỏ hàng" message="Tải lại giỏ hàng trước khi đặt đơn."><Button title="Về giỏ hàng" onPress={() => router.replace('/(tabs)/cart')} /></Empty></FormScreen>;

  return <FormScreen>
    <Text style={ui.title}>Thông tin giao hàng</Text>
    <Text style={ui.muted}>Dùng địa chỉ đã lưu hoặc giao đến địa chỉ khác cho đơn này</Text>
    <DeliveryAddress checkout disabled={busy} onChange={setAddress} />
    <View style={ui.card}>
      <Text style={ui.heading}>Đơn hàng · {cart.length} sản phẩm</Text>
      {cart.slice(0, 5).map((item, index) => <View key={item.product?._id ?? index} style={ui.between}><Text style={[ui.text, { flex: 1 }]}>{item.product?.name ?? 'Sản phẩm không còn bán'} × {item.quantity}</Text><Text style={ui.text}>{money((item.product?.price ?? 0) * item.quantity)}</Text></View>)}
      {cart.length > 5 && <Text style={ui.muted}>Và {cart.length - 5} sản phẩm khác trong giỏ hàng</Text>}
      <View style={ui.between}><Text style={ui.heading}>Tạm tính</Text><Text style={ui.price}>{money(cartTotal(cart))}</Text></View>
      <Text style={ui.heading}>Phương thức thanh toán</Text>
      {(['cod', 'VNBANK', 'INTCARD'] as const).map(value =>
        <Button key={value} title={{ cod: 'Thanh toán khi nhận hàng', VNBANK: 'VNPay - Thẻ ATM nội địa', INTCARD: 'VNPay - Thẻ quốc tế' }[value]}
          variant={(method === 'cod' ? value === 'cod' : channel === value) ? 'primary' : 'secondary'} disabled={busy} onPress={() => { setMethod(value === "cod" ? "cod" : "vnpay"); setChannel(value); }} />)}
    </View>
    {error ? <ErrorCard message={error} /> : null}
    <Button title="Xác nhận đặt hàng" onPress={() => { void submit(); }} loading={busy} disabled={cartBusy || uncertain || !address} />
    {uncertain ? <Button title="Kiểm tra đơn hàng" variant="secondary" onPress={() => router.replace('/(tabs)/orders')} /> : null}
  </FormScreen>;
}
